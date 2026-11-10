"""Read audio tags/artwork without modifying source files. Optional pure-Python wheel."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import sys
from datetime import datetime, timezone


def text(tags, *keys):
    for key in keys:
        try:
            value = tags.get(key)
        except (ValueError, AssertionError):
            # Vorbis comments reject the non-ASCII MP4 atom names.
            continue
        if value is None:
            continue
        value = getattr(value, 'genres', getattr(value, 'text', value))
        values = value if isinstance(value, (list, tuple)) else [value]
        result = [re.sub(r'[\x00-\x1f<>]', '', str(v)).strip() for v in values if isinstance(v, (str, int))]
        result = [v for v in result if v]
        if result:
            return result
    return []


def image_extension(data):
    if data.startswith(b'\xff\xd8\xff'):
        return '.jpg'
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return '.png'
    if data.startswith(b'RIFF') and data[8:12] == b'WEBP':
        return '.webp'
    return None


def export(root, output):
    import mutagen
    root = root.resolve()
    generated = root / '.sarvnema'
    covers = generated / 'covers'
    covers.mkdir(parents=True, exist_ok=True)
    tracks, failures = [], []
    media = {'.mp3', '.m4a', '.flac', '.mp4', '.m4v'}
    cover_cache = {}

    def save_cover(data):
        extension = image_extension(data)
        if not extension or len(data) > 8 * 1024 * 1024:
            return None
        name = hashlib.sha256(data).hexdigest()[:32] + extension
        destination = covers / name
        if not destination.exists():
            destination.write_bytes(data)
        return destination.relative_to(root).as_posix()

    def folder_cover(folder):
        if folder in cover_cache:
            return cover_cache[folder]
        candidates = [p for p in folder.iterdir() if p.is_file() and not p.is_symlink() and p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}]
        candidates.sort(key=lambda p: (0 if p.stem.lower() in {'cover', 'folder', 'front', 'album'} else 1, p.name))
        result = None
        for candidate in candidates:
            if candidate.stat().st_size <= 8 * 1024 * 1024:
                result = save_cover(candidate.read_bytes())
                if result:
                    break
        cover_cache[folder] = result
        return result

    files = sorted(p for p in root.rglob('*') if p.suffix.lower() in media and p.is_file() and not p.is_symlink() and '.sarvnema' not in p.relative_to(root).parts)
    for index, file in enumerate(files):
        relative = file.relative_to(root)
        try:
            if not file.resolve().is_relative_to(root):
                raise ValueError('Outside library root')
            audio = mutagen.File(file)
            if audio is None:
                raise ValueError('Unsupported or invalid audio container')
            tags = audio.tags or {}
            titles = text(tags, 'TIT2', '\xa9nam', 'title')
            artists = text(tags, 'TPE1', '\xa9ART', 'artist')
            album_artists = text(tags, 'TPE2', 'aART', 'albumartist')
            albums = text(tags, 'TALB', '\xa9alb', 'album')
            genres = text(tags, 'TCON', '\xa9gen', 'genre')
            dates = text(tags, 'TDRC', 'TYER', '\xa9day', 'date', 'year')
            moods = text(tags, 'TMOO', 'mood', 'TXXX:MOOD')
            folder_artist = relative.parts[0] if len(relative.parts) > 1 else None
            artist = artists or album_artists or ([folder_artist] if folder_artist else [])
            title = titles[0] if titles else re.sub(r'^\d{1,3}[\s._-]+', '', file.stem).strip()
            embedded = []
            if hasattr(tags, 'getall'):
                embedded = [p.data for p in sorted(tags.getall('APIC'), key=lambda p: p.type != 3)]
            elif hasattr(audio, 'pictures'):
                embedded = [p.data for p in sorted(audio.pictures, key=lambda p: p.type != 3)]
            elif tags.get('covr'):
                embedded = [bytes(p) for p in tags['covr']]
            cover = next((saved for data in embedded if (saved := save_cover(data))), None)
            cover_origin = 'embedded' if cover else None
            if not cover:
                cover = folder_cover(file.parent)
                cover_origin = 'folder' if cover else None
            if not cover and folder_artist:
                cover = folder_cover(root / folder_artist)
                cover_origin = 'artist-folder' if cover else None
            info = audio.info
            tracks.append({
                'path': relative.as_posix(), 'bytes': file.stat().st_size,
                'title': title, 'artists': artist, 'albumArtists': album_artists,
                'album': albums[0] if albums else None, 'genres': genres, 'moods': moods,
                'date': dates[0] if dates else None, 'duration': round(info.length, 3),
                'bitrate': getattr(info, 'bitrate', None), 'sampleRate': getattr(info, 'sample_rate', None),
                'codec': getattr(info, 'codec', file.suffix.lower().lstrip('.')),
                'coverPath': cover, 'coverOrigin': cover_origin, 'folderArtist': folder_artist,
                'taggedTitle': bool(titles), 'taggedArtist': bool(artists or album_artists),
                'needsReview': not artist or not title or (not titles and bool(re.search(r'spotifydown|^\d{10,}$|^YAGHMAEE', title, re.I))),
                'kind': 'video' if file.suffix.lower() in {'.mp4', '.m4v'} else 'track',
            })
        except Exception as error:
            failures.append({'path': relative.as_posix(), 'error': f'{type(error).__name__}: {error}'[:250]})
        if (index + 1) % 500 == 0:
            print(json.dumps({'scanned': index + 1, 'total': len(files), 'valid': len(tracks)}), flush=True)
    result = {'version': 1, 'exportedAt': datetime.now(timezone.utc).isoformat(), 'tracks': tracks, 'failures': failures}
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix('.tmp')
    temporary.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    temporary.replace(output)
    print(json.dumps({'files': len(files), 'valid': len(tracks), 'failures': len(failures), 'withCover': sum(bool(t['coverPath']) for t in tracks), 'needsReview': sum(t['needsReview'] for t in tracks), 'genres': collections.Counter(g for t in tracks for g in t['genres']).most_common(25)}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--wheel', type=Path)
    args = parser.parse_args()
    if args.wheel:
        sys.path.insert(0, str(args.wheel.resolve()))
    export(args.root, args.output)
