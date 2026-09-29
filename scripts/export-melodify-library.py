"""Read a consistent, download-only snapshot. Never modifies Melodify or its audio."""
import argparse
import json
import sqlite3
import sys
from pathlib import Path


def export_library(library):
    library = Path(library).resolve()
    root = (library / "tracks").resolve()
    db = sqlite3.connect((library / "checkpoint.sqlite3").as_uri() + "?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    db.execute("BEGIN")
    tags = {}
    for row in db.execute("""
        SELECT DISTINCT ct.track_id, c.id, c.title FROM categories c
        JOIN category_collections cc ON cc.category_id = c.id
        JOIN collection_tracks ct ON ct.collection_id = cc.collection_id
        JOIN tracks t ON t.id = ct.track_id WHERE t.status = 'done'
        ORDER BY ct.track_id, c.id
    """):
        tags.setdefault(row["track_id"], []).append(row["title"])
    tracks, missing = [], []
    for row in db.execute("SELECT * FROM tracks WHERE status = 'done' ORDER BY id"):
        filename = row["filename"] or ""
        file = root / filename
        if (not filename or "/" in filename or "\\" in filename or
                file.suffix.lower() != ".mp3" or file.resolve().parent != root or
                not file.is_file() or file.stat().st_size <= 0):
            missing.append(row["id"])
            continue
        raw = json.loads(row["raw"])
        # Exclude signed upstream media URLs and unrelated account metadata.
        tracks.append({
            "id": row["id"], "title": row["title"],
            "downloadTitle": row["download_title"], "filename": filename,
            "quality": row["quality"], "tags": tags.get(row["id"], []),
            "image": raw.get("image_large") or raw.get("image"),
            "artists": [{"name": a.get("name"), "image": a.get("image_large") or a.get("image")}
                        for a in raw.get("artists", [])],
        })
    statuses = {r[0]: r[1] for r in db.execute("SELECT status, count(*) FROM tracks GROUP BY status")}
    db.close()
    return {"tracks": tracks, "missingFiles": missing, "sourceStatuses": statuses}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("library", help="Melodify library directory containing checkpoint.sqlite3 and tracks/")
    parser.add_argument("--output", help="Optional metadata snapshot (contains no audio or signed media URLs)")
    args = parser.parse_args()
    result = export_library(args.library)
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as out:
            json.dump(result, out, ensure_ascii=False)
        print(json.dumps({"tracks": len(result["tracks"]), "missingFiles": result["missingFiles"]}))
    else:
        json.dump(result, sys.stdout, ensure_ascii=False)
