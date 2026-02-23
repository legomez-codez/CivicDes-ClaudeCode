import json
import hashlib
import time
from pathlib import Path

CACHE_DIR = Path(__file__).parent / "_data"
CACHE_TTL = 86400  # 24 hours


def _cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(exist_ok=True)
    safe = hashlib.md5(key.encode()).hexdigest()
    return CACHE_DIR / f"{safe}.json"


def cache_get(key: str):
    p = _cache_path(key)
    if not p.exists():
        return None
    meta = json.loads(p.read_text())
    if time.time() - meta["ts"] > CACHE_TTL:
        p.unlink(missing_ok=True)
        return None
    return meta["data"]


def cache_set(key: str, data) -> None:
    p = _cache_path(key)
    p.write_text(json.dumps({"ts": time.time(), "data": data}))
