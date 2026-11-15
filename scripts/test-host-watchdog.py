import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('watchdog', Path(__file__).resolve().parents[1] / 'deploy/host-watchdog.py')
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)


class WatchdogTests(unittest.TestCase):
    def checks(self):
        return {key: {'ok': True, 'retryable': True} for key in
                ['uletay', 'taxi', 'mysql', 'logind', 'uletay_https', 'taxi_https', 'uletay_web', 'taxi_web']}

    def test_healthy_services_never_restart(self):
        self.assertFalse(any(w.needs_recovery(self.checks()).values()))

    def test_database_failure_does_not_restart_applications(self):
        checks = self.checks()
        for key in ['mysql', 'uletay', 'taxi', 'uletay_https', 'taxi_https']:
            checks[key]['ok'] = False
        self.assertFalse(any(w.needs_recovery(checks).values()))

    def test_backend_failure_recovers_only_that_backend(self):
        checks = self.checks()
        checks['uletay']['ok'] = checks['uletay_https']['ok'] = False
        self.assertEqual(w.needs_recovery(checks), {'uletay': True, 'taxi': False, 'nginx': False, 'logind': False})

    def test_tls_certificate_error_does_not_restart_nginx(self):
        checks = self.checks()
        checks['uletay_https'] = {'ok': False, 'retryable': False}
        self.assertFalse(w.needs_recovery(checks)['nginx'])

    def test_failed_front_with_healthy_backend_recovers_nginx(self):
        checks = self.checks()
        checks['taxi_https']['ok'] = False
        self.assertTrue(w.needs_recovery(checks)['nginx'])

    def test_three_consecutive_failures_and_cooldown(self):
        state = {}
        self.assertEqual(w.advance(state, {'taxi': True}, 10000), [])
        self.assertEqual(w.advance(state, {'taxi': True}, 10060), [])
        self.assertEqual(w.advance(state, {'taxi': True}, 10120), ['taxi'])
        state['taxi']['last_attempt'] = 10120
        self.assertEqual(w.advance(state, {'taxi': True}, 10180), [])
        self.assertEqual(w.advance(state, {'taxi': True}, 11020), ['taxi'])

    def test_success_resets_failures(self):
        state = {'taxi': {'count': 2, 'last_attempt': 0}}
        self.assertEqual(w.advance(state, {'taxi': False}, 10000), [])
        self.assertEqual(w.advance(state, {'taxi': True}, 10060), [])

    def test_health_payload_validation(self):
        with patch.object(w, 'command', return_value=(0, '{"ok":false}\n200')):
            self.assertFalse(w.http('http://127.0.0.1/api/health', expected='uletay')['ok'])
        with patch.object(w, 'command', return_value=(0, '{"data":{"status":"ready"}}\n200')):
            self.assertTrue(w.http('http://127.0.0.1/health/ready', expected='taxi')['ok'])

    def test_http_404_is_not_recovered_but_502_is(self):
        with patch.object(w, 'command', return_value=(22, '\n404')):
            self.assertFalse(w.http('https://uletayapp.ru/')['retryable'])
        with patch.object(w, 'command', return_value=(22, '\n502')):
            self.assertTrue(w.http('https://uletayapp.ru/')['retryable'])

    def test_bus_failure_does_not_restart_logind(self):
        checks = self.checks()
        checks['logind'] = {'ok': False, 'retryable': False}
        self.assertFalse(w.needs_recovery(checks)['logind'])
        checks['logind']['retryable'] = True
        self.assertTrue(w.needs_recovery(checks)['logind'])

    def test_backend_configuration_errors_do_not_restart_applications(self):
        checks = self.checks()
        for name in ['uletay', 'taxi']:
            checks[name] = {'ok': False, 'retryable': False}
        self.assertFalse(any(w.needs_recovery(checks).values()))

    def boot_html(self):
        return ''.join('<script defer src="/_expo/static/js/web/' + name + '.js"></script>'
                       for name in ['runtime', 'common', 'index'])

    def test_web_boot_checks_all_same_origin_scripts(self):
        html = self.boot_html() + '<script src="https://analytics.example/tag.js"></script>'
        with patch.object(w, 'command', side_effect=[(0, html)] + [(0, '200 application/javascript; charset=utf-8')] * 3) as command:
            self.assertEqual(w.web_assets(), {'ok': True, 'retryable': False, 'code': 0, 'scripts': 3})
            self.assertEqual(command.call_count, 4)
            for call in command.call_args_list:
                args = call.args[0]
                self.assertIn('uletayapp.ru:443:127.0.0.1', args)
                self.assertTrue(args[-1].startswith('https://uletayapp.ru/'))

    def test_web_boot_rejects_html_200_instead_of_javascript(self):
        with patch.object(w, 'command', side_effect=[(0, self.boot_html()), (0, '200 text/html')]):
            self.assertEqual(w.web_assets(), {'ok': False, 'retryable': False, 'code': 0})

    def test_web_boot_rejects_missing_script_without_restarting(self):
        with patch.object(w, 'command', side_effect=[(0, self.boot_html()), (22, '404 text/html')]):
            self.assertEqual(w.web_assets(), {'ok': False, 'retryable': False, 'code': 22})

    def test_web_boot_rejects_fallback_without_scripts(self):
        with patch.object(w, 'command', return_value=(0, '<html><p>Festival</p></html>')) as command:
            self.assertFalse(w.web_assets()['ok'])
            command.assert_called_once()

    def test_web_boot_rejects_unavailable_home(self):
        with patch.object(w, 'command', return_value=(28, '')):
            self.assertEqual(w.web_assets(), {'ok': False, 'retryable': False, 'code': 28})

    def test_malformed_script_url_does_not_break_all_health_checks(self):
        html = self.boot_html() + '<script src="https://[invalid/"></script>'
        with patch.object(w, 'command', return_value=(0, html)):
            self.assertEqual(w.web_assets(), {'ok': False, 'retryable': False, 'code': 0})

    def test_invalid_nginx_config_never_restarts_service(self):
        with patch.object(w, 'command', return_value=(1, '')) as command:
            self.assertFalse(w.recover('nginx', 'unused'))
            command.assert_called_once_with(['nginx', '-t'])


if __name__ == '__main__':
    unittest.main()
