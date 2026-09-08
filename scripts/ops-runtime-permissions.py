#!/usr/bin/python3 -I
"""Prepare only a Somang release and its upload directories. Default: check only.

Install a reviewed, root-owned copy outside the app. No environment files are
loaded, and no symlink target is chmod/chowned. The installed upload mount
guard must succeed before any permission plan is built or applied.
"""

import argparse
from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import uuid


RELEASES_ROOT = Path('/var/www/somang-memorial/releases')
UPLOADS_ROOT = Path('/var/www/somang-memorial/uploads')
ACCOUNT = 'somangapp'
ACCOUNT_HOME = '/var/lib/somangapp'
EXCLUDED_ROOT_NAMES = frozenset({'.git', 'backups', 'archive', 'archives', 'releases'})
RELEASE_NAME = re.compile(r'[0-9]{8}_[0-9]{6}\Z')


class Blocked(Exception):
    pass


@dataclass(frozen=True)
class Entry:
    relative: tuple
    snapshot: object
    mode: int
    gid: int
    symlink_target: str = ''


@dataclass
class Plan:
    release: Path
    uploads: Path
    release_entries: list
    upload_entries: list

    def summary(self):
        files = [entry for entry in self.release_entries if stat.S_ISREG(entry.snapshot.st_mode)]
        linked = [entry for entry in files if entry.snapshot.st_nlink > 1]
        return {
            'release': self.release.name,
            'releaseFiles': len(files),
            'releaseDirectories': sum(stat.S_ISDIR(entry.snapshot.st_mode) for entry in self.release_entries),
            'internalSymlinks': sum(stat.S_ISLNK(entry.snapshot.st_mode) for entry in self.release_entries),
            'hardlinkFilesToDetach': len(linked),
            'hardlinkBytesToCopy': sum(entry.snapshot.st_size for entry in linked),
            'uploadDirectories': sum(stat.S_ISDIR(entry.snapshot.st_mode) for entry in self.upload_entries),
        }


def resolve_identity(user_lookup=None, group_lookup=None, effective_uid=None):
    if effective_uid is None:
        effective_uid = os.geteuid()
    if effective_uid != 0:
        raise Blocked('Run only through the root deployment operator.')
    if user_lookup is None or group_lookup is None:
        import pwd
        import grp
        user_lookup, group_lookup = pwd.getpwnam, grp.getgrnam
    try:
        user, group = user_lookup(ACCOUNT), group_lookup(ACCOUNT)
    except KeyError as error:
        raise Blocked('The dedicated runtime account/group is missing.') from error
    if (user.pw_name != ACCOUNT or group.gr_name != ACCOUNT or
            user.pw_uid <= 0 or group.gr_gid <= 0 or user.pw_gid != group.gr_gid or
            user.pw_dir != ACCOUNT_HOME or
            user.pw_shell not in ('/usr/sbin/nologin', '/sbin/nologin', '/bin/false')):
        raise Blocked('somangapp must be a non-root, no-login account with its dedicated group and home.')
    return user.pw_uid, group.gr_gid


def validate_release_path(release, releases_root=RELEASES_ROOT):
    release = Path(release)
    if not release.is_absolute() or release.parent != releases_root or not RELEASE_NAME.fullmatch(release.name):
        raise Blocked('Only a direct YYYYMMDD_HHMMSS directory under the fixed releases root is allowed.')
    return release


def file_permissions(name, original_mode, runtime_gid):
    if name.startswith(('.env.', '.env-')):
        return 0o600, 0
    if name == '.env':
        return 0o640, runtime_gid
    return (0o750 if original_mode & 0o111 else 0o640), runtime_gid


def require_trusted(snapshot, directory=False):
    if snapshot.st_uid != 0 or snapshot.st_mode & 0o022:
        raise Blocked('Release paths and their parents must be root-owned and not group/other-writable.')
    if directory and not stat.S_ISDIR(snapshot.st_mode):
        raise Blocked('A trusted directory was replaced by another file type.')


