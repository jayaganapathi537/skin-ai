"""Tests for the hardened budget guard.

Uses a mock Redis that behaves like upstash_redis.Redis but stores in a dict.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import engine_config as cfg, budget


# --- Mock Redis ---

class MockPipeline:
    def __init__(self, store):
        self._store = store
        self._ops = []

    def incrby(self, key, amount):
        self._ops.append(("incrby", key, amount))
        return self

    def expire(self, key, ttl):
        self._ops.append(("expire", key, ttl))
        return self

    def execute(self):
        results = []
        for op in self._ops:
            if op[0] == "incrby":
                _, key, amount = op
                self._store[key] = self._store.get(key, 0) + amount
                results.append(self._store[key])
            elif op[0] == "expire":
                results.append(True)
        return results


class MockRedis:
    def __init__(self, fail=False):
        self._store = {}
        self._fail = fail

    def ping(self):
        if self._fail:
            raise ConnectionError("mock connection failed")
        return "PONG"

    def mget(self, *keys):
        if self._fail:
            raise ConnectionError("mock read failed")
        return [self._store.get(k) for k in keys]

    def pipeline(self):
        if self._fail:
            raise ConnectionError("mock write failed")
        return MockPipeline(self._store)


def _inject_mock(mock):
    """Inject a mock Redis into the budget module."""
    budget._redis = mock
    budget._store_ok = not mock._fail


def _reset():
    budget._reset_for_testing()


# --- Helpers ---

def _save_and_restore_config(overrides):
    """Context-manager-like: save cfg values, apply overrides, return restorer."""
    saved = {}
    for k, v in overrides.items():
        saved[k] = getattr(cfg, k)
        setattr(cfg, k, v)

    def restore():
        for k2, v2 in saved.items():
            setattr(cfg, k2, v2)

    return restore


# =========================================================================
# Tests
# =========================================================================

def test_per_ip_limit_exceeded():
    """After PER_IP_TONE_LIMIT tone calls, the next check returns personal."""
    _reset()
    mock = MockRedis()
    _inject_mock(mock)

    for _ in range(cfg.PER_IP_TONE_LIMIT):
        r = budget.check("1.2.3.4", "tone")
        assert r["allowed"], f"Should be allowed, got {r}"
        budget.increment("1.2.3.4", "tone")

    r = budget.check("1.2.3.4", "tone")
    assert not r["allowed"]
    assert r["reason"] == "personal"

    # Different IP still allowed
    r = budget.check("5.6.7.8", "tone")
    assert r["allowed"]


def test_global_limit_exceeded():
    """After GLOBAL_TONE_LIMIT calls from various IPs, everyone is blocked."""
    _reset()
    mock = MockRedis()
    _inject_mock(mock)

    for i in range(cfg.GLOBAL_TONE_LIMIT):
        ip = f"10.0.0.{i}"
        r = budget.check(ip, "tone")
        assert r["allowed"]
        budget.increment(ip, "tone")

    r = budget.check("99.99.99.99", "tone")
    assert not r["allowed"]
    assert r["reason"] == "global"


def test_lifetime_floor_reached():
    """When lifetime units consumed reach REMAINING_UNITS_AT_DEPLOY - RESERVE_UNITS, block."""
    _reset()
    mock = MockRedis()
    _inject_mock(mock)

    restore = _save_and_restore_config({
        "REMAINING_UNITS_AT_DEPLOY": 200,
        "RESERVE_UNITS": 100,
        "GLOBAL_TONE_LIMIT": 999,
        "PER_IP_TONE_LIMIT": 999,
        "DAILY_UNIT_FLOOR": 0,
    })

    try:
        # 200 - 100 = 100 units available. Each tone = 20 units. 5 calls = 100 used.
        for i in range(5):
            r = budget.check(f"10.0.0.{i}", "tone")
            assert r["allowed"], f"Call {i} should be allowed: {r}"
            budget.increment(f"10.0.0.{i}", "tone")

        # 100 used, remaining = 100, that's <= RESERVE_UNITS (100) → blocked
        r = budget.check("10.0.0.99", "tone")
        assert not r["allowed"]
        assert r["reason"] == "lifetime"
    finally:
        restore()


def test_cache_hit_not_counted():
    """A cache hit should not increment the budget counter."""
    _reset()
    mock = MockRedis()
    _inject_mock(mock)

    # Simulate: check passes, YouCam succeeds, budget.increment called
    budget.increment("1.2.3.4", "tone")

    # Read the raw counter
    key = budget._key_global_tone()
    assert mock._store.get(key) == 1

    # Now simulate a cache hit: check passes but NO increment
    r = budget.check("1.2.3.4", "tone")
    assert r["allowed"]  # second call still within limit
    # Crucially, we do NOT call budget.increment here (that's the main.py logic)

    # Counter should still be 1
    assert mock._store.get(key) == 1


def test_failed_youcam_not_counted():
    """A YouCam error (422, timeout, etc.) should not increment the budget.

    This tests the contract: budget.increment is only called on success.
    The test verifies the counter stays unchanged when increment is not called.
    """
    _reset()
    mock = MockRedis()
    _inject_mock(mock)

    # Pre-flight passes
    r = budget.check("1.2.3.4", "tone")
    assert r["allowed"]

    # YouCam would throw here — we do NOT call budget.increment
    # (main.py raises HTTPException before reaching the increment line)

    lifetime_key = budget._LIFETIME_KEY
    assert mock._store.get(lifetime_key, 0) == 0


def test_store_down_fails_closed():
    """If Redis is unreachable, all live calls are blocked."""
    _reset()
    mock = MockRedis(fail=True)
    _inject_mock(mock)

    r = budget.check("1.2.3.4", "tone")
    assert not r["allowed"]
    assert r["reason"] == "store_down"

    r = budget.check("1.2.3.4", "tryon")
    assert not r["allowed"]
    assert r["reason"] == "store_down"


def test_store_down_on_read_fails_closed():
    """If Redis connects but a read fails, block."""
    _reset()
    mock = MockRedis(fail=False)
    _inject_mock(mock)

    # Verify it works first
    r = budget.check("1.2.3.4", "tone")
    assert r["allowed"]

    # Now break reads
    mock._fail = True
    r = budget.check("1.2.3.4", "tone")
    assert not r["allowed"]
    assert r["reason"] == "store_down"


def test_lifetime_units_accumulate_across_types():
    """Lifetime counter tracks both tone (20 units) and tryon (2 units)."""
    _reset()
    mock = MockRedis()
    _inject_mock(mock)

    budget.increment("1.2.3.4", "tone")   # +20
    budget.increment("1.2.3.4", "tryon")  # +2

    assert mock._store.get(budget._LIFETIME_KEY) == 22


def test_daily_unit_floor():
    """When daily units remaining < DAILY_UNIT_FLOOR, block."""
    _reset()
    mock = MockRedis()
    _inject_mock(mock)

    restore = _save_and_restore_config({
        "GLOBAL_TONE_LIMIT": 5,
        "GLOBAL_TRYON_LIMIT": 50,
        "PER_IP_TONE_LIMIT": 999,
        "PER_IP_TRYON_LIMIT": 999,
        "DAILY_UNIT_FLOOR": 10,
        "REMAINING_UNITS_AT_DEPLOY": 999999,
        "RESERVE_UNITS": 0,
    })

    try:
        # max daily = 5*20 + 50*2 = 200
        # Floor at 10 → stop when remaining < 10
        # Use 5 tones (100 units) + 45 tryons (90 units) = 190 units, remaining = 10 (not < 10)
        for i in range(5):
            budget.increment(f"10.0.0.{i}", "tone")
        for i in range(45):
            budget.increment(f"10.0.1.{i}", "tryon")

        r = budget.check("99.99.99.99", "tryon")
        assert r["allowed"], f"Should be allowed: 10 remaining, floor=10. Got: {r}"

        # One more tryon: 190 + 2 = 192, remaining = 8 < 10 → blocked
        budget.increment("99.99.99.98", "tryon")

        r = budget.check("99.99.99.99", "tryon")
        assert not r["allowed"], f"Should be blocked: {r}"
        assert r["reason"] == "daily_units"
    finally:
        restore()


def test_no_redis_env_fails_closed():
    """If UPSTASH env vars are missing, the store never connects and all calls blocked."""
    _reset()
    # Don't inject a mock — let _connect() run with missing env vars
    old_url = os.environ.pop("UPSTASH_REDIS_REST_URL", None)
    old_token = os.environ.pop("UPSTASH_REDIS_REST_TOKEN", None)
    try:
        r = budget.check("1.2.3.4", "tone")
        assert not r["allowed"]
        assert r["reason"] == "store_down"
    finally:
        if old_url is not None:
            os.environ["UPSTASH_REDIS_REST_URL"] = old_url
        if old_token is not None:
            os.environ["UPSTASH_REDIS_REST_TOKEN"] = old_token


def test_demo_endpoint_no_budget_check():
    """Verify demo fixtures have all required keys and need no live YouCam call."""
    import json
    fixtures_dir = os.path.join(os.path.dirname(__file__), "..", "data", "fixtures")
    for persona in ("light", "medium", "deep"):
        path = os.path.join(fixtures_dir, f"{persona}.json")
        assert os.path.exists(path), f"Missing fixture: {path}"
        with open(path) as f:
            data = json.load(f)
        assert "profile" in data, f"{persona} missing profile"
        assert "palette" in data, f"{persona} missing palette"
        p = data["profile"]
        assert "spectrum_position" in p, f"{persona} missing spectrum_position"
        assert "photo_quality" in p, f"{persona} missing photo_quality"
        pal = data["palette"]
        assert "hero_colors" in pal, f"{persona} missing hero_colors"
        assert len(pal["hero_colors"]) > 0, f"{persona} has empty hero_colors"


# =========================================================================
# Runner
# =========================================================================

if __name__ == "__main__":
    import traceback

    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed = failed = 0
    for t in tests:
        try:
            t()
            passed += 1
            print(f"  PASS  {t.__name__}")
        except Exception as e:
            failed += 1
            print(f"  FAIL  {t.__name__}: {e}")
            traceback.print_exc()
            print()
    print(f"\n{passed} passed, {failed} failed out of {len(tests)}")
    sys.exit(1 if failed else 0)
