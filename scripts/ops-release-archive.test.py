"""Linux integration touches only one disposable root-owned fixture directory.

No real PM2, /proc inspection, HTTP request, release or backup metadata is used.
Run: sudo -n python3 -I -B scripts/ops-release-archive.test.py
"""

from contextlib import redirect_stderr
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
import unittest
from unittest import mock


spec = importlib.util.spec_from_file_location('somang_archive', Path(__file__).with_name('ops-release-archive.py'))
helper = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = helper
spec.loader.exec_module(helper)


class BoundaryTests(unittest.TestCase):
    def test_latest_five_and_all_reference_reasons_are_additive(self):
        names = [f'202609{day:02d}_120000' for day in range(1, 11)]
        state = helper.State(Path('/fixed/current'), {
            names[0]: ['current'], names[1]: ['pm2'], names[2]: ['process-cwd'],
            names[3]: ['dump.pm2'], names[4]: ['dump.pm2.bak']}, 'fixture')
        self.assertEqual(set(helper.protected_names(names, state)), set(names))

    def test_cli_accepts_no_path_overrides_and_blocks_non_root(self):
        for arguments in (['--release', '/other-app'], ['--archive', '/tmp'], ['--keep', '0']):
            with self.subTest(arguments=arguments), redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as raised:
                helper.main(arguments)
            self.assertEqual(raised.exception.code, 2)
        with mock.patch.object(helper.sys, 'platform', 'linux'), \
                mock.patch.object(helper.os, 'geteuid', return_value=1007, create=True), \
                self.assertRaises(helper.Blocked):
            helper.main([])


@unittest.skipUnless(sys.platform == 'linux' and getattr(os, 'geteuid', lambda: -1)() == 0,
                     'Linux root is required for the isolated rename/rollback fixture.')
