#!/usr/bin/env python3
"""Local recovery for the VPS shared by Uletay and TaxiGR.

Only local failures can cause a restart. An ISP/DNS outage must never restart
healthy applications. Run without --recover for a read-only health snapshot.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

ROOT = Path('/var/www/uletay')
STATE = Path('/var/lib/uletay-host-watchdog/state.json')
FAILURES = 3
COOLDOWN = 900


def command(args, timeout=12):
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return result.returncode, result.stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        return 124, ''


def http(url, host=None, expected=None):
    args = ['curl', '--noproxy', '*', '--silent', '--show-error', '--fail',
            '--connect-timeout', '2', '--max-time', '5']
    if host:
        args += ['--resolve', host + ':443:127.0.0.1']
    if expected is None:
        args += ['--output', '/dev/null']
    code, output = command(args + ['--write-out', '\n%{http_code}', url])
    body, _, status = output.rpartition('\n')
    if code:
        # Certificate/configuration errors are reported, never "fixed" by restart.
        retryable = code in (7, 28, 52, 56) or (code == 22 and status in ('500', '502', '503', '504'))
        return {'ok': False, 'retryable': retryable, 'code': code}
    try:
        data = json.loads(body) if expected else None
        ok = (data.get('ok') is True if expected == 'uletay' else
              data.get('data', {}).get('status') == 'ready' if expected == 'taxi' else True)
    except (ValueError, AttributeError):
        ok = False
    return {'ok': ok, 'retryable': True, 'code': 0}


def active_identity():
    port = (ROOT / '.active-port').read_text().strip()
    name = (ROOT / '.active-process').read_text().strip()
    if not port.isdigit() or not 1 <= int(port) <= 65535:
        raise ValueError('Invalid active CMS port')
    if not re.fullmatch(r'uletay-cms(?:-[a-f0-9]{40}-[0-9]+-[0-9]+)?', name):
        raise ValueError('Invalid active CMS process')
    return port, name


def snapshot(port):
    jobs = {
        'uletay': lambda: http('http://127.0.0.1:' + port + '/api/health', expected='uletay'),
        'taxi': lambda: http('http://127.0.0.1:4100/health/ready', expected='taxi'),
        'uletay_https': lambda: http('https://uletayapp.ru/api/health', 'uletayapp.ru', 'uletay'),
        'taxi_https': lambda: http('https://api.taxigr.ru/health/ready', 'api.taxigr.ru', 'taxi'),
        'uletay_web': lambda: http('https://uletayapp.ru/', 'uletayapp.ru'),
        'taxi_web': lambda: http('https://taxigr.ru/', 'taxigr.ru'),
    }
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = dict(zip(jobs, pool.map(lambda fn: fn(), jobs.values())))
    results['mysql'] = {'ok': command(['mysqladmin', '--connect-timeout=3', 'ping'])[0] == 0}
    bus_code, bus_owner = command([
        'busctl', '--system', '--timeout=3', 'call', 'org.freedesktop.DBus',
        '/org/freedesktop/DBus', 'org.freedesktop.DBus', 'NameHasOwner',
        's', 'org.freedesktop.login1'])
    results['logind'] = {'ok': bus_code == 0 and bus_owner == 'b true',
                         'retryable': bus_code == 0 and bus_owner == 'b false'}
    return results


def needs_recovery(checks):
    fronts = [checks[key] for key in ('uletay_https', 'taxi_https', 'uletay_web', 'taxi_web')]
    return {
        'uletay': checks['mysql']['ok'] and not checks['uletay']['ok'],
        'taxi': checks['mysql']['ok'] and not checks['taxi']['ok'],
        'nginx': checks['uletay']['ok'] and checks['taxi']['ok']
                 and any(not value['ok'] and value['retryable'] for value in fronts),
        'logind': not checks['logind']['ok'] and checks['logind']['retryable'],
    }


def advance(state, failures, now):
    due = []
    for name, failed in failures.items():
        item = state.setdefault(name, {'count': 0, 'last_attempt': 0})
        item['count'] = item['count'] + 1 if failed else 0
        if (item['count'] >= FAILURES and now - item['last_attempt'] >= COOLDOWN):
            due.append(name)
    return due


def save(state):
    temp = STATE.with_suffix('.tmp')
    temp.write_text(json.dumps(state), encoding='utf-8')
    temp.replace(STATE)


def recover(name, process):
    if name == 'uletay':
        return command(['pm2', 'restart', process], timeout=40)[0] == 0
    if name == 'nginx' and command(['nginx', '-t'])[0] != 0:
        return False
    service = {'taxi': 'taxigr-api', 'nginx': 'nginx', 'logind': 'systemd-logind'}[name]
    return command(['systemctl', 'restart', service], timeout=40)[0] == 0


def main():
    import fcntl
    # Share the deployment lock: never inspect or restart a half-activated CMS.
    with (ROOT / '.release.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('Skipped: release deployment in progress', flush=True)
            return 0
        port, process = active_identity()
        checks = snapshot(port)
        print(json.dumps({'checks': checks}), flush=True)
        if '--recover' not in sys.argv:
            return 0 if all(check['ok'] for check in checks.values()) else 1
        STATE.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        try:
            state = json.loads(STATE.read_text())
            if not isinstance(state, dict):
                raise ValueError('Invalid state')
        except (FileNotFoundError, ValueError):
            state = {}
        now = time.time()
        due = advance(state, needs_recovery(checks), now)
        save(state)
        for name in due:
            # Recheck immediately before mutation: a transient fault may have healed.
            fresh = snapshot(port)
            if not needs_recovery(fresh)[name]:
                state[name]['count'] = 0
                save(state)
                continue
            # Never race a service that was just started by a TaxiGR deployment.
            if name == 'taxi':
                code, since = command(['systemctl', 'show', 'taxigr-api',
                                       '-p', 'ActiveEnterTimestampMonotonic', '--value'])
                uptime = float(Path('/proc/uptime').read_text().split()[0])
                if code or not since.isdigit() or 0 < uptime - int(since) / 1e6 < 180:
                    continue
            state[name]['last_attempt'] = now
            state[name]['count'] = 0
            save(state)  # Record even a failed attempt to prevent restart loops.
            ok = recover(name, process)
            print(json.dumps({'recovery': name, 'command_succeeded': ok}), flush=True)
        return 0


if __name__ == '__main__':
    os.umask(0o077)
    sys.exit(main())
