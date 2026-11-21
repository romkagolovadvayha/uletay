import importlib.util
import os
from pathlib import Path
import tempfile
import time
import unittest

spec = importlib.util.spec_from_file_location('release_retention', Path(__file__).resolve().parents[1] / 'deploy/prune-release-storage.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReleaseRetentionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.releases = self.root / 'releases'
        self.releases.mkdir()
        self.now = time.time()
        self.current = self.release('a', 6)
        try:
            (self.root / 'current').symlink_to(self.current, target_is_directory=True)
        except OSError as error:
            self.skipTest('Symlinks unavailable: ' + str(error))

    def release(self, character, age, activated=True):
        p = self.releases / (character * 40 + '-1-1')
        (p / 'cms').mkdir(parents=True)
        if activated:
            marker = p / '.activated'
            marker.touch()
            os.utime(marker, (self.now - age * 86400,) * 2)
        os.utime(p, (self.now - age * 86400,) * 2)
        return p

    def plan(self, **kwargs):
        return module.release_plan(self.root, now=self.now, **kwargs)

    def test_retains_current_and_two_latest_successes(self):
        newest = self.release('b', 1)
        second = self.release('c', 2)
        old = self.release('d', 10)
        self.assertEqual(set(self.plan()['keep']), {self.current, newest, second})
        self.assertEqual(self.plan()['remove'], [old])

    def test_live_process_and_candidate_are_protected(self):
        self.release('b', 1)
        self.release('c', 2)
        live = self.release('d', 10)
        candidate = self.release('e', 10, activated=False)
        plan = self.plan(candidate=candidate, live_directories=[live / 'cms'])
        self.assertFalse(plan['remove'])

    def test_failed_candidates_wait_one_day(self):
        old = self.release('b', 3, activated=False)
        recent = self.release('c', 0.01, activated=False)
        self.assertEqual(self.plan()['remove'], [old])
        self.assertNotIn(recent, self.plan()['remove'])

    def test_unknown_folders_and_external_symlinks_are_untouched(self):
        (self.releases / 'backups').mkdir()
        external = self.root / 'uploads'
        external.mkdir()
        (self.releases / ('b' * 40 + '-1-1')).symlink_to(external, target_is_directory=True)
        self.assertFalse(self.plan()['remove'])
        self.assertTrue(external.is_dir())

    def test_external_current_is_rejected(self):
        (self.root / 'current').unlink()
        (self.root / 'current').symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError):
            self.plan()

    def test_external_candidate_is_rejected(self):
        with self.assertRaises(ValueError):
            self.plan(candidate=self.root / 'uploads')

    def test_symlinked_storage_is_rejected(self):
        actual = self.root / 'real-releases'
        self.releases.rename(actual)
        self.releases.symlink_to(actual, target_is_directory=True)
        with self.assertRaises(ValueError):
            self.plan()


if __name__ == '__main__':
    unittest.main()
