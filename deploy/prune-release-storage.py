#!/usr/bin/env python3
"""Retain the active release, two rollback releases, and live/fresh candidates."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import time

RELEASE_NAME = re.compile(r'[a-f0-9]{40}-[0-9]+-[0-9]+')


def release_plan(root, candidate=None, live_directories=(), now=None):
    root = Path(root).absolute()
    releases = root / 'releases'
    if root.resolve() != root or releases.is_symlink() or releases.resolve() != releases:
        raise ValueError('Release storage must use real directories')
    current = (root / 'current').resolve(strict=True)
    if current.parent != releases or not RELEASE_NAME.fullmatch(current.name) or not current.is_dir():
        raise ValueError('Cannot identify the active release safely')
    protected = {current}
    if candidate:
        candidate = Path(candidate).absolute()
        if candidate.parent != releases or candidate.is_symlink() or candidate.resolve() != candidate:
            raise ValueError('Invalid candidate release')
        protected.add(candidate)
    for directory in live_directories:
        try:
            relative = Path(directory).resolve().relative_to(releases)
            if relative.parts:
                protected.add(releases / relative.parts[0])
        except (OSError, RuntimeError, ValueError):
            continue
    entries = [p for p in releases.iterdir()
               if RELEASE_NAME.fullmatch(p.name) and not p.is_symlink() and p.is_dir()
               and p.resolve() == p and p.stat().st_dev == releases.stat().st_dev
               and (p / 'cms').is_dir()]
    completed = sorted([p for p in entries if p != current and (p / '.activated').is_file()],
                       key=lambda p: (p / '.activated').stat().st_mtime, reverse=True)
    protected.update(completed[:2])
    cutoff = (time.time() if now is None else now) - 86400
    remove = [p for p in entries if p not in protected
              and ((p / '.activated').is_file() or p.stat().st_mtime < cutoff)]
    return {'current': current, 'keep': sorted(protected), 'remove': sorted(remove)}


def live_working_directories():
    for item in Path('/proc').iterdir():
        if item.name.isdigit():
            try:
                yield (item / 'cwd').resolve(strict=True)
            except (OSError, RuntimeError):
                pass


def main():
    import fcntl
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root')
    parser.add_argument('--candidate')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--lock-held', action='store_true', help='Caller holds the release lock')
    args = parser.parse_args()
    lock = None
    if not args.lock_held:
        lock = open(Path(args.root) / '.release.lock', 'a')
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    plan = release_plan(args.root, args.candidate, live_working_directories())
    before = shutil.disk_usage(args.root).free
    if args.apply:
        for target in plan['remove']:
            # Recheck the active link and target immediately before each removal.
            if (Path(args.root) / 'current').resolve() != plan['current']:
                raise RuntimeError('Active release changed during cleanup')
            if target.is_symlink() or target.resolve() != target:
                raise RuntimeError('Release target changed during cleanup')
            shutil.rmtree(target)
    print(json.dumps({'applied': args.apply, 'kept': [str(p) for p in plan['keep']],
                      'removed' if args.apply else 'wouldRemove': [str(p) for p in plan['remove']],
                      'freedBytes': shutil.disk_usage(args.root).free - before}))


if __name__ == '__main__':
    main()
