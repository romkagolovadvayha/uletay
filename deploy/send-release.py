#!/usr/bin/env python3
"""Send a verified release archive through the restricted production SSH key."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

SETTINGS = (
    'DOMAIN DEPLOY_PATH LE_EMAIL CMS_PORT DB_HOST DB_NAME DB_USER DB_PASS '
    'ADMIN_USER ADMIN_PASSWORD SESSION_SECRET NEXT_PUBLIC_YANDEX_MAPS_API_KEY '
    'LASTFM_API_KEY LASTFM_PROXY_URL VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT '
    'EXPO_PUSH_ACCESS_TOKEN RUSTORE_PUSH_PROJECT_ID RUSTORE_PUSH_SERVICE_TOKEN '
    'DB_PORT VK_APP_ID VK_REDIRECT_URI'
).split()


def prepare(archive, env):
    commit, release = env['GITHUB_SHA'], env['RELEASE_ID']
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('Invalid commit')
    if not re.fullmatch(re.escape(commit) + r'-[0-9]+-[0-9]+', release):
        raise ValueError('Invalid release ID')
    settings = {key: env.get(key, '') for key in SETTINGS}
    if any(any(char in value for char in '\0\r\n') for value in settings.values()):
        raise ValueError('Multiline deployment setting')
    expected = {'DOMAIN': 'uletayapp.ru', 'DEPLOY_PATH': '/var/www/uletay', 'CMS_PORT': '3000', 'DB_HOST': '127.0.0.1'}
    if any(settings[key] != value for key, value in expected.items()):
        raise ValueError('Production target differs from the pinned configuration')
    if env['SSH_HOST'] != '212.193.26.91' or env['SSH_USER'] != 'root' or env.get('SSH_PORT', '22') != '22':
        raise ValueError('Unexpected production SSH target')
    with archive.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    size = archive.stat().st_size
    if not 0 < size < 1024 ** 3:
        raise ValueError('Release archive is empty or too large')
    header = {'commit': commit, 'release_id': release, 'sha256': digest, 'size': size, 'settings': settings}
    command = [
        'ssh', '-T', '-i', env['DEPLOY_KEY_FILE'], '-p', '22',
        '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes',
        '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=20',
        '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=15',
        'root@212.193.26.91', f'deploy master {commit} {release}',
    ]
    return command, (json.dumps(header, separators=(',', ':')) + '\n').encode()


def send(archive, env):
    command, header = prepare(archive, env)
    with subprocess.Popen(command, stdin=subprocess.PIPE) as process:
        try:
            process.stdin.write(header)
            with archive.open('rb') as source:
                shutil.copyfileobj(source, process.stdin, 1024 * 1024)
            process.stdin.close()
        except BrokenPipeError:
            pass
        status = process.wait()
        if status:
            raise RuntimeError(f'Release transfer or activation failed (SSH exit {status})')
    print('Production release activated: ' + env['GITHUB_SHA'])


if __name__ == '__main__':
    send(Path(sys.argv[1] if len(sys.argv) > 1 else 'release.tar.gz'), os.environ)