def open_absolute_directory(path, writable_final=False):
    """Never follow a symlink in any absolute path component."""
    descriptor = os.open('/', os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        require_trusted(os.fstat(descriptor), directory=True)
        for index, part in enumerate(path.parts[1:]):
            next_descriptor = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = next_descriptor
            snapshot = os.fstat(descriptor)
            is_final = index == len(path.parts[1:]) - 1
            if writable_final and is_final:
                if snapshot.st_uid != 0:
                    raise Blocked('The fixed upload root must remain root-owned.')
            else:
                require_trusted(snapshot, directory=True)
        return descriptor
    except BaseException:
        os.close(descriptor)
        raise


def same_entry(actual, expected):
    # Removing one hardlink changes ctime/nlink on its other names. Neither
    # value identifies a content change, so compare bytes' size/mtime instead.
    common = ('st_dev', 'st_ino', 'st_uid', 'st_gid', 'st_mode')
    if any(getattr(actual, key) != getattr(expected, key) for key in common):
        return False
    if stat.S_ISREG(expected.st_mode):
        return actual.st_size == expected.st_size and actual.st_mtime_ns == expected.st_mtime_ns
    return True


def require_unchanged(actual, expected):
    if not same_entry(actual, expected):
        raise Blocked('A planned path changed during preparation; stop before activating the release.')


def open_relative(root_descriptor, relative, directory=False):
    descriptor = os.dup(root_descriptor)
    try:
        for index, part in enumerate(relative):
            if part in ('', '.', '..') or '/' in part:
                raise Blocked('An unsafe relative path was rejected.')
            final = index == len(relative) - 1
            flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
            if directory or not final:
                flags |= os.O_DIRECTORY
            next_descriptor = os.open(part, flags, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = next_descriptor
        return descriptor
    except BaseException:
        os.close(descriptor)
        raise


def scan_tree(root, root_descriptor, runtime_gid, uploads=False):
    entries = []

    def visit(descriptor, relative):
        snapshot = os.fstat(descriptor)
        if not uploads:
            require_trusted(snapshot, directory=True)
        entries.append(Entry(relative, snapshot, 0o2775 if uploads else 0o750, runtime_gid))
        for name in sorted(os.listdir(descriptor)):
            child = relative + (name,)
            if not uploads and (name == '.git' or not relative and name in EXCLUDED_ROOT_NAMES):
                continue
            if not uploads and name.startswith('.somang-permissions-'):
                raise Blocked('A prior preparation left a private staging file; inspect it before retrying.')
            current = os.stat(name, dir_fd=descriptor, follow_symlinks=False)
            if stat.S_ISLNK(current.st_mode):
                if uploads or child[0] != 'node_modules':
                    raise Blocked('Only internal node_modules symlinks are allowed; uploads may not contain symlinks.')
                try:
                    resolved = root.joinpath(*child).resolve(strict=True)
                    target = resolved.relative_to(root / 'node_modules')
                except (OSError, RuntimeError, ValueError) as error:
                    raise Blocked('A broken, looping or external dependency symlink was rejected.') from error
                if not target.parts:
                    raise Blocked('A dependency symlink to the entire node_modules root was rejected.')
                entries.append(Entry(child, current, 0, 0, str(resolved)))
            elif stat.S_ISDIR(current.st_mode):
                child_descriptor = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=descriptor)
                try:
                    require_unchanged(os.fstat(child_descriptor), current)
                    visit(child_descriptor, child)
                finally:
                    os.close(child_descriptor)
            elif stat.S_ISREG(current.st_mode):
                if not uploads:
                    require_trusted(current)
                mode, gid = file_permissions(name, current.st_mode, runtime_gid)
                entries.append(Entry(child, current, mode, gid))
            else:
                raise Blocked('A special file was rejected during the full tree check.')

    visit(root_descriptor, ())
    actual_paths = {root.joinpath(*entry.relative) for entry in entries if not entry.symlink_target}
    if any(Path(entry.symlink_target) not in actual_paths for entry in entries if entry.symlink_target):
        raise Blocked('A dependency symlink does not resolve to a checked release entry.')
    return entries


def build_plan(release, runtime_gid, releases_root=RELEASES_ROOT, uploads_root=UPLOADS_ROOT):
    release = validate_release_path(release, releases_root)
    release_descriptor = open_absolute_directory(release)
    try:
        release_entries = scan_tree(release, release_descriptor, runtime_gid)
    finally:
        os.close(release_descriptor)
    kinds = {entry.relative: entry.snapshot.st_mode for entry in release_entries}
    for relative, predicate in (
            (('.env',), stat.S_ISREG), (('dist', 'index.js'), stat.S_ISREG),
            (('dist', 'public'), stat.S_ISDIR), (('node_modules',), stat.S_ISDIR)):
        if not predicate(kinds.get(relative, 0)):
            raise Blocked('The prepared release is missing a required runtime file or directory.')
    uploads_descriptor = open_absolute_directory(uploads_root, writable_final=True)
    try:
        upload_entries = scan_tree(uploads_root, uploads_descriptor, runtime_gid, uploads=True)
    finally:
        os.close(uploads_descriptor)
    return Plan(release, uploads_root, release_entries, upload_entries)


def digest_descriptor(descriptor):
    os.lseek(descriptor, 0, os.SEEK_SET)
    digest = hashlib.sha256()
    while True:
        chunk = os.read(descriptor, 1024 * 1024)
        if not chunk:
            return digest.digest()
        digest.update(chunk)


def detach_hardlink(source_descriptor, parent_descriptor, name, expected):
    """Replace this release's name only; never chmod the shared source inode."""
    temporary = '.somang-permissions-' + uuid.uuid4().hex
    target_descriptor = os.open(temporary, os.O_CREAT | os.O_EXCL | os.O_RDWR | os.O_NOFOLLOW,
                                0o600, dir_fd=parent_descriptor)
    replaced = False
    try:
        os.lseek(source_descriptor, 0, os.SEEK_SET)
        copied_hash = hashlib.sha256()
        while True:
            chunk = os.read(source_descriptor, 1024 * 1024)
            if not chunk:
                break
            copied_hash.update(chunk)
            pending = memoryview(chunk)
            while pending:
                written = os.write(target_descriptor, pending)
                if written <= 0:
                    raise Blocked('The independent file copy could not be completed.')
                pending = pending[written:]
        os.fsync(target_descriptor)
        require_unchanged(os.fstat(source_descriptor), expected)
        if (digest_descriptor(source_descriptor) != copied_hash.digest() or
                digest_descriptor(target_descriptor) != copied_hash.digest()):
            raise Blocked('The independent copy failed its content hash comparison.')
        require_unchanged(os.stat(name, dir_fd=parent_descriptor, follow_symlinks=False), expected)
        os.utime(target_descriptor, ns=(expected.st_atime_ns, expected.st_mtime_ns))
        os.replace(temporary, name, src_dir_fd=parent_descriptor, dst_dir_fd=parent_descriptor)
        replaced = True
        os.fsync(parent_descriptor)
        return target_descriptor
    except BaseException:
        os.close(target_descriptor)
        raise
    finally:
        if not replaced:
            os.unlink(temporary, dir_fd=parent_descriptor)


def set_permissions(descriptor, owner, gid, mode):
    snapshot = os.fstat(descriptor)
    if snapshot.st_uid != owner or snapshot.st_gid != gid:
        os.fchown(descriptor, owner, gid)
    if stat.S_IMODE(os.fstat(descriptor).st_mode) != mode:
        os.fchmod(descriptor, mode)


def apply_plan(plan):
    release_descriptor = open_absolute_directory(plan.release)
    uploads_descriptor = open_absolute_directory(plan.uploads, writable_final=True)
    try:
        # Repeat the complete scan before the first change, including newly
        # added names. Deploy/build/upload writes must not run concurrently.
        for root, root_descriptor, entries, uploads in (
                (plan.release, release_descriptor, plan.release_entries, False),
                (plan.uploads, uploads_descriptor, plan.upload_entries, True)):
            expected = {entry.relative: entry for entry in entries}
            actual = {entry.relative: entry for entry in
                      scan_tree(root, root_descriptor, entries[0].gid, uploads=uploads)}
            if actual.keys() != expected.keys():
                raise Blocked('The tree changed after its full check; retry before activating the release.')
            for relative, entry in expected.items():
                require_unchanged(actual[relative].snapshot, entry.snapshot)
                if actual[relative].symlink_target != entry.symlink_target:
                    raise Blocked('A dependency symlink changed after its full check.')

        for entry in plan.release_entries:
            if not stat.S_ISREG(entry.snapshot.st_mode):
                continue
            parent = open_relative(release_descriptor, entry.relative[:-1], directory=True)
            descriptor = os.open(entry.relative[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
            try:
                require_unchanged(os.fstat(descriptor), entry.snapshot)
                if os.fstat(descriptor).st_nlink > 1:
                    independent = detach_hardlink(descriptor, parent, entry.relative[-1], entry.snapshot)
                    os.close(descriptor)
                    descriptor = independent
                set_permissions(descriptor, 0, entry.gid, entry.mode)
            finally:
                os.close(descriptor)
                os.close(parent)

        # Open the release root to the runtime group only after its files are ready.
        for root_descriptor, entries, uploads in ((release_descriptor, plan.release_entries, False),
                                                  (uploads_descriptor, plan.upload_entries, True)):
            directories = [entry for entry in entries if stat.S_ISDIR(entry.snapshot.st_mode)]
            for entry in sorted(directories, key=lambda value: len(value.relative), reverse=True):
                descriptor = open_relative(root_descriptor, entry.relative, directory=True)
                try:
                    require_unchanged(os.fstat(descriptor), entry.snapshot)
                    owner = entry.snapshot.st_uid if uploads and entry.relative else 0
                    set_permissions(descriptor, owner, entry.gid, entry.mode)
                finally:
                    os.close(descriptor)
    finally:
        os.close(uploads_descriptor)
        os.close(release_descriptor)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release', required=True)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--apply', action='store_true')
    mode.add_argument('--check', action='store_true')
    arguments = parser.parse_args(argv)
    if sys.platform != 'linux':
        raise Blocked('This helper requires Linux directory-descriptor filesystem operations.')
    result = subprocess.run(
        ['/usr/bin/python3', '-I', '/usr/local/lib/dadowoom-storage/upload-mount-guard.py', 'somang-memorial'],
        env={'PATH': '/usr/bin:/bin'}, stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10, check=False,
    )
    if result.returncode != 0:
        raise Blocked('Expected additional-disk upload mount is required before permission changes.')
    _, runtime_gid = resolve_identity()
    plan = build_plan(Path(arguments.release), runtime_gid)
    if arguments.apply:
        apply_plan(plan)
    print(json.dumps({'mode': 'applied' if arguments.apply else 'check', **plan.summary()}))


if __name__ == '__main__':
    try:
        main()
    except (Blocked, OSError) as error:
        # Do not print filenames, file contents, environment values or OS errors
        # containing member-upload names. Only a safe reason/type is displayed.
        reason = str(error) if isinstance(error, Blocked) else type(error).__name__
        print('[somang-permissions] blocked: ' + reason, file=sys.stderr)
        sys.exit(1)
