#!/usr/bin/python3 -I
"""Plan, or --apply, reversible Somang release renames. Never copy/delete releases."""

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import urllib.request
import uuid


STAMP = re.compile(r'[0-9]{8}_[0-9]{6}\Z')
KEEP = 5


class Blocked(Exception):
    pass


@dataclass(frozen=True)
class Layout:
    releases: Path = Path('/var/www/somang-memorial/releases')
    current: Path = Path('/var/www/somang-memorial/current')
    transient: Path = Path('/var/www/somang-memorial/current.tmp')
    archive: Path = Path('/root/somang-release-archive')
    dumps: tuple = (Path('/root/.pm2/dump.pm2'), Path('/root/.pm2/dump.pm2.bak'))


@dataclass
class State:
    current: Path
    references: dict
    fingerprint: str


@dataclass
class Plan:
    layout: Layout
    state: State
    inventory: dict
    protected: dict
    candidates: list
    dist_hash: str

    def summary(self):
        return {'keepNewest': KEEP, 'protected': self.protected, 'candidates': self.candidates,
                'operation': 'same-filesystem rename; no release deletion or disk-space recovery'}


def open_trusted_directory(path):
    descriptor = os.open('/', os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in path.parts[1:]:
            following = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = following
            value = os.fstat(descriptor)
            if value.st_uid != 0 or value.st_mode & 0o022:
                raise Blocked('Fixed parent directories must be root-owned and not group/other-writable.')
        return descriptor
    except BaseException:
        os.close(descriptor)
        raise


def inventory(descriptor):
    result = {}
    for name in sorted(os.listdir(descriptor)):
        if not STAMP.fullmatch(name):
            continue
        value = os.stat(name, dir_fd=descriptor, follow_symlinks=False)
        if not stat.S_ISDIR(value.st_mode) or value.st_dev != os.fstat(descriptor).st_dev:
            raise Blocked('Timestamp entries must be real direct directories on the releases filesystem.')
        result[name] = (value.st_dev, value.st_ino)
    return result


def release_name(value, layout):
    if not isinstance(value, str) or not value.startswith('/'):
        return None
    # /proc reports a suffix for an unlinked cwd. Keep its original release protected.
    value = value.removesuffix(' (deleted)')
    try:
        resolved = Path(value).resolve(strict=False)
    except (OSError, RuntimeError) as error:
        raise Blocked('A runtime reference could not be resolved safely.') from error
    for root in (layout.releases, layout.archive):
        try:
            relative = resolved.relative_to(root)
        except ValueError:
            continue
        if relative.parts and STAMP.fullmatch(relative.parts[0]):
            return relative.parts[0]
    return None


def configured_paths(entry):
    if not isinstance(entry, dict):
        raise Blocked('PM2 metadata must contain objects.')
    data = entry.get('pm2_env', entry)
    if not isinstance(data, dict):
        raise Blocked('PM2 runtime metadata is invalid.')
    cwd = data.get('pm_cwd', data.get('cwd'))
    script = data.get('pm_exec_path', data.get('script'))
    paths = [value for value in (cwd, script) if isinstance(value, str)]
    if isinstance(cwd, str) and isinstance(script, str) and not script.startswith('/'):
        paths.append(str(Path(cwd) / script))
    return paths


def read_pm2():
    result = subprocess.run(
        ['/usr/bin/node', '/usr/lib/node_modules/pm2/bin/pm2', 'jlist'],
        cwd='/root', env={'HOME': '/root', 'PATH': '/usr/bin:/bin', 'PM2_HOME': '/root/.pm2'},
        capture_output=True, text=True, timeout=20, check=False)
    if result.returncode:
        raise Blocked('The existing PM2 manager could not be inspected.')
    try:
        data = json.loads(result.stdout)
    except ValueError as error:
        raise Blocked('PM2 returned invalid JSON.') from error
    if not isinstance(data, list):
        raise Blocked('PM2 did not return an application list.')
    return data


def process_cwds():
    values = []
    for entry in Path('/proc').iterdir():
        if not entry.name.isdigit():
            continue
        try:
            values.append(os.readlink(entry / 'cwd'))
        except (FileNotFoundError, ProcessLookupError):
            continue
        except OSError as error:
            raise Blocked('A process working directory could not be inspected.') from error
    return values


def read_dump(path):
    if not os.path.lexists(path):
        return [], 'missing'
    parent = open_trusted_directory(path.parent)
    try:
        descriptor = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
    finally:
        os.close(parent)
    with os.fdopen(descriptor, 'rb') as stream:
        value = os.fstat(stream.fileno())
        if not stat.S_ISREG(value.st_mode) or value.st_uid != 0 or value.st_mode & 0o022:
            raise Blocked('PM2 saved metadata must be a trusted regular file.')
        contents = stream.read()
    try:
        data = json.loads(contents)
    except ValueError as error:
        raise Blocked('Saved PM2 metadata is invalid; preserve all releases until it is checked.') from error
    if not isinstance(data, list):
        raise Blocked('Saved PM2 metadata is not an application list.')
    return data, hashlib.sha256(contents).hexdigest()


def read_state(layout):
    if os.path.lexists(layout.transient):
        raise Blocked('current.tmp exists; a deployment may be in progress.')
    current_stat = layout.current.lstat()
    if not stat.S_ISLNK(current_stat.st_mode):
        raise Blocked('current must remain the existing release symlink.')
    current = layout.current.resolve(strict=True)
    if current.parent != layout.releases or not STAMP.fullmatch(current.name):
        raise Blocked('current does not resolve to a direct Somang release.')
    references = {}

    def remember(value, reason):
        name = release_name(value, layout)
        if name:
            references.setdefault(name, set()).add(reason)

    remember(str(current), 'current')
    applications = read_pm2()
    identities = []
    somang = []
    for app in applications:
        paths = configured_paths(app)
        data = app.get('pm2_env', app)
        name, pid = app.get('name', data.get('name')), app.get('pid') or 0
        if not isinstance(name, str) or type(pid) is not int or pid < 0:
            raise Blocked('PM2 application identity is invalid.')
        identities.append((name, pid, data.get('status'), tuple(paths)))
        if name == 'somang-memorial':
            somang.append((pid, data.get('status')))
        for value in paths:
            remember(value, 'pm2')
    if len(somang) != 1 or somang[0][0] <= 0 or somang[0][1] != 'online':
        raise Blocked('The expected Somang process is not online.')
    for value in process_cwds():
        remember(value, 'process-cwd')
    dump_hashes = []
    for path in layout.dumps:
        entries, digest = read_dump(path)
        dump_hashes.append(digest)
        for entry in entries:
            for value in configured_paths(entry):
                remember(value, path.name)
    references = {key: sorted(value) for key, value in sorted(references.items())}
    fingerprint = hashlib.sha256(json.dumps(
        [str(current), current_stat.st_ino, current_stat.st_mtime_ns,
         sorted(identities), dump_hashes, references], sort_keys=True).encode()).hexdigest()
    return State(current, references, fingerprint)


def protected_names(names, state):
    protected = {name: list(reasons) for name, reasons in state.references.items()}
    for name in sorted(names, reverse=True)[:KEEP]:
        protected.setdefault(name, []).append('newest-five')
    return {name: sorted(set(reasons)) for name, reasons in sorted(protected.items())}


def dist_fingerprint(current):
    root = current / 'dist'
    if root.is_symlink() or not root.is_dir():
        raise Blocked('The active distribution directory could not be verified.')
    digest = hashlib.sha256()
    for directory, directories, files in os.walk(root, followlinks=False):
        directories.sort()
        for name in directories:
            if Path(directory, name).is_symlink():
                raise Blocked('Unexpected links exist in the active distribution directory.')
        for name in sorted(files):
            path = Path(directory, name)
            value = path.lstat()
            if not stat.S_ISREG(value.st_mode):
                raise Blocked('Unexpected file types exist in the active distribution directory.')
            digest.update(str(path.relative_to(root)).encode() + b'\0')
            with path.open('rb') as stream:
                file_digest = hashlib.sha256()
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    file_digest.update(chunk)
                digest.update(file_digest.digest())
    return digest.hexdigest()


def health_check():
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *_args, **_kwargs):
            return None
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    for route, expected in (('healthz', 'ok'), ('readyz', 'ready')):
        try:
            with opener.open('http://127.0.0.1:3050/' + route, timeout=5) as response:
                data = json.loads(response.read(4096))
                if response.status != 200 or data.get('status') != expected:
                    raise ValueError('unhealthy')
                if route == 'readyz' and data.get('database') != 'ok':
                    raise ValueError('database unavailable')
        except Exception as error:
            raise Blocked('Somang health/readiness checks failed; release archiving is blocked.') from error


