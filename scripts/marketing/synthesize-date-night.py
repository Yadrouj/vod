"""Generate an explicitly synthetic Iranian male narration, not a voice clone.

Install edge-tts into an isolated tool folder; no application dependencies change.
Only the public promotional script is sent to Microsoft's speech service.
"""
import asyncio
import hashlib
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / ".media-cache/reel-tools/voice-python"
sys.path.insert(0, str(TOOLS))
import edge_tts  # noqa: E402


async def main():
    plan = json.loads((ROOT / "scripts/marketing/date-night-plan.json").read_text(encoding="utf-8"))
    out = Path(os.environ.get("DATE_NIGHT_OUTPUT", ROOT / ".media-cache/marketing/sarvnema-date-night"))
    out = out / "voice"
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    for scene in plan["scenes"]:
        target = out / (scene["id"] + ".mp3")
        metadata = target.with_suffix(".json")
        signature = hashlib.sha256(json.dumps({"text": scene["spoken"], "voice": plan["voice"]}, ensure_ascii=False).encode()).hexdigest()
        if target.exists() and target.stat().st_size > 1000 and metadata.exists():
            cached = json.loads(metadata.read_text(encoding="utf-8"))
            if cached.get("signature") == signature:
                manifest.append(cached)
                print("VOICE CACHED " + scene["id"], flush=True)
                continue
        voice = plan["voice"]
        client = edge_tts.Communicate(scene["spoken"], voice["name"], rate=voice["rate"], pitch=voice["pitch"])
        await asyncio.wait_for(client.save(str(target)), timeout=60)
        if target.stat().st_size < 1000:
            raise RuntimeError("Empty speech output: " + scene["id"])
        record = {"scene": scene["id"], "signature": signature, "voice": voice["name"], "synthetic": True, "text": scene["spoken"], "file": target.name}
        metadata.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        manifest.append(record)
        print("VOICE READY " + scene["id"], flush=True)
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())