class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='somang-archive-test-', dir='/root')
        self.root = Path(self.temporary.name)
        self.releases = self.root / 'somang/releases'
        self.releases.mkdir(parents=True, mode=0o700)
        self.names = [f'202609{day:02d}_120000' for day in range(1, 11)]
        for name in self.names:
            release = self.releases / name
            release.mkdir(mode=0o700)
            (release / 'dist').mkdir(mode=0o700)
            (release / 'dist/index.js').write_bytes(('artifact-' + name).encode())
            (release / '.env').write_bytes(b'private-fixture')
            (release / '.env').chmod(0o600)
        self.current = self.root / 'somang/current'
        self.current.symlink_to(self.releases / self.names[-1], target_is_directory=True)
        self.dump_dir = self.root / 'pm2'
        self.dump_dir.mkdir(mode=0o700)
        self.layout = helper.Layout(self.releases, self.current, self.root / 'somang/current.tmp',
                                    self.root / 'archive', (self.dump_dir / 'dump.pm2', self.dump_dir / 'dump.pm2.bak'))
        self.state = helper.State(self.current.resolve(), {self.names[-1]: ['current']}, 'stable-fixture')
        self.before = {name: (self.releases / name).stat().st_ino for name in self.names}

    def tearDown(self):
        self.temporary.cleanup()

    def reader(self, _layout):
        return self.state

    def plan(self, reader=None):
        return helper.build_plan(self.layout, state_reader=reader or self.reader, check_health=lambda: None)

    def assert_all_restored(self):
        self.assertEqual({name: (self.releases / name).stat().st_ino for name in self.names}, self.before)

    def events(self):
        manifest = next(self.layout.archive.glob('manifest-*.jsonl'))
        self.assertEqual(stat.S_IMODE(manifest.stat().st_mode), 0o600)
        return [json.loads(line) for line in manifest.read_text().splitlines()]

    def test_real_reference_extraction_protects_pm2_proc_current_and_both_dumps(self):
        self.layout.dumps[0].write_text(json.dumps([{'pm_cwd': str(self.releases / self.names[2]),
                                                   'script': 'dist/index.js'}]))
        self.layout.dumps[1].write_text(json.dumps([{'pm_exec_path': str(self.releases / self.names[3] / 'dist/index.js')}]))
        apps = [
            {'name': 'somang-memorial', 'pid': 101, 'pm2_env': {'status': 'online', 'pm_cwd': str(self.current),
                                                              'pm_exec_path': str(self.current / 'dist/index.js')}},
            {'name': 'other-protected-app', 'pid': 102, 'pm2_env': {'status': 'online',
                                                                  'pm_cwd': str(self.releases / self.names[0])}},
            {'name': 'stopped-entry', 'pm2_env': {'status': 'stopped', 'pm_cwd': '/unrelated'}},
        ]
        with mock.patch.object(helper, 'read_pm2', return_value=apps), \
                mock.patch.object(helper, 'process_cwds', return_value=[str(self.releases / self.names[1])]):
            plan = self.plan(reader=helper.read_state)
        self.assertEqual(plan.candidates, [self.names[4]])
        self.assertIn('current', plan.protected[self.names[-1]])
        self.assertFalse(self.layout.archive.exists())

    def test_plan_and_successful_same_inode_renames_preserve_active_dist(self):
        plan = self.plan()
        self.assertEqual(plan.candidates, self.names[:5])
        self.assertFalse(self.layout.archive.exists())
        active_hash = helper.dist_fingerprint(self.state.current)
        result = helper.apply_plan(plan, state_reader=self.reader, check_health=lambda: None)
        self.assertEqual(result['moved'], self.names[:5])
        self.assertEqual(stat.S_IMODE(self.layout.archive.stat().st_mode), 0o700)
        for name in result['moved']:
            destination = self.layout.archive / name
            self.assertEqual(destination.stat().st_ino, self.before[name])
            self.assertEqual((destination / '.env').read_bytes(), b'private-fixture')
            self.assertFalse((self.releases / name).exists())
        for name in self.names[5:]:
            self.assertEqual((self.releases / name).stat().st_ino, self.before[name])
        self.assertEqual(helper.dist_fingerprint(self.state.current), active_hash)
        events = self.events()
        self.assertEqual(events[-1]['event'], 'complete')
        self.assertEqual(events[0]['entries'][0]['originalPath'], str(self.releases / self.names[0]))

    def test_deploy_marker_symlink_collision_and_cross_filesystem_block_before_moves(self):
        self.layout.transient.symlink_to(self.state.current, target_is_directory=True)
        with mock.patch.object(helper, 'read_pm2', side_effect=AssertionError('must fail before PM2')):
            with self.assertRaises(helper.Blocked):
                self.plan(reader=helper.read_state)
        self.layout.transient.unlink()
        timestamp_link = self.releases / '20260911_120000'
        timestamp_link.symlink_to(self.state.current, target_is_directory=True)
        with self.assertRaises(helper.Blocked):
            self.plan()
        timestamp_link.unlink()
        self.layout.archive.mkdir(mode=0o700)
        collision = self.layout.archive / self.names[0]
        collision.mkdir(mode=0o700)
        with self.assertRaises(helper.Blocked):
            self.plan()
        collision.rmdir()
        real_fstat = os.fstat
        def other_device(descriptor):
            value = real_fstat(descriptor)
            if os.readlink(f'/proc/self/fd/{descriptor}') == str(self.layout.archive):
                values = list(value)
                values[2] = value.st_dev + 1
                return os.stat_result(values)
            return value
        with mock.patch.object(helper.os, 'fstat', side_effect=other_device), self.assertRaises(helper.Blocked):
            self.plan()
        self.assert_all_restored()

    def test_process_or_current_change_restores_only_this_runs_moves(self):
        plan = self.plan()
        calls = 0
        def changing(_layout):
            nonlocal calls
            calls += 1
            if calls >= 2:
                return helper.State(self.state.current, self.state.references, 'changed-process-or-current')
            return self.state
        with self.assertRaises(helper.Blocked):
            helper.apply_plan(plan, state_reader=changing, check_health=lambda: None)
        self.assert_all_restored()
        self.assertEqual(self.events()[-1]['event'], 'rolled-back')
        self.assertEqual(self.events()[-1]['movedBeforeFailure'], [self.names[0]])

    def test_failed_after_health_restores_all_moved_releases(self):
        plan = self.plan()
        calls = 0
        def unhealthy_after():
            nonlocal calls
            calls += 1
            if calls >= 2:
                raise helper.Blocked('fixture health failure')
        with self.assertRaises(helper.Blocked):
            helper.apply_plan(plan, state_reader=self.reader, check_health=unhealthy_after)
        self.assert_all_restored()
        self.assertEqual(self.events()[-1]['event'], 'rolled-back')
        self.assertEqual(self.events()[-1]['recoveryHealth'], 'failed')

    def test_rollback_never_overwrites_a_new_original_path(self):
        plan = self.plan()
        calls = 0
        def collision_after():
            nonlocal calls
            calls += 1
            if calls == 2:
                occupied = self.releases / self.names[0]
                occupied.mkdir(mode=0o700)
                (occupied / 'new-owner-fixture').write_bytes(b'do not overwrite')
                raise helper.Blocked('fixture failure')
        with self.assertRaisesRegex(helper.Blocked, 'Rollback is incomplete'):
            helper.apply_plan(plan, state_reader=self.reader, check_health=collision_after)
        self.assertEqual((self.releases / self.names[0] / 'new-owner-fixture').read_bytes(), b'do not overwrite')
        self.assertEqual((self.layout.archive / self.names[0]).stat().st_ino, self.before[self.names[0]])
        self.assertEqual(self.events()[-1]['manualRecoveryRequired'], [self.names[0]])


if __name__ == '__main__':
    unittest.main()
