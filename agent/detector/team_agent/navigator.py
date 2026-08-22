"""
내비게이터 (탐지 -> 판단 -> 클릭 -> 검증 오케스트레이션)
--------------------------------------------------------
CONTRACT.md의 [data-el]/[data-testid] 계약만으로 동작한다. 서비스별 하드코딩된
클릭 시퀀스(팀 agent/src/executors/*.js처럼 `page.click('a:has-text("해지하기")')`
같은 고정 셀렉터)를 전혀 쓰지 않는다 — 매 페이지마다 (1) 보이는 [data-el] 블록들을
다크패턴 후보로 판단하고, (2) 보이는 [data-testid] 후보들 중 "사용자의 진짜 목표
(해지)에 부합하는 것"을 판단해서 클릭한다. 이 두 판단 모두 mode에 따라 3갈래:

  - naive  : 다크패턴 판단 없음. 그냥 화면에서 시각적으로 가장 큰 버튼을 누른다
             (다크패턴에 특화되지 않은 일반 자동화가 어떻게 걸려드는지 보여주는 대조군).
  - rules  : rules.py의 키워드/명암비/면적비 휴리스틱으로 판단 (LLM 미사용).
  - llm_rag: llm_judge.py로 GPT + RAG 근거를 통해 판단. 실패하면(네트워크 차단 등)
             LLMJudgeError를 잡아서 그 스텝만 rules로 자동 대체하고 로그에 남긴다.

절대 화면 표시 문구를 신뢰하지 않는다 — 매 스텝 후 서버의 `/api/status`를 다시
조회해서 실제 구독 상태를 확인한다 (CONTRACT.md: "Agent의 사후 검증이 신뢰 소스로
쓰는 실제 구독 상태").
"""
from __future__ import annotations
import time
from dataclasses import dataclass, field

import requests

from . import extractor, rules
from . import llm_judge
from .llm_judge import LLMJudgeError

MAX_STEPS = 10


@dataclass
class StepLog:
    step: int
    path: str
    action: str
    reasoning: str
    detections: list[dict] = field(default_factory=list)
    candidates_table: list[dict] = field(default_factory=list)
    status_after: dict | None = None
    screenshot: str | None = None


@dataclass
class CrawlResult:
    service: str
    variant: str
    mode: str
    uid: str
    steps: list[dict]
    detections: list[dict]
    final_status: dict
    success: bool
    step_count: int


def _fetch_status(base_url: str, service: str, uid: str, variant: str) -> dict:
    # CONTRACT.md: 시정 후(clean)는 같은 계정의 다른 입구가 아니라 별도 상태 세계이므로,
    # variant를 안 실어 보내면 서버는 dark 쪽 상태(항상 active로 남아있음)를 돌려준다.
    params = {"uid": uid}
    if variant == "clean":
        params["variant"] = "clean"
    r = requests.get(f"{base_url}/{service}/api/status", params=params, timeout=5)
    r.raise_for_status()
    return r.json()


def _selector_for(c: dict) -> str:
    """testid가 있으면 그걸로, 없으면(예: testid 없는 라디오) name/value라는 구조적
    속성으로 요소를 특정한다 — 둘 다 화면 문구가 아니라 계약된/기능적 속성이다."""
    if c.get("testid"):
        return f'[data-testid="{c["testid"]}"]'
    if c.get("select_by") == "name" and c.get("name"):
        return f'input[name="{c["name"]}"]'
    if c.get("name") and c.get("value") is not None:
        return f'input[name="{c["name"]}"][value="{c["value"]}"]'
    raise ValueError(f"후보를 특정할 selector가 없음: {c}")


def _fill_value_for(c: dict) -> str:
    """필수 자유입력 텍스트필드에 채울 값을 만든다. pattern/inputmode/min·maxlength
    같은 HTML5 제약 조건만 보고 만족시키는 값을 생성한다 — 문구 내용 자체를 해석해서
    "정답"을 알아내려는 게 아니라, 그냥 진행을 막지 않기 위한 최소 입력이다."""
    numeric_hint = (c.get("inputmode") == "numeric" or c.get("input_type") in ("tel", "number")
                    or (c.get("pattern") and "0-9" in c["pattern"]))
    try:
        length = int(c.get("maxlength") or c.get("minlength") or (6 if numeric_hint else 4))
    except (TypeError, ValueError):
        length = 6 if numeric_hint else 4
    return ("1" * length) if numeric_hint else ("a" * length)


