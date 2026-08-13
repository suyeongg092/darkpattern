#!/usr/bin/env node
// Guards the selectors agent/src/executors/* rely on.
//
//   node scripts/check-contract.js
//
// The executors still select by visible text (`a:has-text("해지하기")`), so any
// reword in a mock page breaks them silently — and worse, *adding* a second
// element containing the same text breaks them too, because Playwright's strict
// mode refuses to click an ambiguous match. Running Playwright here would cost a
// ~2GB browser download, so this checks the served HTML directly: every listed
// selector must match exactly one element.
//
// Run this after touching any mock page. When an executor is migrated to
// data-testid (see CONTRACT.md §3), move its row to TESTID_EXPECTATIONS.

const app = require("../src/server");

// (service path, tag, visible text) triples lifted from the executors.
const TEXT_EXPECTATIONS = [
  ["/ordernow-club/manage", "a", "멤버십 해지"],
  ["/ordernow-club/cancel/hub", "a", "해지하기"],
  ["/ordernow-club/cancel/value-reminder", "a", "그래도 해지할게요"],
  ["/ordernow-club/cancel/survey", "button", "다음"],
  ["/ordernow-club/cancel/confirm", "button", "해지 확정하기"],

  ["/supercart-plus/cancel/hub", "a", "멤버십 설정"],
  ["/supercart-plus/cancel", "button", "계속하기"],
  ["/supercart-plus/cancel/verify", "button", "확인"],
  ["/supercart-plus/cancel/confirm", "button", "완전 해지하기"],

  ["/primevault/cancel/step1", "a", "그래도 종료할게요"],
  ["/primevault/cancel/step2", "a", "완전히 종료할게요"],
  ["/primevault/cancel/step2b", "a", "할인도 필요 없어요"],
  ["/primevault/cancel/step3", "button", "혜택 종료하기"],

  ["/cloudstudio/cancel/hub", "a", "그래도 해지할게요"],
  ["/cloudstudio/cancel/downsell", "a", "완전히 해지할게요"],
  ["/cloudstudio/cancel", "button", "구독 해지하기"],
];

// (service path, input selector fragment) the executors check/fill by name.
const FIELD_EXPECTATIONS = [
  ["/ordernow-club/cancel/survey", 'input[value="price"]'],
  ["/supercart-plus/cancel", 'input[value="full_cancel"]'],
  ["/supercart-plus/cancel/verify", 'input[name="code"]'],
];

// Pages where agent/src/executors/base.js reads `page.$eval("form")`, so the
// first <form> in document order must be the one that submits the action.
const FIRST_FORM_EXPECTATIONS = [
  ["/ordernow-club/cancel/confirm", "/ordernow-club/cancel/confirm"],
  ["/supercart-plus/cancel/confirm", "/supercart-plus/cancel/confirm"],
  ["/primevault/cancel/step3", "/primevault/end-benefits"],
  ["/cloudstudio/cancel", "/cloudstudio/cancel/confirm"],
];

function countMatches(html, tag, text) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  let n = 0;
  for (const m of html.matchAll(re)) {
    if (m[1].replace(/<[^>]*>/g, "").includes(text)) n++;
  }
  return n;
}

async function main() {
  const server = await new Promise((r) => {
    const s = app.listen(0, "127.0.0.1", () => r(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (p) => fetch(base + p + "?uid=contract-check").then((r) => r.text());

  const failures = [];
  let checks = 0;

  for (const [path, tag, text] of TEXT_EXPECTATIONS) {
    const n = countMatches(await get(path), tag, text);
    checks++;
    if (n !== 1) {
      failures.push(
        `${path}  ${tag}:has-text("${text}")  → ${n}개 매칭` +
          (n === 0 ? " (문구가 바뀌었거나 사라짐)" : " (Playwright strict mode 위반 — 같은 문구가 여러 개)")
      );
    }
  }

  for (const [path, selector] of FIELD_EXPECTATIONS) {
    const attr = /\[(\w+)="([^"]+)"\]/.exec(selector);
    const html = await get(path);
    const re = new RegExp(`<input\\b[^>]*\\b${attr[1]}="${attr[2]}"`, "g");
    const n = [...html.matchAll(re)].length;
    checks++;
    if (n !== 1) failures.push(`${path}  ${selector}  → ${n}개 매칭`);
  }

  for (const [path, expectedAction] of FIRST_FORM_EXPECTATIONS) {
    const html = await get(path);
    const m = /<form\b[^>]*action="([^"]+)"/.exec(html);
    checks++;
    if (!m) failures.push(`${path}  <form>이 없음`);
    else if (m[1] !== expectedAction) {
      failures.push(`${path}  첫 <form>의 action이 ${m[1]} (기대: ${expectedAction})`);
    }
  }

  server.close();

  if (failures.length) {
    console.error(`✗ Agent 셀렉터 계약 위반 ${failures.length}건 / 검사 ${checks}건\n`);
    failures.forEach((f) => console.error("  " + f));
    console.error("\nagent/src/executors/* 가 깨집니다. 문구를 되돌리거나, 팀원1과 합의해 executor를 함께 고치세요.");
    process.exit(1);
  }
  console.log(`✓ Agent 셀렉터 계약 ${checks}건 모두 통과 (문구·필드·첫 form action)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
