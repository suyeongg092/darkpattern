#!/usr/bin/env python3
"""
CLI: python3 -m team_agent.run <service> [--mode naive|rules|llm_rag|all] [--uid demo1]
     [--attack] [--demo] [--headless]

한 서비스에 대해 dark/clean 두 변형을 모두 크롤링해서:
  1. 탐지: CONTRACT.md 5절 형식으로 detections.json 작성 (mock-services/scripts/score.js로 채점 가능)
  2. 우회+해지: [data-el]/[data-testid] 계약만으로 동적으로 클릭해서 실제 해지까지 시도
  3. 검증: 화면 문구를 신뢰하지 않고 /api/status를 다시 조회해서 실제 해지 여부 확인

llm_rag 모드가 실제 LLM 판단을 쓰려면 실행 전에 OpenAI API 키를 환경변수로 설정하세요.
    export OPENAI_API_KEY=sk-...
키가 없거나 네트워크가 막혀 있으면 llm_rag 모드는 매 판단마다 "llm-fallback" 로그를
남기고 자동으로 규칙 기반(rules)과 동일하게 동작합니다 (에러로 죽지 않습니다).
"""
from __future__ import annotations
import argparse
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

import subprocess

from . import navigator, rules, report

BASE_URL = "http://localhost:4000"
ALL_MODES = ("naive", "rules", "llm_rag")

# 서비스마다 "해지 진입 지점"이 다르다 — OrderNow Club만 "내 정보" 화면이 곧 관리
# 화면이라 /manage에서 시작하고, 나머지는 전부 홈("/")에 관리/해지로 가는 링크가
# 있다. 하드코딩된 클릭 시퀀스는 아니고, 그냥 "어디서부터 화면을 읽기 시작할지"
# 만 다르다 — 그 이후 판단/클릭은 여전히 매 페이지 동적으로 이뤄진다.
START_PATHS = {"ordernow-club": "/manage"}
NEEDS_SIGNUP_BOOTSTRAP = {"streamnow"}  # uid가 미가입(status: none) 상태로 시작하는 서비스


def run_variant(service: str, mode: str, variant: str, uid: str, attack: bool,
                 headless: bool, slow_mo: int, demo_pause: float, shot_dir=None):
    start_path = START_PATHS.get(service, "/")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless, slow_mo=slow_mo)
        page = browser.new_page(viewport={"width": 480, "height": 640})
        bootstrap_detections: list[dict] = []
        if service in NEEDS_SIGNUP_BOOTSTRAP:
            navigator.bootstrap_signup(page, BASE_URL, service, uid, variant,
                                        bootstrap_detections, demo_pause=demo_pause)
        result = navigator.crawl(page, BASE_URL, service, uid, variant, mode,
                                  attack=attack, start_path=start_path,
                                  demo_pause=demo_pause, shot_dir=shot_dir)
        browser.close()
    result.detections = bootstrap_detections + result.detections
    return result


