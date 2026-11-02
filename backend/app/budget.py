"""Budget guard for YouCam API calls.

Tracks per-IP daily, global daily, and lifetime unit consumption in
Upstash Redis (env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN).

Fail-closed: if the store is unreachable, all live calls are blocked.
Only successful live calls should be incremented (not errors, not cache hits).
"""

import os
from datetime import date

from . import engine_config as cfg

_redis = None
_store_ok = False


def _connect():
    """Lazy-connect to Upstash Redis. Sets _store_ok = True on success."""
    global _redis, _store_ok
    if _redis is not None:
        return

    url = os.getenv("UPSTASH_REDIS_REST_URL", "")
    token = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
    if not url or not token:
        print("[Budget] UPSTASH_REDIS_REST_URL / TOKEN not set — live calls blocked (fail-closed)")
        _store_ok = False
        return

    try:
        from upstash_redis import Redis
        _redis = Redis(url=url, token=token)
        _redis.ping()
        _store_ok = True
        print("[Budget] Connected to Upstash Redis")
    except Exception as e:
        print(f"[Budget] Redis connection failed: {e} — live calls blocked (fail-closed)")
        _redis = None
        _store_ok = False


def _today() -> str:
    return date.today().isoformat()


def _safe_int(val) -> int:
    if val is None:
        return 0
    return int(val)


def _key_ip_tone(ip: str) -> str:
    return f"budget:{_today()}:ip:{ip}:tone"


def _key_ip_tryon(ip: str) -> str:
    return f"budget:{_today()}:ip:{ip}:tryon"


def _key_global_tone() -> str:
    return f"budget:{_today()}:global:tone"


def _key_global_tryon() -> str:
    return f"budget:{_today()}:global:tryon"


_LIFETIME_KEY = "budget:lifetime_units_used"
_DAY_TTL = 90000  # 25 hours — keys auto-expire after the day rolls over


def _read_counters(ip: str) -> dict:
    """Read all counters in one round-trip via mget."""
    keys = [
        _key_ip_tone(ip),
        _key_ip_tryon(ip),
        _key_global_tone(),
        _key_global_tryon(),
        _LIFETIME_KEY,
    ]
    vals = _redis.mget(*keys)
    return {
        "ip_tone": _safe_int(vals[0]),
        "ip_tryon": _safe_int(vals[1]),
        "global_tone": _safe_int(vals[2]),
        "global_tryon": _safe_int(vals[3]),
        "lifetime_used": _safe_int(vals[4]),
    }


def check(ip: str, kind: str) -> dict:
    """Pre-flight check. Returns {"allowed": bool, "reason": str|None, ...}.

    Reasons: "personal", "global", "daily_units", "lifetime", "store_down".
    """
    _connect()

    if not _store_ok:
        return {
            "allowed": False,
            "reason": "store_down",
            "ip_remaining": 0,
            "global_remaining": 0,
            "lifetime_remaining": 0,
        }

    try:
        c = _read_counters(ip)
    except Exception as e:
        print(f"[Budget] Redis read failed: {e} — blocking (fail-closed)")
        return {
            "allowed": False,
            "reason": "store_down",
            "ip_remaining": 0,
            "global_remaining": 0,
            "lifetime_remaining": 0,
        }

    ip_limit = cfg.PER_IP_TONE_LIMIT if kind == "tone" else cfg.PER_IP_TRYON_LIMIT
    global_limit = cfg.GLOBAL_TONE_LIMIT if kind == "tone" else cfg.GLOBAL_TRYON_LIMIT
    global_used = c["global_tone"] if kind == "tone" else c["global_tryon"]

    ip_remaining = ip_limit - (c["ip_tone"] if kind == "tone" else c["ip_tryon"])
    global_remaining = global_limit - global_used

    daily_units_used = c["global_tone"] * cfg.UNITS_PER_TONE + c["global_tryon"] * cfg.UNITS_PER_TRYON
    max_daily_units = cfg.GLOBAL_TONE_LIMIT * cfg.UNITS_PER_TONE + cfg.GLOBAL_TRYON_LIMIT * cfg.UNITS_PER_TRYON
    daily_units_remaining = max_daily_units - daily_units_used

    lifetime_remaining = cfg.REMAINING_UNITS_AT_DEPLOY - c["lifetime_used"]

    if ip_remaining <= 0:
        return _deny("personal", ip_remaining, global_remaining, lifetime_remaining)

    if global_remaining <= 0:
        return _deny("global", ip_remaining, global_remaining, lifetime_remaining)

    if daily_units_remaining < cfg.DAILY_UNIT_FLOOR:
        return _deny("daily_units", ip_remaining, global_remaining, lifetime_remaining)

    if lifetime_remaining <= cfg.RESERVE_UNITS:
        return _deny("lifetime", ip_remaining, global_remaining, lifetime_remaining)

    return {
        "allowed": True,
        "reason": None,
        "ip_remaining": ip_remaining,
        "global_remaining": global_remaining,
        "lifetime_remaining": lifetime_remaining,
    }


def _deny(reason, ip_remaining, global_remaining, lifetime_remaining):
    return {
        "allowed": False,
        "reason": reason,
        "ip_remaining": max(0, ip_remaining),
        "global_remaining": max(0, global_remaining),
        "lifetime_remaining": max(0, lifetime_remaining),
    }


def increment(ip: str, kind: str):
    """Record a *successful* live API call. Only call after YouCam returns OK."""
    _connect()
    if not _store_ok:
        return

    unit_cost = cfg.UNITS_PER_TONE if kind == "tone" else cfg.UNITS_PER_TRYON
    ip_key = _key_ip_tone(ip) if kind == "tone" else _key_ip_tryon(ip)
    global_key = _key_global_tone() if kind == "tone" else _key_global_tryon()

    try:
        pipe = _redis.pipeline()
        pipe.incrby(ip_key, 1)
        pipe.expire(ip_key, _DAY_TTL)
        pipe.incrby(global_key, 1)
        pipe.expire(global_key, _DAY_TTL)
        pipe.incrby(_LIFETIME_KEY, unit_cost)
        pipe.execute()
    except Exception as e:
        print(f"[Budget] Redis write failed during increment: {e}")


def status(ip: str) -> dict:
    """Return current budget status for the health endpoint."""
    _connect()
    if not _store_ok:
        return {
            "store": "down",
            "ip_tone_remaining": 0,
            "ip_tryon_remaining": 0,
            "global_tone_remaining": 0,
            "global_tryon_remaining": 0,
            "lifetime_remaining": 0,
        }

    try:
        c = _read_counters(ip)
    except Exception:
        return {"store": "down"}

    lifetime_remaining = cfg.REMAINING_UNITS_AT_DEPLOY - c["lifetime_used"]

    return {
        "store": "ok",
        "ip_tone_remaining": cfg.PER_IP_TONE_LIMIT - c["ip_tone"],
        "ip_tryon_remaining": cfg.PER_IP_TRYON_LIMIT - c["ip_tryon"],
        "global_tone_remaining": cfg.GLOBAL_TONE_LIMIT - c["global_tone"],
        "global_tryon_remaining": cfg.GLOBAL_TRYON_LIMIT - c["global_tryon"],
        "lifetime_remaining": lifetime_remaining,
        "reserve_units": cfg.RESERVE_UNITS,
    }


# --- Test helpers (not used in production) ---

def _reset_for_testing():
    """Reset module state for unit tests with a mock store."""
    global _redis, _store_ok
    _redis = None
    _store_ok = False
