"""Pure checks run everywhere; filesystem integration requires Linux root.

CI: sudo -n python3 -I -B scripts/ops-runtime-permissions.test.py
Integration uses one disposable /root/somang-permissions-test-* directory only.
It never touches a real release, upload directory, PM2 process or account.
"""

import importlib.util
import os
from pathlib import Path
import stat
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest import mock


source = Path(__file__).with_name('ops-runtime-permissions.py')
spec = importlib.util.spec_from_file_location('somang_permissions', source)
helper = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = helper
spec.loader.exec_module(helper)


class BoundaryTests(unittest.TestCase):
    def identity(self, **changes):
        values = {'pw_name': 'somangapp', 'pw_uid': 1007, 'pw_gid': 1007,
                  'pw_dir': '/var/lib/somangapp', 'pw_shell': '/usr/sbin/nologin'}
        values.update(changes)
        return SimpleNamespace(**values)

    def test_accepts_resolved_non_root_identity_without_fixed_numeric_id(self):
        result = helper.resolve_identity(lambda _: self.identity(pw_uid=1018, pw_gid=1020),
                                         lambda _: SimpleNamespace(gr_name='somangapp', gr_gid=1020), 0)
        self.assertEqual(result, (1018, 1020))

    def test_identity_failures_block(self):
        cases = ({'pw_uid': 0}, {'pw_gid': 0}, {'pw_name': 'another-app'},
                 {'pw_gid': 1010}, {'pw_dir': '/root'}, {'pw_shell': '/bin/bash'})
        for changes in cases:
            with self.subTest(changes=changes), self.assertRaises(helper.Blocked):
                helper.resolve_identity(lambda _: self.identity(**changes),
                                        lambda _: SimpleNamespace(gr_name='somangapp', gr_gid=1007), 0)
        for group in (SimpleNamespace(gr_name='root', gr_gid=1007),
                      SimpleNamespace(gr_name='somangapp', gr_gid=0)):
            with self.subTest(group=group), self.assertRaises(helper.Blocked):
                helper.resolve_identity(lambda _: self.identity(), lambda _: group, 0)

    def test_non_root_operator_and_missing_account_block(self):
        with self.assertRaises(helper.Blocked):
            helper.resolve_identity(effective_uid=1007)
        def missing(_):
            raise KeyError('missing')
        with self.assertRaises(helper.Blocked):
            helper.resolve_identity(missing, missing, 0)

    def test_release_must_be_one_direct_timestamp_directory(self):
        root = Path('/var/www/somang-memorial/releases').absolute()
        self.assertEqual(helper.validate_release_path(root / '20260907_160101', root),
                         root / '20260907_160101')
        for path in (root.parent / 'current', root, root / '20260907_160101' / 'dist',
                     root / '..' / 'uploads', root / 'latest', root / '20260907_160101-extra',
                     root.parent / 'other-service' / '20260907_160101', Path('20260907_160101')):
            with self.subTest(path=path), self.assertRaises(helper.Blocked):
                helper.validate_release_path(path, root)

    def test_private_env_files_and_executables_have_distinct_permissions(self):
        for name, source_mode, expected in (
                ('.env', 0o777, (0o640, 1007)),
                ('.env.backup', 0o777, (0o600, 0)),
                ('.env-previous', 0o777, (0o600, 0)),
                ('.env.local', 0o600, (0o600, 0)),
                ('server.js', 0o644, (0o640, 1007)),
                ('native-tool', 0o4755, (0o750, 1007))):
            with self.subTest(name=name):
                self.assertEqual(helper.file_permissions(name, source_mode, 1007), expected)

    def test_untrusted_owner_or_writable_release_blocks(self):
        helper.require_trusted(SimpleNamespace(st_uid=0, st_mode=stat.S_IFDIR | 0o750), directory=True)
        for uid, mode in ((1007, 0o700), (0, 0o775), (0, 0o707)):
            with self.subTest(uid=uid, mode=mode), self.assertRaises(helper.Blocked):
                helper.require_trusted(SimpleNamespace(st_uid=uid, st_mode=stat.S_IFDIR | mode), directory=True)


@unittest.skipUnless(sys.platform == 'linux' and getattr(os, 'geteuid', lambda: -1)() == 0,
                     'Linux root is required for the isolated ownership/hardlink integration checks.')
class FilesystemTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='somang-permissions-test-', dir='/root')
        self.base = Path(self.temporary.name) / 'somang'
        self.releases = self.base / 'releases'
        self.release = self.releases / '20260907_160101'
        self.uploads = self.base / 'uploads'
        self.store = Path(self.temporary.name) / 'store'
        for path in (self.release / 'dist/public', self.release / 'node_modules', self.uploads, self.store):
            path.mkdir(parents=True, mode=0o700)
        for path in (self.base, self.releases, self.release, self.release / 'dist'):
            path.chmod(0o700)
        self.write(self.release / '.env', b'private-fixture-value')
        self.write(self.release / 'dist/index.js', b'export {};')
        self.runtime_gid = 65534

    def tearDown(self):
        self.temporary.cleanup()

    def write(self, path, content=b'fixture', mode=0o600):
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        path.write_bytes(content)
        path.chmod(mode)
        return path

    def plan(self):
        return helper.build_plan(self.release, self.runtime_gid,
                                 releases_root=self.releases, uploads_root=self.uploads)

    def metadata(self, path):
        result = path.stat()
        return result.st_uid, result.st_gid, stat.S_IMODE(result.st_mode), result.st_ino

    def test_check_is_read_only_and_new_release_need_not_be_current(self):
        before = self.metadata(self.release), self.metadata(self.release / '.env')
        self.base.joinpath('current').symlink_to(self.releases / '20260906_120000', target_is_directory=True)
        plan = self.plan()
        self.assertEqual(plan.summary()['releaseFiles'], 2)
        self.assertEqual((self.metadata(self.release), self.metadata(self.release / '.env')), before)

    def test_applies_modes_preserves_upload_files_and_is_repeatable(self):
        executable = self.write(self.release / 'node_modules/tool', mode=0o755)
        private = self.write(self.release / '.env.previous', mode=0o640)
        private_dash = self.write(self.release / '.env-previous', mode=0o640)
        photo = self.write(self.uploads / 'gallery/1/photo.jpg', b'unchanged-photo', 0o640)
        os.chown(photo, 2001, 2002)
        os.chown(photo.parent, 2001, 2002)
        original_photo = self.metadata(photo)
        helper.apply_plan(self.plan())
        self.assertEqual(self.metadata(self.release)[:3], (0, self.runtime_gid, 0o750))
        self.assertEqual(self.metadata(self.release / '.env')[:3], (0, self.runtime_gid, 0o640))
        self.assertEqual(self.metadata(executable)[:3], (0, self.runtime_gid, 0o750))
        self.assertEqual(self.metadata(private)[:3], (0, 0, 0o600))
        self.assertEqual(self.metadata(private_dash)[:3], (0, 0, 0o600))
        self.assertEqual(self.metadata(self.uploads)[:3], (0, self.runtime_gid, 0o2775))
        self.assertEqual(self.metadata(photo.parent)[:3], (2001, self.runtime_gid, 0o2775))
        self.assertEqual(self.metadata(photo), original_photo)
        self.assertEqual(photo.read_bytes(), b'unchanged-photo')
        first = self.metadata(executable), self.metadata(private), self.metadata(self.release / '.env')
        helper.apply_plan(self.plan())
        self.assertEqual((self.metadata(executable), self.metadata(private), self.metadata(self.release / '.env')), first)

    def test_hardlinks_detach_without_changing_store_or_other_release(self):
        original = self.write(self.store / 'package-content', b'linked dependency bytes', 0o600)
        link = self.release / 'node_modules/package.js'
        sibling = self.release / 'node_modules/package-copy.js'
        other_release = self.releases / '20260906_120000'
        other_release.mkdir(mode=0o700)
        other = other_release / 'package.js'
        for path in (link, sibling, other):
            os.link(original, path)
        before = self.metadata(original), self.metadata(other), original.stat().st_mtime_ns
        plan = self.plan()
        self.assertEqual(plan.summary()['hardlinkFilesToDetach'], 2)
        helper.apply_plan(plan)
        self.assertEqual((self.metadata(original), self.metadata(other), original.stat().st_mtime_ns), before)
        self.assertEqual(link.read_bytes(), original.read_bytes())
        self.assertEqual(sibling.read_bytes(), original.read_bytes())
        self.assertNotEqual(link.stat().st_ino, original.stat().st_ino)
        self.assertNotEqual(sibling.stat().st_ino, original.stat().st_ino)
        self.assertEqual(link.stat().st_mtime_ns, original.stat().st_mtime_ns)
        self.assertEqual(self.metadata(link)[:3], (0, self.runtime_gid, 0o640))

    def test_preserves_internal_pnpm_symlinks(self):
        target = self.write(self.release / 'node_modules/.pnpm/pkg@1/node_modules/pkg/index.js')
        link = self.release / 'node_modules/pkg'
        link.symlink_to('.pnpm/pkg@1/node_modules/pkg', target_is_directory=True)
        inode = link.lstat().st_ino
        helper.apply_plan(self.plan())
        self.assertTrue(link.is_symlink())
        self.assertEqual(link.lstat().st_ino, inode)
        self.assertEqual(link.resolve(), target.parent)

    def test_excluded_roots_remain_untouched(self):
        values = []
        for name in helper.EXCLUDED_ROOT_NAMES:
            private = self.write(self.release / name / 'private', b'excluded')
            values.append((private, self.metadata(private), self.metadata(private.parent)))
        private = self.write(self.release / 'node_modules/package/.git/private', b'excluded')
        values.append((private, self.metadata(private), self.metadata(private.parent)))
        helper.apply_plan(self.plan())
        for private, file_before, directory_before in values:
            self.assertEqual(self.metadata(private), file_before)
            self.assertEqual(self.metadata(private.parent), directory_before)

    def test_external_broken_looping_and_non_dependency_links_block_before_changes(self):
        before = self.metadata(self.release / '.env')
        cases = (('node_modules/external', self.store),
                 ('node_modules/missing', self.release / 'node_modules/absent'),
                 ('node_modules/loop', self.release / 'node_modules/loop'),
                 ('dist/link', self.release / 'dist/public'))
        for relative, destination in cases:
            with self.subTest(relative=relative):
                link = self.release / relative
                link.symlink_to(destination, target_is_directory=True)
                try:
                    with self.assertRaises(helper.Blocked):
                        self.plan()
                    self.assertEqual(self.metadata(self.release / '.env'), before)
                finally:
                    link.unlink()

    def test_upload_symlinks_block_the_complete_preflight(self):
        self.uploads.joinpath('outside').symlink_to(self.store, target_is_directory=True)
        before = self.metadata(self.release / '.env')
        with self.assertRaises(helper.Blocked):
            self.plan()
        self.assertEqual(self.metadata(self.release / '.env'), before)

    def test_abandoned_private_copy_is_not_exposed_to_the_runtime_group(self):
        temporary = self.write(self.release / '.somang-permissions-abandoned', b'private-copy')
        before = self.metadata(temporary), self.metadata(self.release / '.env')
        with self.assertRaises(helper.Blocked):
            self.plan()
        self.assertEqual((self.metadata(temporary), self.metadata(self.release / '.env')), before)

    def test_special_files_and_missing_runtime_files_block(self):
        fifo = self.release / 'unexpected-pipe'
        os.mkfifo(fifo)
        with self.assertRaises(helper.Blocked):
            self.plan()
        fifo.unlink()
        self.release.joinpath('.env').unlink()
        with self.assertRaises(helper.Blocked):
            self.plan()

    def test_release_or_parent_symlink_is_never_followed(self):
        alias = self.releases / '20260908_010203'
        alias.symlink_to(self.release, target_is_directory=True)
        with self.assertRaises(OSError):
            helper.build_plan(alias, self.runtime_gid, self.releases, self.uploads)

    def test_change_after_preflight_blocks_before_first_permission_change(self):
        plan = self.plan()
        before = self.metadata(self.release / '.env')
        self.release.joinpath('dist/index.js').write_bytes(b'changed after preflight')
        with self.assertRaises(helper.Blocked):
            helper.apply_plan(plan)
        self.assertEqual(self.metadata(self.release / '.env'), before)

    def test_new_path_after_preflight_blocks_before_first_permission_change(self):
        plan = self.plan()
        before = self.metadata(self.release / '.env')
        self.write(self.release / 'node_modules/late-file.js')
        with self.assertRaises(helper.Blocked):
            helper.apply_plan(plan)
        self.assertEqual(self.metadata(self.release / '.env'), before)

    def test_directory_replacement_cannot_follow_an_external_target(self):
        checked = self.release / 'node_modules/package'
        self.write(checked / 'file.js')
        plan = self.plan()
        before = self.metadata(self.release / '.env')
        outside = self.store / 'outside'
        self.write(outside / 'file.js', b'outside')
        checked.rename(self.release / 'node_modules/moved')
        checked.symlink_to(outside, target_is_directory=True)
        outside_before = self.metadata(outside / 'file.js')
        with self.assertRaises((helper.Blocked, OSError)):
            helper.apply_plan(plan)
        self.assertEqual(self.metadata(self.release / '.env'), before)
        self.assertEqual(self.metadata(outside / 'file.js'), outside_before)

    def test_failed_copy_does_not_replace_or_chmod_the_shared_original(self):
        original = self.write(self.store / 'content', b'store bytes')
        target = self.release / 'node_modules/content'
        os.link(original, target)
        before = self.metadata(original), self.metadata(target)
        plan = self.plan()
        with mock.patch.object(helper.os, 'write', side_effect=OSError('simulated disk-full')):
            with self.assertRaises(OSError):
                helper.apply_plan(plan)
        self.assertEqual((self.metadata(original), self.metadata(target)), before)
        self.assertEqual(target.read_bytes(), b'store bytes')
        self.assertFalse(list(target.parent.glob('.somang-permissions-*')))


if __name__ == '__main__':
    unittest.main()