def _fill_required_text_inputs(page, candidates: list[dict], log_fn) -> None:
    free_text_types = ("text", "tel", "number", "email", None)
    for c in candidates:
        if c.get("tag") != "input" or c.get("input_type") not in free_text_types:
            continue
        if not c.get("required") or (c.get("value") or "") != "":
            continue
        value = _fill_value_for(c)
        page.locator(_selector_for(c)).first.fill(value)
        c["value"] = value
        log_fn(f"필수 입력란 채움: '{c.get('name') or c.get('testid')}' ← '{value}' "
               f"(내용 해석이 아니라 제출을 막지 않기 위한 형식적 최소 입력)")


def _radio_groups(candidates: list[dict]) -> dict:
    groups: dict = {}
    for c in candidates:
        if c.get("input_type") == "radio":
            groups.setdefault(c.get("name") or id(c), []).append(c)
    return groups


def _handle_required_inputs(page, candidates: list[dict], log_fn) -> None:
    """필수(required) 라디오/체크박스 그룹이 비어있으면, 최소 disclosure 옵션으로 하나
    선택해서 제출이 막히지 않게 한다 (다크패턴 판단과는 무관한 순수 진행 로직 — 라디오뿐
    아니라 체크박스도 포함)."""
    groups: dict[str, list[dict]] = {}
    for c in candidates:
        if c.get("input_type") in ("radio", "checkbox") and c.get("required"):
            groups.setdefault(c.get("name") or c.get("testid") or id(c), []).append(c)
    for name, opts in groups.items():
        if any(o.get("checked") for o in opts):
            continue
        # "기타" 류 옵션을 우선 선택 (특정 정보를 과다 노출하지 않는 최소 disclosure)
        chosen = next(
            (o for o in opts if "기타" in (o.get("text") or "") or "other" in (o.get("testid") or "").lower()),
            opts[-1],
        )
        page.locator(_selector_for(chosen)).first.check()
        log_fn(f"필수 항목 대응: '{chosen.get('text')}' 선택 (내용 자체는 해지 목표와 무관 — 진행을 막지 않기 위한 최소 응답)")


def _override_preselected_radios(page, candidates: list[dict], mode: str, log_fn) -> None:
    """사전선택(preselection) 다크패턴 대응: 라디오 그룹 안에 "해지 의도" 키워드에
    맞는 선택지가 있는데 이미 다른(=사업자에게 유리한) 선택지가 기본 선택돼 있으면,
    그 선택을 사용자의 진짜 목표(해지)에 맞게 바꾼다. `_handle_required_inputs`는
    "아무것도 안 골라진" 경우만 처리하기 때문에, 이미 뭔가(잘못된 것)가 선택된 경우는
    이 함수가 따로 봐야 한다. naive 모드는 다크패턴 판단을 아예 안 하므로 건드리지
    않는다 — 그래야 naive가 사전선택 함정에 실제로 걸리는 대조군 역할을 한다."""
    if mode == "naive":
        return
    for name, opts in _radio_groups(candidates).items():
        if len(opts) < 2:
            continue
        intent_opts = [o for o in opts if any(k in (o.get("text") or "") for k in rules.CANCEL_INTENT_KEYWORDS)]
        if not intent_opts:
            continue
        currently_checked = next((o for o in opts if o.get("checked")), None)
        target = intent_opts[0]
        if currently_checked is target or (currently_checked and currently_checked.get("value") == target.get("value")):
            continue
        page.locator(_selector_for(target)).first.check()
        # DOM은 바뀌었지만 이 함수가 넘겨받은 파이썬 쪽 candidates 스냅샷은 그대로라,
        # 뒤이어 도는 _handle_required_inputs가 "아직 아무것도 안 골라짐"으로 잘못 보고
        # 방금 바꾼 걸 다시 덮어쓸 수 있다 — 그래서 스냅샷도 같이 갱신해둔다.
        for o in opts:
            o["checked"] = (o is target)
        prev = currently_checked.get("text") if currently_checked else "(선택 없음)"
        log_fn(f"사전선택 의심: 기본값 '{prev}' 대신 해지 의도에 맞는 '{target.get('text')}'로 선택 변경")