def flow_level_detections(service: str, variant: str, dark_result, clean_result) -> list[dict]:
    """단일 페이지 DOM만으로는 판정 불가능한 플로우 단위 패턴(취소·탈퇴 방해/반복간섭)을
    두 변형의 실제 크롤링 결과(단계 수/리텐션 노출 횟수)로 구조적으로 추정."""
    if variant != "dark":
        return []
    out = []
    if dark_result.step_count > clean_result.step_count:
        out.append({"service": service, "flow": "cancel", "variant": "dark", "pattern": "cancel_obstruction"})

    retention_hits = 0
    for step in dark_result.steps:
        for c in step.get("candidates_table", []):
            if any(k in (c.get("text") or "") for k in rules.RETENTION_KEYWORDS):
                retention_hits += 1
                break
    if retention_hits >= 2:
        out.append({"service": service, "flow": "cancel", "variant": "dark", "pattern": "nagging"})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("service")
    ap.add_argument("--mode", default="llm_rag",
                     help="쉼표로 여러 모드 지정 가능 (예: naive,rules). 'all'은 naive,rules,llm_rag 전부.")
    ap.add_argument("--uid", default=f"demo-{int(time.time())}")
    ap.add_argument("--attack", action="store_true")
    ap.add_argument("--demo", action="store_true")
    ap.add_argument("--headed", action="store_true")
    ap.add_argument("--pause", type=float, default=None,
                     help="--demo일 때 각 단계 사이 멈추는 시간(초). 기본 1초, 천천히 보고 싶으면 3~4로 늘리세요.")
    args = ap.parse_args()

    headless = not (args.demo or args.headed)
    slow_mo = 350 if args.demo else 0
    demo_pause = (args.pause if args.pause is not None else 1.0) if args.demo else 0.0

    if args.mode == "all":
        modes = list(ALL_MODES)
    else:
        modes = [m.strip() for m in args.mode.split(",") if m.strip()]
        bad = [m for m in modes if m not in ALL_MODES]
        if bad:
            ap.error(f"알 수 없는 모드: {bad} (선택 가능: {ALL_MODES}, 또는 all)")

    all_results = {}
    out_paths = []
    Path("logs").mkdir(exist_ok=True)

    for mode in modes:
        print(f"\n{'='*60}\n모드: {mode}\n{'='*60}")
        shot_dir = Path(f"screenshots/{args.service}/{mode}")
        dark = run_variant(args.service, mode, "dark", f"{args.uid}-{mode}-dark", args.attack,
                            headless, slow_mo, demo_pause, shot_dir=shot_dir)
        for s in dark.steps:
            print(f"  [dark {s['step']}] {s['action']}")
            if s["reasoning"]:
                print(f"      이유: {s['reasoning']}")
        print(f"  dark  최종 판정: {'✅ 해지 성공' if dark.success else '❌ 실패/붙잡힘'} "
              f"({dark.step_count}단계, status={dark.final_status.get('status')})")

        clean = run_variant(args.service, mode, "clean", f"{args.uid}-{mode}-clean", args.attack,
                             headless, slow_mo, demo_pause, shot_dir=shot_dir)
        print(f"  clean 최종 판정: {'✅ 해지 성공' if clean.success else '❌ 실패/붙잡힘'} "
              f"({clean.step_count}단계, status={clean.final_status.get('status')})")
        clean_fp = len(clean.detections)
        print(f"  clean(대조군) 화면에서 보고된 탐지 수(=오탐이어야 정상): {clean_fp}")

        flow_dets = flow_level_detections(args.service, "dark", dark, clean)

        all_results[mode] = {
            "dark": {"steps": dark.steps, "detections": dark.detections,
                     "final_status": dark.final_status, "success": dark.success,
                     "step_count": dark.step_count},
            "clean": {"steps": clean.steps, "detections": clean.detections,
                      "final_status": clean.final_status, "success": clean.success,
                      "step_count": clean.step_count},
            "flow_detections": flow_dets,
        }
        mode_detections = list(dark.detections) + list(clean.detections) + list(flow_dets)
        out_path = Path(f"detections_{args.service}_{mode}.json")
        out_path.write_text(json.dumps({
            "detector": f"team-agent-{mode}-v1",
            "detections": mode_detections,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        out_paths.append((mode, out_path))

    ts = time.strftime("%Y%m%d_%H%M%S")
    Path(f"logs/run_{args.service}_{ts}.json").write_text(
        json.dumps(all_results, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n탐지 결과(CONTRACT §5 형식, 모드별 파일):")
    score_outputs = {}
    mock_services_dir = Path(__file__).resolve().parents[2] / "teammate-darkpattern" / "mock-services"
    for mode, p in out_paths:
        print(f"  {p.resolve()}")
        cmd = ["node", "scripts/score.js", str(p.resolve())]
        print(f"    채점: cd {mock_services_dir} && {' '.join(cmd)}")
        if mock_services_dir.exists():
            try:
                proc = subprocess.run(cmd, cwd=mock_services_dir, capture_output=True, text=True, timeout=30)
                score_outputs[mode] = proc.stdout or proc.stderr
            except Exception as e:
                score_outputs[mode] = f"(채점 자동 실행 실패: {e})"

    report_html = report.build_report(args.service, all_results, score_outputs)
    report_path = Path(f"report_{args.service}.html")
    report_path.write_text(report_html, encoding="utf-8")
    print(f"\n시각 리포트: {report_path.resolve()}")


if __name__ == "__main__":
    main()
