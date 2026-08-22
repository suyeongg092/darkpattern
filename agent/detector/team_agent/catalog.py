"""
다크패턴 유형 사전 로더
-----------------------
팀 mock-services가 제공하는 GET /api/catalog 를 호출해서 패턴 ID -> {ko, en, law,
severity, desc} 사전을 가져온다. CONTRACT.md 5절 규칙: "pattern은 /api/catalog의
키 중 하나여야 한다" — 그래서 이 사전을 하드코딩하지 않고 항상 서버에서 직접 받아온다.
서비스 쪽에서 유형을 추가/변경해도 탐지기가 자동으로 최신 목록을 따라간다.
"""
from __future__ import annotations
import requests

_cache: dict | None = None


def load(base_url: str = "http://localhost:4000") -> dict:
    global _cache
    if _cache is not None:
        return _cache
    resp = requests.get(f"{base_url}/api/catalog", timeout=5)
    resp.raise_for_status()
    _cache = resp.json()["patterns"]
    return _cache


def pattern_ids(base_url: str = "http://localhost:4000") -> list[str]:
    return list(load(base_url).keys())


def describe(pattern_id: str, base_url: str = "http://localhost:4000") -> dict | None:
    return load(base_url).get(pattern_id)