def _classify_blocks(raw: dict, service: str, path: str, variant: str, mode: str, base_url: str,
                      audit: list[dict]) -> list[dict]:
    detections = []
    for b in raw["blocks"]:
        if len(b["text"]) < 4:
            continue
        pattern_id = None
        reasoning = ""
        used_mode = mode
        if mode == "llm_rag":
            try:
                j = llm_judge.judge_block(b["el"], b["text"], base_url)
                pattern_id = j.pattern_id if j.is_dark_pattern else None
                reasoning = j.reasoning
                audit.append({"el": b["el"], "mode": "llm_rag", "pattern": pattern_id,
                               "reasoning": reasoning, "citations": [c["source"] for c in j.citations]})
            except LLMJudgeError as e:
                used_mode = "rules(llm-fallback)"
                pattern_id, rule_reason = rules.classify_block(b["el"], b["text"], b["candidates"], b["min_contrast"], b["min_font_size"])
                reasoning = f"[LLM 실패로 규칙 기반 대체: {e}] {rule_reason}"
                audit.append({"el": b["el"], "mode": used_mode, "pattern": pattern_id, "reasoning": reasoning})
        elif mode == "rules":
            pattern_id, reasoning = rules.classify_block(b["el"], b["text"], b["candidates"], b["min_contrast"], b["min_font_size"])
            audit.append({"el": b["el"], "mode": "rules", "pattern": pattern_id, "reasoning": reasoning})
        # naive 모드는 다크패턴 판단 자체를 하지 않음

        if pattern_id:
            detections.append({
                "service": service, "path": path, "variant": variant,
                "el": b["el"], "pattern": pattern_id,
                # "reason"은 CONTRACT.md 채점 형식에 없는 추가 필드라 score.js는 무시하지만,
                # report.py가 "왜 이 블록을 다크패턴으로 판단했는지"를 화면에 보여줄 때 씀.
                "reason": reasoning,
            })
    return detections


def _pick_candidate(candidates: list[dict], page_text: str, mode: str, base_url: str, audit: list[dict]):
    nav_candidates = [c for c in candidates if c.get("tag") in ("a", "button")]
    if not nav_candidates:
        return None, "클릭 가능한 링크/버튼 없음", mode

    if mode == "naive":
        chosen = max(nav_candidates, key=lambda c: c.get("area") or 0)
        return chosen, f"(다크패턴 판단 없음) 화면에서 시각적으로 가장 큰 요소 선택: '{chosen.get('text')}'", mode

    if mode == "llm_rag":
        try:
            j = llm_judge.judge_navigation(nav_candidates, page_text, base_url)
            chosen = next(c for c in nav_candidates if c["testid"] == j.selected_testid)
            audit.append({"nav": True, "mode": "llm_rag", "selected": j.selected_testid,
                          "reasoning": j.reasoning, "citations": [c["source"] for c in j.citations]})
            return chosen, j.reasoning, "llm_rag"
        except LLMJudgeError as e:
            chosen, reason = rules.pick_navigation_candidate(nav_candidates)
            audit.append({"nav": True, "mode": "rules(llm-fallback)", "reasoning": f"[LLM 실패: {e}] {reason}"})
            return chosen, f"[LLM 실패로 규칙 기반 대체: {e}] {reason}", "rules(llm-fallback)"

    # rules
    chosen, reason = rules.pick_navigation_candidate(nav_candidates)
    return chosen, reason, "rules"


