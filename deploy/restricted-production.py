#!/usr/bin/env python3
"""Restricted release activation and CMS maintenance for uletay."""
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path('/var/www/uletay')
FIELDS = ['DOMAIN','DEPLOY_PATH','LE_EMAIL','CMS_PORT','DB_HOST','DB_NAME','DB_USER','DB_PASS',
          'ADMIN_USER','ADMIN_PASSWORD','SESSION_SECRET','NEXT_PUBLIC_YANDEX_MAPS_API_KEY',
          'LASTFM_API_KEY','LASTFM_PROXY_URL','VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT',
          'EXPO_PUSH_ACCESS_TOKEN','RUSTORE_PUSH_PROJECT_ID','RUSTORE_PUSH_SERVICE_TOKEN','DB_PORT','VK_APP_ID','VK_REDIRECT_URI','RELEASE_SHA','RELEASE_ID']


def load_env(path):
    result = {}
    for line in path.read_text().splitlines():
        if line and not line.startswith('#'):
            key,value=line.split('=',1);parts=shlex.split(value)
            result[key]=parts[0] if parts else ''
    return result


def maintenance(operation):
    raw=sys.stdin.buffer.read(16385)
    if len(raw)>16384:
        raise ValueError('Oversized maintenance settings')
    options=json.loads(raw)
    if set(options)-{'dry_run','force','limit'}:
        raise ValueError('Unexpected maintenance option')
    args=[]
    for key in ['dry_run','force']:
        if options.get(key) not in [None,False,True,'','false','true']:
            raise ValueError('Invalid boolean option')
        if options.get(key) in [True,'true']:
            args.append('--'+key.replace('_','-'))
    limit=str(options.get('limit',''))
    if limit:
        if not re.fullmatch(r'[0-9]{1,6}',limit):
            raise ValueError('Invalid limit')
        args.append('--limit='+limit)
    with open(ROOT/'.release.lock','w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        cms=(ROOT/'current/cms').resolve()
        runtime=load_env(cms/'.env')
        runtime.update(PATH='/usr/local/bin:/usr/bin:/bin',HOME='/root',NODE_OPTIONS='--max-old-space-size=384')
        if operation=='sync-images':
            runtime['NODE_OPTIONS']+=' --require=/usr/local/lib/gitlub-uletay-image-proxy.cjs'
        task='headliners:sync-lastfm' if operation=='sync-lastfm' else 'headliners:sync-web-images'
        subprocess.run(['nice','-n','10','npm','run',task,'--',*args],cwd=cms,env=runtime,check=True,timeout=10200,umask=0o022)
        print(operation+' completed',flush=True)


def deploy(commit,release_id):
    header=json.loads(sys.stdin.buffer.readline(524289))
    if header['commit']!=commit or header['release_id']!=release_id or not re.fullmatch('[0-9a-f]{64}',header['sha256']):
        raise ValueError('Invalid release header')
    if not 0<header['size']<1024*1024*1024:
        raise ValueError('Invalid release size')
    settings=header['settings']
    pinned={'DOMAIN':'uletayapp.ru','DEPLOY_PATH':str(ROOT),'CMS_PORT':'3000','DB_HOST':'127.0.0.1'}
    if any(settings.get(k)!=v for k,v in pinned.items()):
        raise ValueError('Production target differs from pinned configuration')
    settings.update(RELEASE_SHA=commit,RELEASE_ID=release_id)
    values=[settings.get(k,'') for k in FIELDS]
    if any(not isinstance(v,str) or any(c in v for c in ['\0','\n','\r']) for v in values):
        raise ValueError('Invalid deployment value')
    incoming=ROOT/'incoming';incoming.mkdir(exist_ok=True)
    with open('/run/lock/gitlub-uletay-transfer.lock','w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        release=ROOT/'releases'/release_id
        if release.exists():
            raise ValueError('Release already exists; use a new run attempt')
        with tempfile.TemporaryDirectory(prefix='gitlub-',dir=incoming) as directory:
            archive=Path(directory)/'release.tar.gz'
            digest=hashlib.sha256();remaining=header['size']
            with archive.open('wb') as output:
                while remaining:
                    chunk=sys.stdin.buffer.read(min(1048576,remaining))
                    if not chunk:raise ValueError('Truncated release')
                    remaining-=len(chunk);digest.update(chunk);output.write(chunk)
            if sys.stdin.buffer.read(1) or digest.hexdigest()!=header['sha256']:
                raise ValueError('Release checksum/size mismatch')
            with tarfile.open(archive) as package:
                for member in package.getmembers():
                    path=PurePosixPath(member.name)
                    if path.is_absolute() or '..' in path.parts or path.parts[0] not in ['dist','assets','cms','deploy','shared']:
                        raise ValueError('Unsafe archive path')
                    if not (member.isfile() or member.isdir()):
                        raise ValueError('Release archive must contain ordinary files/directories')
                    if path.name=='.env' or path.name.startswith('.env.'):
                        raise ValueError('Environment file in release archive')
                release.mkdir(mode=0o755)
                # The transport uses umask 077 for secrets; nginx needs traversal.
                release.chmod(0o755)
                package.extractall(release)
            backup=Path('/root/gitlub-deploy-migration/uletay');backup.mkdir(parents=True,exist_ok=True,mode=0o700)
            shutil.copy2(ROOT/'current/cms/.env',backup/(release_id+'-before.env'))
            payload=b''.join(value.encode()+b'\0' for value in values)
            # Existing wrapper handles migrations, candidate checks and rollback.
            subprocess.run(['bash',str(release/'deploy/release-deploy.sh'),'--env-stdin'],input=payload,check=True,umask=0o022)
            if (ROOT/'current').resolve()!=release:
                raise ValueError('Unexpected current release')
            print('Production activated from CI: '+commit,flush=True)


def main():
    os.umask(0o077)
    args=os.environ.get('SSH_ORIGINAL_COMMAND','').split()
    if len(args)==1 and args[0] in ['sync-lastfm','sync-images']:
        maintenance(args[0]);return
    if len(args)!=4 or args[:2]!=['deploy','master'] or not re.fullmatch('[0-9a-f]{40}',args[2]):
        raise ValueError('Only deploy master COMMIT RELEASE or fixed maintenance operations are allowed')
    if not re.fullmatch(re.escape(args[2])+r'-[0-9]+-[0-9]+',args[3]):
        raise ValueError('Invalid release identifier')
    deploy(args[2],args[3])


if __name__=='__main__':
    main()
