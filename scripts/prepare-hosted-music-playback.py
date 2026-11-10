"""Create browser-compatible MP3 derivatives for ALAC; never modify originals."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('--metadata', required=True, type=Path)
    parser.add_argument('--ffmpeg', required=True, type=Path)
    parser.add_argument('--wheel', required=True, type=Path)
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--priority', default='')
    args = parser.parse_args()
    sys.path.insert(0, str(args.wheel.resolve()))
    from mutagen.mp3 import MP3
    os.nice(10)
    root = args.root.resolve()
    output = root / '.sarvnema/compatible'
    output.mkdir(parents=True, exist_ok=True)
    metadata = json.loads(args.metadata.read_text(encoding='utf-8'))
    rows = [row for row in metadata['tracks'] if row.get('codec') == 'alac' and not row.get('needsReview')]
    rows.sort(key=lambda row: row['path'] != args.priority)
    manifest = output / 'manifest.json'
    completed, failures = {}, []

    def convert(row):
        source = root / row['path']
        if not source.resolve().is_relative_to(root) or source.is_symlink():
            raise ValueError('Unsafe source path')
        identity = 'hosted-' + hashlib.sha256(row['path'].encode()).hexdigest()[:20]
        target = output / (identity + '.mp3')

        def valid(file):
            if not file.is_file() or file.stat().st_size < 1024:
                return False
            try:
                return abs(MP3(file).info.length - row['duration']) < 2
            except Exception:
                return False

        if not valid(target):
            temporary = output / (identity + '.tmp.mp3')
            result = subprocess.run([str(args.ffmpeg.resolve()), '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                                     '-protocol_whitelist', 'file', '-i', str(source), '-map', '0:a:0', '-vn', '-map_metadata', '-1',
                                     '-c:a', 'libmp3lame', '-b:a', '320k', '-threads', '1', str(temporary)],
                                    capture_output=True, text=True, timeout=max(180, row['duration']))
            if result.returncode or not valid(temporary):
                temporary.unlink(missing_ok=True)
                raise RuntimeError('Conversion or duration validation failed: ' + result.stderr[:200])
            temporary.replace(target)
        return identity, {'path': target.relative_to(root).as_posix(), 'sourcePath': row['path'], 'bytes': target.stat().st_size,
                          'codec': 'mp3', 'bitrate': 320000, 'duration': round(MP3(target).info.length, 3)}

    with ThreadPoolExecutor(max_workers=min(4, max(1, args.workers))) as executor:
        futures = {executor.submit(convert, row): row for row in rows}
        for future in as_completed(futures):
            row = futures[future]
            try:
                identity, entry = future.result()
                completed[identity] = entry
            except Exception as error:
                failures.append({'path': row['path'], 'error': str(error)[:250]})
            temporary = manifest.with_suffix('.tmp')
            temporary.write_text(json.dumps({'version': 1, 'updatedAt': datetime.now(timezone.utc).isoformat(),
                                             'total': len(rows), 'completed': completed, 'failures': failures}), encoding='utf-8')
            temporary.replace(manifest)
            if len(completed) == 1 or (len(completed) + len(failures)) % 25 == 0:
                print(json.dumps({'ready': len(completed), 'total': len(rows), 'failed': len(failures)}), flush=True)
    print(json.dumps({'ready': len(completed), 'total': len(rows), 'failed': len(failures), 'done': True}), flush=True)
    if failures:
        sys.exit(1)


if __name__ == '__main__':
    main()