_HIGHLIGHT_JS = """({testid, detections}) => {
  document.querySelectorAll('[data-el]').forEach(el => { el.style.outline = ''; });
  document.querySelectorAll('[data-testid]').forEach(el => {
    el.style.outline = el.getAttribute('data-testid') === testid
      ? '3px solid #e53935' : '2px dashed #1e88e5';
    el.style.outlineOffset = '2px';
  });
  // 이번 페이지에서 다크패턴으로 판단된 [data-el] 블록은 주황색 테두리 + 유형 이름
  // 라벨을 스크린샷 위에 직접 붙인다 — "탐지했다"는 걸 텍스트 목록이 아니라
  // 화면 자체에서 보여주기 위함.
  document.querySelectorAll('.__dp_label').forEach(n => n.remove());
  (detections || []).forEach(d => {
    const el = document.querySelector(`[data-el="${d.el}"]`);
    if (!el) return;
    el.style.outline = '3px solid #fb8c00';
    el.style.outlineOffset = '2px';
    const rect = el.getBoundingClientRect();
    const label = document.createElement('div');
    label.className = '__dp_label';
    label.textContent = '⚠ ' + d.pattern;
    label.style.cssText = `position:fixed; top:${Math.max(rect.top - 20, 0)}px; left:${Math.max(rect.left, 0)}px; ` +
      `background:#fb8c00; color:#fff; font-size:11px; font-family:sans-serif; font-weight:bold; ` +
      `padding:1px 6px; border-radius:4px; z-index:999999; white-space:nowrap; pointer-events:none;`;
    document.body.appendChild(label);
  });
}"""
_UNHIGHLIGHT_JS = """() => {
  document.querySelectorAll('[data-testid]').forEach(el => { el.style.outline = ''; });
  document.querySelectorAll('[data-el]').forEach(el => { el.style.outline = ''; });
  document.querySelectorAll('.__dp_label').forEach(n => n.remove());
}"""


