import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('send_release', Path(__file__).resolve().parents[1] / 'deploy/send-release.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReleaseTransportTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.archive = Path(self.directory.name) / 'release.tar.gz'
        self.archive.write_bytes(b'\x1f\x8b\x00\narchive bytes\x00')
        self.env = dict(GITHUB_SHA='a' * 40, RELEASE_ID='a' * 40 + '-123-1', DOMAIN='uletayapp.ru', DEPLOY_PATH='/var/www/uletay', CMS_PORT='3000', DB_HOST='127.0.0.1', SSH_HOST='212.193.26.91', SSH_USER='root', DEPLOY_KEY_FILE='/tmp/key', DB_PASS='secret-with-"-and-$', DB_PORT='3306', VK_APP_ID='54857258', VK_REDIRECT_URI='https://uletayapp.ru/admin/auth/vk/callback', LASTFM_PROXY_URL='https://user:password@proxy.example')

    def test_header_preserves_settings_and_verifies_exact_archive(self):
        command, encoded = module.prepare(self.archive, self.env)
        header = json.loads(encoded)
        self.assertEqual(header['sha256'], hashlib.sha256(self.archive.read_bytes()).hexdigest())
        self.assertEqual(header['size'], self.archive.stat().st_size)
        for key in ['DB_PASS', 'DB_PORT', 'VK_APP_ID', 'VK_REDIRECT_URI', 'LASTFM_PROXY_URL']:
            self.assertEqual(header['settings'][key], self.env[key])
            self.assertNotIn(self.env[key], ' '.join(command))
        self.assertEqual(command[-1], f"deploy master {self.env['GITHUB_SHA']} {self.env['RELEASE_ID']}")
        self.assertIn('StrictHostKeyChecking=yes', command)
        self.assertEqual(encoded.count(b'\n'), 1)

    def test_rejects_invalid_release_or_target_before_ssh(self):
        for key, value in [('GITHUB_SHA', 'master'), ('RELEASE_ID', '../other'), ('SSH_HOST', 'other.example'), ('DEPLOY_PATH', '/'), ('CMS_PORT', '3001'), ('DB_PASS', 'line\nbreak')]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                module.prepare(self.archive, {**self.env, key: value})

    def test_rejects_empty_archive(self):
        self.archive.write_bytes(b'')
        with self.assertRaises(ValueError):
            module.prepare(self.archive, self.env)


if __name__ == '__main__':
    unittest.main()
