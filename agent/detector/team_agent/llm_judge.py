"""
LLM 판단(LLM Judge) 레이어
---------------------------
rules.py의 키워드/명암비 휴리스틱 대신, 실제 LLM(GPT)에게 판단을 맡긴다. rag.py로
관련 근거(논문/공정위 법조문 정의)를 먼저 검색해서 프롬프트에 넣어준 뒤(RAG),
"이 블록이 다크패턴인지 / catalog의 어떤 유형인지 / 다음에 어떤 요소를 클릭해야
사용자의 진짜 목표(해지)를 이루는지"를 구조화된 JSON으로 답하게 한다.

패턴 유형은 반드시 catalog.py가 서버에서 받아온 실제 pattern id 목록 중 하나(또는
none)여야 한다 — CONTRACT.md 5절: "pattern은 /api/catalog의 키 중 하나여야 한다".
LLM이 목록에 없는 id를 지어내면 검증에서 걸러지고 rules.py 폴백으로 넘어간다.

실패 대응: 네트워크 차단, API 키 없음/오류, 응답 JSON 파싱 실패, 잘못된 pattern id
등 무엇이든 발생하면 예외를 삼키지 않고 LLMJudgeError로 표준화해서 올려보낸다 —
호출부(navigator.py)가 이걸 잡아서 규칙 기반(rules.py)으로 자동 대체하고, 왜
대체됐는지를 로그에 남긴다 (DoNotPay 사례처럼 실패를 숨기지 않는다는 프로젝트 원칙).
"""
from __future__ import annotations
import json
import os
from dataclasses import dataclass, field

from . import rag, catalog

CHAT_MODEL = "gpt-4o-mini"


class LLMJudgeError(Exception):
    pass


@dataclass
class BlockJudgment:
    is_dark_pattern: bool
    pattern_id: str | None
    reasoning: str
    citations: list[dict] = field(default_factory=list)
    retrieval_method: str = "embedding"


@dataclass
class NavJudgment:
    selected_testid: str
    reasoning: str
    citations: list[dict] = field(default_factory=list)
    retrieval_method: str = "embedding"


def _get_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise LLMJudgeError("OPENAI_API_KEY 환경변수가 설정되지 않음")
    try:
        from openai import OpenAI
    except ImportError as e:
        raise LLMJudgeError(f"openai 패키지가 설치되지 않음: {e}")
    return OpenAI(api_key=api_key)


def _call_llm(system_prompt: str, user_prompt: str) -> dict:
    client = _get_client()
    try:
        resp = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=500,
        )
    except Exception as e:
        raise LLMJudgeError(f"OpenAI API 호출 실패: {e}") from e
    try:
        return json.loads(resp.choices[0].message.content)
    except Exception as e:
        raise LLMJudgeError(f"LLM 응답 JSON 파싱 실패: {e}") from e


def judge_block(el: str, text: str, base_url: str) -> BlockJudgment:
    """페이지의 [data-el] 블록 하나가 다크패턴인지, catalog의 어떤 유형인지 판단."""
    ids = catalog.pattern_ids(base_url)
    retrieval = rag.retrieve(f"UI 블록 문구: {text}", top_k=3, base_url=base_url)
    citation_block = "\n".join(f"- [{c['source']}] {c['category']}: {c['text']}" for c in retrieval.chunks)

    system_prompt = f"""당신은 웹페이지의 다크패턴을 탐지하는 감사관입니다. 사용자의 실제 \
목표는 항상 '이 구독을 실제로 해지하는 것'입니다. 반드시 아래 유형 id 목록 중 하나만 \
pattern_id로 답하거나, 다크패턴이 아니면 null로 답하세요 — 목록에 없는 이름을 지어내면 \
안 됩니다.
유형 id 목록: {', '.join(ids)}

근거에 없는 내용을 지어내지 말고, 검색된 근거와 블록 문구만으로 판단할 수 없으면
is_dark_pattern을 false로 답하세요. 반드시 아래 JSON 스키마로만 답하세요:
{{"is_dark_pattern": true/false, "pattern_id": "목록 중 하나 또는 null", "reasoning": "1~2문장, 어떤 근거를 근거로 삼았는지 포함"}}"""

    user_prompt = f"""[검색된 근거]
{citation_block}

[UI 블록]
data-el: {el}
텍스트 내용: "{text[:800]}"

이 블록이 다크패턴인지, 다크패턴이라면 위 목록 중 어떤 유형인지 판단하세요."""

    data = _call_llm(system_prompt, user_prompt)
    pattern_id = data.get("pattern_id")
    if pattern_id not in ids:
        pattern_id = None
    is_dark = bool(data.get("is_dark_pattern")) and pattern_id is not None
    return BlockJudgment(
        is_dark_pattern=is_dark,
        pattern_id=pattern_id,
        reasoning=data.get("reasoning", ""),
        citations=retrieval.chunks,
        retrieval_method=retrieval.method,
    )


def judge_navigation(candidates: list[dict], page_text: str, base_url: str) -> NavJudgment:
    """페이지의 클릭 가능 후보들 중, 사용자의 진짜 목표(해지)에 부합하는 것을 선택."""
    cand_desc = "\n".join(
        f"- testid=\"{c['testid']}\" text=\"{c.get('text','')}\" tag={c.get('tag')} "
        f"면적={round(c.get('area') or 0)}px² 폰트굵기={c.get('font_weight')}"
        for c in candidates
    )
    query = f"해지 플로우 페이지, 선택지: {page_text[:200]}"
    retrieval = rag.retrieve(query, top_k=2, base_url=base_url)
    citation_block = "\n".join(f"- [{c['source']}] {c['category']}: {c['text']}" for c in retrieval.chunks)

    system_prompt = """당신은 다크패턴을 우회해 구독 해지를 완수해야 하는 에이전트입니다. \
사용자의 실제 목표는 '이 구독을 실제로 해지하는 것'이며, 화면에 큰 색상 버튼으로 강조된 \
선택지가 리텐션(잔류 유도) 미끼일 수 있음을 항상 의심하세요. 주어진 testid 후보 중 정확히 \
하나를 선택하세요. 반드시 아래 JSON 스키마로만 답하세요:
{"selected_testid": "후보 중 하나의 testid 값", "reasoning": "왜 이것이 해지 목표에 부합하는지 1~2문장"}"""

    user_prompt = f"""[검색된 근거]
{citation_block}

[페이지 본문 요약]
{page_text[:400]}

[클릭 가능 후보]
{cand_desc}

해지라는 목표를 달성하기 위해 다음에 클릭해야 할 testid를 선택하세요."""

    data = _call_llm(system_prompt, user_prompt)
    selected = data.get("selected_testid")
    valid_ids = {c["testid"] for c in candidates}
    if selected not in valid_ids:
        raise LLMJudgeError(f"LLM이 존재하지 않는 testid를 선택함: {selected}")
    return NavJudgment(
        selected_testid=selected,
        reasoning=data.get("reasoning", ""),
        citations=retrieval.chunks,
        retrieval_method=retrieval.method,
    )