def crawl(page, base_url: str, service: str, uid: str, variant: str, mode: str,
          attack: bool = False, start_path: str = "/manage", demo_pause: float = 0.0,
          shot_dir=None) -> CrawlResult:
    q = {"uid": uid}
    if variant == "clean":
        q["variant"] = "clean"
    if attack:
        q["attack"] = "1"
    qs = "&".join(f"{k}={v}" for k, v in q.items())

    # 페이지 자체가 자바스크립트 에러로 죽는 경우를 놓치지 않도록, 브라우저 콘솔
    # 에러/예외를 전부 수집해둔다 — [data-el]/[data-testid]가 끝내 하나도 안 뜨는
    # 상황이 "느려서"가 아니라 "그 페이지가 실제로 깨져서"일 수 있기 때문.
    console_errors: list[str] = []
    page.on("console", lambda msg: console_errors.append(f"[console.{msg.type}] {msg.text}")
            if msg.type in ("error", "warning") else None)
    page.on("pageerror", lambda exc: console_errors.append(f"[pageerror] {exc}"))
    page.on("requestfailed", lambda req: console_errors.append(
        f"[requestfailed] {req.method} {req.url} — {req.failure}"))
    # 브라우저 콘솔에 뜨는 "Failed to load resource: 404" 메시지 자체는 어떤 URL이
    # 404인지 안 담고 있으므로, 실제 HTTP 응답을 직접 봐서 어떤 요청이 4xx/5xx인지
    # (요청 URL까지) 정확히 잡아낸다 — 이게 진짜 원인 파악에 필요한 정보.
    page.on("response", lambda res: console_errors.append(
        f"[response {res.status}] {res.request.method} {res.url}") if res.status >= 400 else None)

    page.goto(f"{base_url}/{service}{start_path}?{qs}")
    page.wait_for_load_state("networkidle")
    content_ready = True
    try:
        # 드물게(주로 로컬 첫 실행 시 서버/브라우저가 아직 워밍업 중일 때) networkidle이
        # 됐는데도 [data-el]/[data-testid]가 아직 안 그려진 순간이 있다 — 한 번 더
        # 짧게 기다려서 실제로 콘텐츠가 뜬 뒤에 읽기 시작하도록 방어한다.
        page.wait_for_selector("[data-el], [data-testid]", timeout=5000)
    except Exception:
        try:
            page.reload()
            page.wait_for_load_state("networkidle")
            page.wait_for_selector("[data-el], [data-testid]", timeout=8000)
        except Exception:
            # 재시도까지 실패하면, 여기서 죽지 않고 계속 진행한다 — 그래야 아래
            # extractor가 "후보 없음"으로 정상적으로 처리하고, 그 순간의 화면과
            # 지금까지 잡힌 콘솔 에러를 스크린샷/로그로 남길 수 있다.
            content_ready = False
            print(f"  ⚠ [{service}/{variant}] 페이지 콘텐츠가 끝내 안 뜸. "
                  f"수집된 콘솔/네트워크 에러 {len(console_errors)}건:")
            for e in console_errors[-10:]:
                print(f"      {e}")
            if not console_errors:
                print("      (콘솔 에러 없음 — 화면 자체는 정상 응답했는데 [data-el]/[data-testid]가 없는 상태)")

    steps: list[dict] = []
    all_detections: list[dict] = []
    audit: list[dict] = []
    entered_cancel_flow = False

    for step_i in range(1, MAX_STEPS + 1):
        if demo_pause:
            time.sleep(demo_pause)
        raw = extractor.extract(page)
        full_path = raw["path"]
        # CONTRACT.md의 정답표는 서비스 접두어 없는 경로(예: "/manage")를 쓰므로
        # detections에도 같은 형식으로 맞춘다.
        path = full_path[len(f"/{service}"):] if full_path.startswith(f"/{service}") else full_path
        page_text = " / ".join(b["text"][:100] for b in raw["blocks"] if b["text"])

        step_audit: list[dict] = []
        detections = _classify_blocks(raw, service, path, variant, mode, base_url, step_audit)
        all_detections.extend(detections)

        candidates = extractor.all_candidates(raw)
        _override_preselected_radios(page, candidates, mode, lambda msg: step_audit.append({"note": msg}))
        _handle_required_inputs(page, candidates, lambda msg: step_audit.append({"note": msg}))
        _fill_required_text_inputs(page, candidates, lambda msg: step_audit.append({"note": msg}))

        chosen, reasoning, used_mode = _pick_candidate(candidates, page_text, mode, base_url, step_audit)

        candidates_table = [
            {"testid": c["testid"], "text": c.get("text"), "area": round(c.get("area") or 0),
             "chosen": bool(chosen and c["testid"] == chosen["testid"])}
            for c in candidates if c.get("tag") in ("a", "button")
        ]

        if chosen is None:
            # 클릭 후보가 하나도 없는 실패 상황도 "왜 막혔는지" 눈으로 볼 수 있어야
            # 하므로, 그냥 중단하지 않고 그 순간의 화면을 스크린샷으로 남긴다.
            fail_shot = None
            if shot_dir is not None:
                shot_dir.mkdir(parents=True, exist_ok=True)
                page.evaluate(_HIGHLIGHT_JS, {"testid": "", "detections": detections})
                fail_shot = shot_dir / f"{variant}-{step_i:02d}-실패.png"
                page.screenshot(path=str(fail_shot))
                page.evaluate(_UNHIGHLIGHT_JS)
            status = _fetch_status(base_url, service, uid, variant)
            steps.append(StepLog(step_i, path, "중단 (클릭 가능한 후보 없음)", reasoning,
                                  detections, candidates_table, status,
                                  str(fail_shot) if fail_shot else None).__dict__)
            break

        selector = _selector_for(chosen)

        shot_path = None
        if shot_dir is not None:
            shot_dir.mkdir(parents=True, exist_ok=True)
            # 결정 버튼이 sticky 하단 바 등 화면 아래쪽에 있는 경우가 많으므로,
            # 뷰포트 스크린샷이 실제로 클릭 대상을 보여주도록 먼저 스크롤한다.
            page.locator(selector).first.scroll_into_view_if_needed()
            highlight_key = chosen.get("testid") or ""
            page.evaluate(_HIGHLIGHT_JS, {"testid": highlight_key, "detections": detections})
            shot_path = shot_dir / f"{variant}-{step_i:02d}.png"
            page.screenshot(path=str(shot_path))
            page.evaluate(_UNHIGHLIGHT_JS)

        if demo_pause:
            page.locator(selector).first.hover()
            time.sleep(demo_pause)
        page.locator(selector).first.click()
        page.wait_for_load_state("networkidle")

        status = _fetch_status(base_url, service, uid, variant)
        steps.append(StepLog(
            step_i, path, f"클릭: {chosen['testid']} (\"{chosen.get('text')}\")  [{used_mode}]",
            reasoning, detections, candidates_table, status,
            str(shot_path) if shot_path else None,
        ).__dict__)

        # ReadWell처럼 "정기결제 해지(다음 결제일까지 이용 후 종료)"가 별도 최종
        # 상태(scheduled)로 남는 서비스도 있다 — cancelled와 마찬가지로 성공.
        if status.get("status") in ("cancelled", "scheduled"):
            return CrawlResult(service, variant, mode, uid, steps, all_detections, status, True, step_i)

        # 서비스마다 홈에서 실제 해지 화면(/cancel*)까지 가는 홉 수가 다르므로
        # (예: OrderNow는 /manage에서 바로 시작, SuperCart/PrimeVault/CloudStudio는
        # 홈에서 한 번 더 눌러야 함) "아직 /cancel에 도달 못 함"과 "/cancel에 도달했다가
        # 만류에 낚여서 이탈함"을 구분해야 한다 — 전자는 정상 진행 중, 후자만 진짜 붙잡힘.
        new_path = page.evaluate("() => location.pathname")
        if "/cancel" in new_path:
            entered_cancel_flow = True
        elif entered_cancel_flow:
            return CrawlResult(service, variant, mode, uid, steps, all_detections, status, False, step_i)

    status = _fetch_status(base_url, service, uid, variant)
    return CrawlResult(service, variant, mode, uid, steps, all_detections, status,
                        status.get("status") in ("cancelled", "scheduled"), len(steps))


