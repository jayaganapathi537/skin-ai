import asyncio
import json
import os

CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cache.json")

_lock = asyncio.Lock()


def _load() -> dict:
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, "r") as f:
            return json.load(f)
    return {}


def _save(data: dict):
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "w") as f:
        json.dump(data, f)


async def has(key: str) -> bool:
    async with _lock:
        return key in _load()


async def get(key: str):
    async with _lock:
        return _load().get(key)


async def set(key: str, value):
    async with _lock:
        data = _load()
        data[key] = value
        _save(data)
