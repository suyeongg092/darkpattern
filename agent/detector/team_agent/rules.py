"""
규칙 기반 폴백 (rule-based fallback)
------------------------------------
llm_judge.py가 OpenAI API에 도달하지 못할 때(네트워크 차단, 키 없음, 응답 오류) 자동으로
대체되는 경로. LLM 없이도 파이프라인이 죽지 않고 끝까지 동작함을 보장하기 위한 것이며,
정확도의 기준점이 아니다 — 실제 평가(precision/recall)는 OPENAI_API_KEY가 살아있는
환경(사용자 로컬)에서 LLM 판단으로 수행해야 의미가 있다.

키워드/명암비/시각적 크기 같은 얕은 신호만 쓰므로, LLM 판단보다 훨씬 단순하다.
"""
from __future__ import annotations
import re

CANCEL_INTENT_KEYWORDS = ["해지", "취소", "그만", "탈퇴", "떠나", "그래도", "종료", "완전"]
RETENTION_KEYWORDS = [
    "유지", "계속 이용", "혜택 유지", "계속하기", "받고 계속", "멤버십 유지",
    "일시중지", "일시 중지", "일시정지", "일시 정지", "보류", "변경", "다운그레이드", "베이직",
]
# 해지 키워드가 아직 안 보이는 홈 화면에서, "이 링크를 누르면 관리/계정 화면으로
# 들어간다"는 것만 감지하는 보조 신호 — 프로모션 배너 같은 무관한 후보보다 우선한다.
NAVIGATION_HINT_KEYWORDS = ["관리", "설정", "계정", "마이페이지", "내 정보", "멤버십"]
GUILT_TRIP_KEYWORDS = ["포기하시겠", "사라집니다", "아쉬워요", "놓치게", "즉시 사라"]
URGENCY_KEYWORDS = ["마감임박", "품절임박", "곧 종료", "얼마 남지"]
LOSS_FRAMING_RE = re.compile(r"지금까지.{0,20}(받았|혜택|이용)")


def classify_block(el: str, text: str, candidates: list[dict], min_contrast: float | None,
                    min_font_size: float | None) -> tuple[str | None, str]:
    """블록 텍스트/시각 신호만으로 그럴듯한 catalog 패턴 id 후보를 추정.
    반환값: (pattern_id 또는 None, 사람이 읽을 수 있는 판단 이유). 확신이 없으면
    (None, 이유) — "왜 다크패턴이 아니라고 봤는지"도 남겨서 화면에 보이게 한다."""
    t = text or ""

    hit = [k for k in GUILT_TRIP_KEYWORDS if k in t]
    if hit:
        return "confirmshaming", f"죄책감 유발 문구 감지: '{hit[0]}' 포함"
    m = LOSS_FRAMING_RE.search(t)
    if m:
        return "confirmshaming", f"손실 프레이밍 문구 감지: '{m.group(0)}' 패턴 일치"
    hit = [k for k in URGENCY_KEYWORDS if k in t]
    if hit:
        return "false_urgency", f"긴급성 유발 문구 감지: '{hit[0]}' 포함"
    if "필수" in t and ("설문" in t or "사유" in t or "이유" in t):
        return "forced_action", "'필수' + '설문'/'사유'/'이유' 동시 등장 → 강제 응답 요구로 판단"

    # 저대비/작은 글씨로 숨겨진 정보 — 화살표(›)나 배지 같은 자잘한 UI 텍스트까지
    # 잡지 않도록 기준을 엄격하게 잡는다 (그래도 얕은 휴리스틱이라 완벽하지 않음:
    # 진짜 평가는 llm_rag 모드로, 그것도 네트워크가 열린 환경에서 해야 함).
    if min_contrast is not None and min_contrast < 2.2 and min_font_size is not None and min_font_size <= 11:
        return "hidden_information", f"명암비 {min_contrast:.1f}(기준 2.2 미만) + 글자크기 {min_font_size:.0f}px(기준 11px 이하) → 숨겨진 정보로 판단"

    # 두 후보 버튼의 면적/굵기 차이가 크면 잘못된 계층구조로 추정
    clickable = [c for c in candidates if c.get("tag") in ("a", "button")]
    if len(clickable) >= 2:
        areas = sorted((c.get("area") or 0) for c in clickable)
        if areas[-1] > 0 and areas[0] / max(areas[-1], 1) < 0.35:
            keep_like = any(any(k in (c.get("text") or "") for k in RETENTION_KEYWORDS) for c in clickable)
            cancel_like = any(any(k in (c.get("text") or "") for k in CANCEL_INTENT_KEYWORDS) for c in clickable)
            if keep_like and cancel_like:
                ratio = round(areas[0] / max(areas[-1], 1) * 100)
                return "misleading_hierarchy", f"버튼 면적비 {ratio}%(작은 쪽/큰 쪽) — 잔류 유도 버튼이 훨씬 크고, 해지 버튼은 작게 배치됨"

    return None, "어떤 규칙에도 해당 안 됨 → 다크패턴 아님으로 판단"


def pick_navigation_candidate(candidates: list[dict]) -> tuple[dict | None, str]:
    """다음에 클릭할 후보를 규칙으로 고른다. (선택된 후보, 이유) 반환."""
    clickable = [c for c in candidates if c.get("tag") in ("a", "button") and c.get("type") != "submit-radio"]
    if not clickable:
        return None, "클릭 가능한 후보 없음"

    intent = [c for c in clickable if any(k in (c.get("text") or "") for k in CANCEL_INTENT_KEYWORDS)]
    retention = [c for c in clickable if any(k in (c.get("text") or "") for k in RETENTION_KEYWORDS)]
    if intent:
        # 해지 의도 키워드가 있는 후보 중, 잔류 키워드도 같이 섞인 건 제외
        pure_intent = [c for c in intent if c not in retention]
        chosen = (pure_intent or intent)[0]
        return chosen, f"텍스트에 해지 의도 키워드 포함: '{chosen.get('text')}'"

    non_retention = [c for c in clickable if c not in retention]
    pool = non_retention or clickable

    nav_hints = [c for c in pool if any(k in (c.get("text") or "") for k in NAVIGATION_HINT_KEYWORDS)]
    if nav_hints:
        chosen = nav_hints[0]
        return chosen, f"해지/잔류 키워드 없음 → 관리·계정 화면으로 이동하는 것으로 보이는 후보 선택: '{chosen.get('text')}'"

    chosen = min(pool, key=lambda c: c.get("area") or 0)
    return chosen, f"해지 키워드 없음 → 잔류 유도 키워드 없는 후보 중 시각적 비중이 가장 작은 것 선택: '{chosen.get('text')}'"