def bootstrap_signup(page, base_url: str, service: str, uid: str, variant: str,
                      base_detections: list[dict], demo_pause: float = 0.0, max_steps: int = 6) -> None:
    """StreamNow처럼 uid가 아직 미가입(status: none) 상태로 시작하는 서비스는, 해지
    플로우를 시험하기 전에 먼저 가입을 마쳐야 한다. 이건 "다크패턴을 피해가는" 시험이
    아니라(가입 자체를 방해할 이유가 없다) 순수한 준비 단계이므로, 필수 항목만 채우고
    "제출/시작/다음"류 후보를 골라 진행한다 — 그래도 지나가는 [data-el] 블록은 그대로
    분류해서 base_detections에 담는다 (가입 화면에도 정답 라벨이 있기 때문)."""
    q = {"uid": uid}
    if variant == "clean":
        q["variant"] = "clean"
    qs = "&".join(f"{k}={v}" for k, v in q.items())
    page.goto(f"{base_url}/{service}/signup?{qs}")
    page.wait_for_load_state("networkidle")

    submit_words = ["시작", "가입", "다음", "확인", "제출", "동의"]
    for step_i in range(1, max_steps + 1):
        if demo_pause:
            time.sleep(demo_pause)
        raw = extractor.extract(page)
        full_path = raw["path"]
        path = full_path[len(f"/{service}"):] if full_path.startswith(f"/{service}") else full_path
        if path.startswith("/signup/done") or not raw["blocks"] and not raw.get("page_candidates"):
            print(f"  [가입 {step_i}] {path} — 완료 화면 도달 또는 더 이상 콘텐츠 없음, 가입 종료")
            break
        base_detections.extend(_classify_blocks(raw, service, path, variant, "rules", base_url, []))

        candidates = extractor.all_candidates(raw)
        _handle_required_inputs(page, candidates, lambda msg: print(f"  [가입 {step_i}] {msg}"))
        # 이메일/비밀번호 같은 필수 자유입력 텍스트칸도 채워야 "가입하기" 버튼이
        # 실제로 눌린다 — 이게 빠져 있으면 브라우저가 조용히 제출을 막아서, 겉보기엔
        # 클릭이 된 것처럼 보여도 페이지가 안 넘어가는 무한루프가 생긴다.
        _fill_required_text_inputs(page, candidates, lambda msg: print(f"  [가입 {step_i}] {msg}"))

        nav_candidates = [c for c in candidates if c.get("tag") in ("a", "button")]
        if not nav_candidates:
            print(f"  [가입 {step_i}] {path} — 클릭 가능한 후보 없음, 가입 중단")
            break
        chosen = next((c for c in nav_candidates if any(w in (c.get("text") or "") for w in submit_words)),
                      nav_candidates[0])
        print(f"  [가입 {step_i}] {path} 클릭: {chosen.get('testid')} (\"{chosen.get('text')}\")")
        page.locator(_selector_for(chosen)).first.click()
        page.wait_for_load_state("networkidle")
        new_path = page.evaluate("() => location.pathname")
        if "/signup" not in new_path:
            print(f"  [가입 완료] {new_path}(으)로 이동 — 본 크롤링 시작")
            break