def archive_descriptor(layout, create=False):
    parent = open_trusted_directory(layout.archive.parent)
    try:
        if create:
            try:
                os.mkdir(layout.archive.name, mode=0o700, dir_fd=parent)
            except FileExistsError:
                pass
        descriptor = os.open(layout.archive.name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
    finally:
        os.close(parent)
    value = os.fstat(descriptor)
    if value.st_uid != 0 or stat.S_IMODE(value.st_mode) != 0o700:
        os.close(descriptor)
        raise Blocked('The fixed archive must be root-owned with mode 0700.')
    return descriptor


def build_plan(layout, state_reader=read_state, check_health=health_check):
    source = open_trusted_directory(layout.releases)
    target = None
    try:
        entries = inventory(source)
        state = state_reader(layout)
        if state.current.name not in entries:
            raise Blocked('The active release is missing from the verified inventory.')
        protected = protected_names(entries, state)
        candidates = sorted(set(entries) - protected.keys())
        if os.path.lexists(layout.archive):
            target = archive_descriptor(layout)
            target_device = os.fstat(target).st_dev
            for name in candidates:
                try:
                    os.stat(name, dir_fd=target, follow_symlinks=False)
                except FileNotFoundError:
                    continue
                raise Blocked('An archive destination already exists; nothing will be overwritten.')
        else:
            parent = open_trusted_directory(layout.archive.parent)
            try:
                target_device = os.fstat(parent).st_dev
            finally:
                os.close(parent)
        if target_device != os.fstat(source).st_dev:
            raise Blocked('Release and archive directories must be on the same filesystem.')
        check_health()
        return Plan(layout, state, entries, protected, candidates, dist_fingerprint(state.current))
    finally:
        if target is not None:
            os.close(target)
        os.close(source)


def append_event(descriptor, value):
    data = (json.dumps(value, sort_keys=True) + '\n').encode()
    while data:
        written = os.write(descriptor, data)
        if written <= 0:
            raise Blocked('The private archive manifest could not be recorded.')
        data = data[written:]
    os.fsync(descriptor)


def apply_plan(plan, state_reader=read_state, check_health=health_check):
    import fcntl
    source = open_trusted_directory(plan.layout.releases)
    target = archive_descriptor(plan.layout, create=True)
    lock = manifest = None
    moved = []
    try:
        if os.fstat(source).st_dev != os.fstat(target).st_dev:
            raise Blocked('A cross-filesystem move is not allowed.')
        lock = os.open('.archive.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600, dir_fd=target)
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        check_health()
        manifest_name = 'manifest-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ-') + uuid.uuid4().hex + '.jsonl'
        manifest = os.open(manifest_name, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600, dir_fd=target)
        append_event(manifest, {'event': 'plan', **plan.summary(), 'entries': [
            {'name': name, 'originalPath': str(plan.layout.releases / name),
             'archivePath': str(plan.layout.archive / name), 'identity': plan.inventory[name],
             'reason': 'outside newest five and all observed execution/recovery references'}
            for name in plan.candidates]})
        for name in plan.candidates:
            fresh = state_reader(plan.layout)
            current_entries = inventory(source)
            if fresh.fingerprint != plan.state.fingerprint:
                raise Blocked('Application identity, current or recovery references changed during archiving.')
            protected = protected_names(current_entries, fresh)
            if name in protected or set(moved) & protected.keys():
                raise Blocked('A candidate is now referenced; restore this run before continuing.')
            if current_entries.get(name) != plan.inventory[name]:
                raise Blocked('A planned release directory changed before its rename.')
            try:
                os.stat(name, dir_fd=target, follow_symlinks=False)
            except FileNotFoundError:
                pass
            else:
                raise Blocked('An archive destination appeared; nothing will be overwritten.')
            append_event(manifest, {'event': 'rename-intent', 'name': name})
            os.rename(name, name, src_dir_fd=source, dst_dir_fd=target)
            moved.append(name)
            append_event(manifest, {'event': 'renamed', 'name': name})
        fresh = state_reader(plan.layout)
        if fresh.fingerprint != plan.state.fingerprint or set(moved) & fresh.references.keys():
            raise Blocked('Execution/recovery references changed after a rename.')
        check_health()
        if dist_fingerprint(plan.state.current) != plan.dist_hash:
            raise Blocked('The active distribution changed during archiving.')
        append_event(manifest, {'event': 'complete', 'moved': moved})
        return {'moved': moved, 'manifest': str(plan.layout.archive / manifest_name)}
    except BaseException:
        failed = []
        for name in reversed(moved):
            try:
                try:
                    os.stat(name, dir_fd=source, follow_symlinks=False)
                except FileNotFoundError:
                    pass
                else:
                    raise Blocked('The original location is occupied; do not overwrite it.')
                value = os.stat(name, dir_fd=target, follow_symlinks=False)
                if (value.st_dev, value.st_ino) != plan.inventory[name]:
                    raise Blocked('The archived directory identity changed; do not restore an unknown directory.')
                os.rename(name, name, src_dir_fd=target, dst_dir_fd=source)
            except (Blocked, OSError):
                failed.append(name)
        if manifest is not None:
            try:
                recovery_health = 'ok'
                try:
                    check_health()
                except (Blocked, OSError):
                    recovery_health = 'failed'
                append_event(manifest, {'event': 'rollback-failed' if failed else 'rolled-back',
                                        'movedBeforeFailure': moved, 'manualRecoveryRequired': failed,
                                        'recoveryHealth': recovery_health})
            except (Blocked, OSError):
                pass
        if failed:
            raise Blocked('Rollback is incomplete; inspect the root-only manifest before any further action.')
        raise
    finally:
        for descriptor in (manifest, lock, target, source):
            if descriptor is not None:
                os.close(descriptor)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    arguments = parser.parse_args(argv)
    if sys.platform != 'linux' or os.geteuid() != 0:
        raise Blocked('Only the Linux root deployment operator may run this fixed-scope helper.')
    plan = build_plan(Layout())
    print(json.dumps(apply_plan(plan) if arguments.apply else plan.summary(), sort_keys=True))


if __name__ == '__main__':
    try:
        main()
    except (Blocked, OSError, subprocess.SubprocessError) as error:
        reason = str(error) if isinstance(error, Blocked) else type(error).__name__
        print('[somang-archive] blocked: ' + reason, file=sys.stderr)
        sys.exit(1)
