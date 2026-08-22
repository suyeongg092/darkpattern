"""
RAG(Retrieval-Augmented Generation) 검색 레이어
-------------------------------------------------
knowledge_base.py의 학술/규제 조각 + catalog.py가 서버에서 받아온 패턴별 법조문
설명을 합쳐서 검색 대상 코퍼스로 삼는다. 의심스러운 UI 요소를 설명하는 쿼리 문자열이
들어오면 OpenAI 임베딩 코사인 유사도로 가장 관련 있는 근거를 찾아온다. LLM 판단
(llm_judge.py)은 이 검색 결과를 프롬프트에 근거로 넣어서, "그냥 추측"이 아니라
"이 문헌/법조문의 이 정의에 해당하기 때문"이라고 답하도록 만든다.

네트워크가 막혀 있거나(API 도달 불가) 키가 없는 환경에서도 파이프라인 전체가 죽지
않도록, 임베딩 API 호출이 실패하면 단순 키워드 중복도 기반 검색으로 자동 폴백한다.
이 경우 결과의 citation 신뢰도는 낮아지므로 로그에 "폴백 사용됨"이라고 명시한다.
"""
from __future__ import annotations
import math
import os
import re
from dataclasses import dataclass

from .knowledge_base import KNOWLEDGE_BASE
from . import catalog

EMBED_MODEL = "text-embedding-3-small"

_embedding_cache: dict[str, list[float]] = {}
_client = None
_client_init_failed = False
_corpus_cache: list[dict] | None = None


def _get_client():
    global _client, _client_init_failed
    if _client is not None or _client_init_failed:
        return _client
    try:
        from openai import OpenAI
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            _client_init_failed = True
            return None
        _client = OpenAI(api_key=api_key)
        return _client
    except Exception:
        _client_init_failed = True
        return None


def _embed(text: str) -> list[float] | None:
    if text in _embedding_cache:
        return _embedding_cache[text]
    client = _get_client()
    if not client:
        return None
    try:
        resp = client.embeddings.create(model=EMBED_MODEL, input=text)
        vec = resp.data[0].embedding
        _embedding_cache[text] = vec
        return vec
    except Exception:
        return None


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


_TOKEN_RE = re.compile(r"[가-힣A-Za-z0-9]+")


def _keyword_overlap_score(query: str, text: str) -> float:
    """임베딩 API를 못 쓸 때 쓰는 대체 검색: 토큰 중복 비율 기반 근사 유사도."""
    q_tokens = set(_TOKEN_RE.findall(query.lower()))
    t_tokens = set(_TOKEN_RE.findall(text.lower()))
    if not q_tokens or not t_tokens:
        return 0.0
    overlap = q_tokens & t_tokens
    return len(overlap) / math.sqrt(len(q_tokens) * len(t_tokens))


def _corpus(base_url: str) -> list[dict]:
    """학술 지식베이스 + 서버 catalog(패턴별 법조문 설명)를 합친 검색 코퍼스."""
    global _corpus_cache
    if _corpus_cache is not None:
        return _corpus_cache
    chunks = list(KNOWLEDGE_BASE)
    try:
        patterns = catalog.load(base_url)
        for pid, meta in patterns.items():
            chunks.append({
                "id": f"catalog-{pid}",
                "source": f"팀 mock-services /api/catalog ({meta.get('law') or '법조문 없음'})",
                "category": meta.get("ko", pid),
                "text": f"{meta.get('ko')} ({meta.get('en')}): {meta.get('desc')}",
                "pattern_id": pid,
            })
    except Exception:
        pass  # 서버 접속 불가 시 학술 지식베이스만으로도 동작
    _corpus_cache = chunks
    return chunks


@dataclass
class RetrievalResult:
    chunks: list[dict]
    method: str  # "embedding" | "keyword_fallback"


def retrieve(query: str, top_k: int = 3, base_url: str = "http://localhost:4000") -> RetrievalResult:
    """query와 가장 관련 있는 지식베이스+카탈로그 조각 top_k개를 반환."""
    corpus = _corpus(base_url)
    query_vec = _embed(query)

    if query_vec is not None:
        scored = []
        for chunk in corpus:
            chunk_vec = _embed(chunk["text"])
            if chunk_vec is None:
                continue
            scored.append((_cosine(query_vec, chunk_vec), chunk))
        if scored:
            scored.sort(key=lambda x: -x[0])
            return RetrievalResult(chunks=[c for _, c in scored[:top_k]], method="embedding")

    # 폴백: 임베딩 API에 도달할 수 없는 경우 (키 없음/네트워크 차단 등)
    scored = [(_keyword_overlap_score(query, c["text"] + " " + c["category"]), c) for c in corpus]
    scored.sort(key=lambda x: -x[0])
    return RetrievalResult(chunks=[c for _, c in scored[:top_k]], method="keyword_fallback")
