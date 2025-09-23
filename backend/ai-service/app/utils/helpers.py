import hashlib
import json
from datetime import datetime


def safe_json(obj) -> str:
    """Safely stringify object to JSON string"""
    try:
        return json.dumps(obj, indent=2, default=str)
    except Exception as e:
        return str(obj)


def now_iso() -> str:
    """Current timestamp in ISO format"""
    return datetime.utcnow().isoformat()


def hash_payload(payload: dict) -> str:
    """Hash payload with MD5 for caching keys or fingerprints"""
    raw = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.md5(raw.encode("utf-8")).hexdigest()
