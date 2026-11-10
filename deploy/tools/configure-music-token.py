"""Set the music-host credential from stdin, preserving every other env key."""
from datetime import datetime, timezone
import os
from pathlib import Path
import re
import shutil
import sys


def main():
    root = Path.cwd()
    if not (root / 'deploy/DEPLOY-SARVNEMA.md').is_file():
        raise SystemExit('Run from the SarvNema repository root.')
    token = sys.stdin.read().strip()
    if not re.fullmatch(r'[A-Za-z0-9_.-]{32,256}', token):
        raise SystemExit('Invalid credential format; nothing changed.')
    target = root / '.env.local'
    if target.is_symlink():
        raise SystemExit('Refusing a symlinked environment file.')
    original = target.read_text(encoding='utf-8') if target.exists() else ''
    lines = [line for line in original.splitlines() if not re.match(r'^\s*(?:export\s+)?SARVNEMA_MUSIC_TOKEN\s*=', line)]
    if target.exists():
        backups = root / '.deploy-backups/music-credentials'
        backups.mkdir(mode=0o700, parents=True, exist_ok=True)
        backup = backups / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.env')
        shutil.copyfile(target, backup)
        backup.chmod(0o600)
    temporary = root / '.env.local.music-token.tmp'
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w', encoding='utf-8') as handle:
        handle.write('\n'.join([*lines, 'SARVNEMA_MUSIC_TOKEN=' + token, '']))
    temporary.replace(target)
    print('Music archive credential configured privately; other environment keys preserved.')


if __name__ == '__main__':
    main()
