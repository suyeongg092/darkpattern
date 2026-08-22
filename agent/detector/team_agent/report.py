"""
HTML 리포트 생성
-----------------
naive/rules/llm_rag 각 모드가 실제 팀 mock-services(OrderNow Club 등)를 어떻게
탐지하고, 어떤 후보를 왜 선택해서 클릭했고, 최종적으로 서버 상태 재조회로 해지가
검증됐는지를 스크린샷과 함께 한눈에 보여준다.
"""
from __future__ import annotations
import base64
from pathlib import Path

CSS = """
body { font-family: -apple-system, "Malgun Gothic", sans-serif; max-width: 980px; margin: 0 auto; padding: 24px; color: #1a1a1a; background:#fafafa; }
h1 { font-size: 22px; } h2 { font-size: 18px; margin-top: 40px; border-bottom: 2px solid #ddd; padding-bottom: 6px; }
h3 { font-size: 15px; margin-top: 24px; }
.mode-naive h3 { color: #b71c1c; } .mode-rules h3 { color: #1565c0; } .mode-llm_rag h3 { color: #4527a0; }
.badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:12px; margin-left:8px; }
.ok { background:#e8f5e9; color:#2e7d32; } .fail { background:#ffebee; color:#c62828; }
.step { border:1px solid #ddd; border-radius:8px; padding:12px; margin:10px 0; background:#fff; }
.step img { max-width:360px; border:1px solid #ccc; border-radius:4px; display:block; margin-top:8px; }
.reason { color:#555; font-size:13px; margin-top:4px; }
.det { display:block; background:#fff3e0; color:#e65100; border-radius:6px; padding:4px 8px; font-size:12px; margin:4px 0 0 0; border-left:3px solid #fb8c00; }
.det-reason { color:#8d5524; font-size:11px; margin-top:2px; }
table { border-collapse: collapse; font-size: 12px; margin-top:6px; }
td, th { border: 1px solid #ddd; padding: 3px 8px; text-align:left; }
.chosen { background:#e3f2fd; font-weight:700; }
pre.score { background:#111; color:#0f0; padding:14px; border-radius:8px; overflow-x:auto; font-size:12px; }
"""


def _img_data(path: str | None) -> str:
    if not path or not Path(path).exists():
        return ""
    b64 = base64.b64encode(Path(path).read_bytes()).decode()
    return f'<img src="data:image/png;base64,{b64}">'


def _step_html(s: dict) -> str:
    dets = "".join(
        f'<div class="det">⚠ {d["el"]} → <b>{d["pattern"]}</b>'
        + (f'<div class="det-reason">근거: {d["reason"]}</div>' if d.get("reason") else "")
        + "</div>"
        for d in s.get("detections", [])
    )
    table_rows = "".join(
        f'<tr class="{"chosen" if c["chosen"] else ""}"><td>{c["testid"]}</td><td>{c["text"]}</td><td>{c["area"]}px²</td></tr>'
        for c in s.get("candidates_table", [])
    )
    table = f'<table><tr><th>testid</th><th>텍스트</th><th>면적</th></tr>{table_rows}</table>' if table_rows else ""
    status = s.get("status_after") or {}
    return f"""<div class="step">
      <b>Step {s['step']}</b> — {s['path']}<br>
      {s['action']}
      {f'<div class="reason">판단 이유: {s["reasoning"]}</div>' if s.get('reasoning') else ''}
      {f'<div>{dets}</div>' if dets else ''}
      {table}
      <div class="reason">서버 상태 재조회: status={status.get('status')}{', note=' + status.get('note','') if status.get('note') else ''}</div>
      {_img_data(s.get('screenshot'))}
    </div>"""


def _variant_html(label: str, v: dict) -> str:
    badge = '<span class="badge ok">✅ 해지 성공</span>' if v["success"] else '<span class="badge fail">❌ 실패/붙잡힘</span>'
    steps_html = "".join(_step_html(s) for s in v["steps"])
    return f"<h4>{label} {badge} — {v['step_count']}단계, 최종 status={v['final_status'].get('status')}</h4>{steps_html}"


def build_report(service: str, all_results: dict, score_outputs: dict[str, str] | None = None) -> str:
    parts = [f"<h1>다크패턴 탐지+우회 에이전트 — {service}</h1>",
             "<p>각 모드가 실제 팀 mock-services를 어떻게 판단하고 클릭했는지, "
             "서버 상태 재조회로 검증한 최종 결과를 보여줍니다. "
             "<b>빨간 테두리</b>=이번에 클릭할 요소, <b>파란 점선</b>=다른 후보(비교용), "
             "<b>주황 테두리+⚠ 라벨</b>=이 블록을 다크패턴으로 판단한 곳(스크린샷 위에 직접 표시됨). "
             "주황 배지 밑의 '근거'는 어떤 규칙이 왜 발동했는지를 그대로 보여줍니다.</p>"]
    for mode, r in all_results.items():
        parts.append(f'<div class="mode-{mode}"><h2>모드: {mode}</h2>')
        parts.append(_variant_html("dark (시정 전)", r["dark"]))
        parts.append(_variant_html("clean (시정 후, 대조군)", r["clean"]))
        if r.get("flow_detections"):
            fd = "".join(f'<span class="det">flow: {d["pattern"]}</span>' for d in r["flow_detections"])
            parts.append(f"<div>플로우 단위 탐지: {fd}</div>")
        if score_outputs and mode in score_outputs:
            parts.append(f"<h4>score.js 채점 결과 ({mode})</h4><pre class='score'>{score_outputs[mode]}</pre>")
        parts.append("</div>")
    return f"<!doctype html><meta charset='utf-8'><title>{service} 리포트</title><style>{CSS}</style>{''.join(parts)}"
