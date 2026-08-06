// CLI: node src/run.js <service> [uid] [--attack] [--headless]
//
// Drives one cancellation flow end-to-end through the integrity pipeline:
// policy draft -> pre-execution status snapshot -> DOM pre-check -> one-time
// token -> submit -> post-execution status re-check -> verdict.

const fs = require("fs");
const { chromium } = require("playwright");
const { draftPolicy } = require("./policy");
const { checkBeforeSubmit, checkAfterExecution } = require("./policyEngine");
const { issueToken, redeemToken } = require("./token");
const { injectCursor } = require("./executors/base");

const MOCK_BASE = process.env.MOCK_BASE_URL || "http://localhost:4000";

const EXECUTORS = {
  "ordernow-club": require("./executors/ordernowClub"),
  "supercart-plus": require("./executors/superCartPlus"),
  primevault: require("./executors/primeVault"),
  cloudstudio: require("./executors/cloudStudio"),
};

const logs = [];

function log(step, detail) {
  const at = new Date().toISOString();
  logs.push({ at, step, detail: detail || null });
  console.log(detail ? `[${at}] ${step} — ${detail}` : `[${at}] ${step}`);
}

async function fetchStatus(service, uid) {
  const res = await fetch(`${MOCK_BASE}/${service}/api/status?uid=${uid}`);
  return res.json();
}

// Streams the actual page the agent is looking at, live, as JPEG frames over
// CDP — not a recap after the fact. Printed as its own stdout line so a
// parent process (the dashboard) can forward each frame the moment it's
// captured. Gated behind an env var so plain CLI/eval runs stay lightweight.
async function startScreencast(page) {
  if (process.env.STREAM_FRAMES !== "1") return null;
  const cdp = await page.context().newCDPSession(page);
  cdp.on("Page.screencastFrame", ({ data, sessionId }) => {
    console.log("FRAME:" + data);
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 85,
    maxWidth: 960,
    maxHeight: 480,
    everyNthFrame: 1,
  });
  return cdp;
}

// Prints a human-readable verdict for the terminal, plus a single-line
// RESULT_JSON marker that other processes (the dashboard server, the
// evaluation script) parse out of captured stdout instead of scraping the
// human log lines.
function printVerdict(result) {
  console.log("\n=== 최종 판정 ===");
  console.log(JSON.stringify(result, null, 2));
  console.log("RESULT_JSON:" + JSON.stringify({ logs, verdict: result }));
}

async function main() {
  const startedAt = Date.now();
  const args = process.argv.slice(2);
  const service = args[0];
  const uid = args[1] && !args[1].startsWith("--") ? args[1] : `demo-${Date.now()}`;
  const attack = args.includes("--attack");
  const headless = args.includes("--headless");

  if (!EXECUTORS[service]) {
    console.error(`알 수 없는 서비스: "${service}". 사용 가능: ${Object.keys(EXECUTORS).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const instruction = "이 구독 해지해줘";
  log("1. 정책 변환", `"${instruction}" -> cancel_subscription(${service}, uid=${uid})`);
  const policy = draftPolicy(instruction, service, uid);

  const statusBefore = await fetchStatus(service, uid);
  log("2. 실행 전 상태 조회", JSON.stringify(statusBefore));

  // Some sandboxed environments preinstall a browser revision that doesn't
  // match this playwright package version's own resolver — fall back to that
  // known-good path only if it actually exists; otherwise let Playwright
  // resolve normally (e.g. after a plain `npx playwright install`).
  const sandboxChromium = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
  const launchOpts = { headless };
  if (fs.existsSync(sandboxChromium)) {
    launchOpts.executablePath = sandboxChromium;
    // This pinned playwright version predates that sandbox browser's Chrome
    // release, so its old/new-headless auto-detection guesses wrong and
    // passes a --headless flag value Chrome no longer supports. Force it.
    if (headless) launchOpts.args = ["--headless=new"];
  }
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 960, height: 480 } });
  await injectCursor(page);
  const cdp = await startScreencast(page);

  const { formInfo, submit } = await EXECUTORS[service].run(page, {
    baseUrl: `${MOCK_BASE}/${service}`,
    uid,
    attack,
  });
  log("3. 실행 직전 폼 검사", JSON.stringify(formInfo));

  const pre = checkBeforeSubmit(policy, { formAction: formInfo.action, fields: formInfo.fields });
  if (!pre.ok) {
    log("4. 🛑 사전 검증 실패 — 실행 차단", pre.reason);
    await browser.close();
    printVerdict({
      service,
      uid,
      attack,
      blocked: true,
      executed: false,
      stage: "pre-execution",
      reason: pre.reason,
      statusBefore,
      durationMs: Date.now() - startedAt,
    });
    return;
  }
  log(
    "4. 사전 검증 통과",
    policy.preCheck
      ? "폼 action/hidden field가 정책과 일치"
      : "이 서비스의 공격 유형은 사전 DOM 검사로 탐지 불가 (사후 상태 대조 단계에서 커버)"
  );

  const token = issueToken({ action: policy.action, service, uid, expires_at: policy.expires_at });
  log("5. 일회성 실행 토큰 발급", token.slice(0, 24) + "...");

  const redeem = redeemToken(token);
  if (!redeem.valid) {
    log("6. 🛑 토큰 검증 실패 — 실행 차단", redeem.reason);
    await browser.close();
    printVerdict({
      service,
      uid,
      attack,
      blocked: true,
      executed: false,
      stage: "token",
      reason: redeem.reason,
      statusBefore,
      durationMs: Date.now() - startedAt,
    });
    return;
  }
  log("6. 토큰 검증 통과", "서명/만료/재사용 여부 확인됨");

  await submit();
  await page.waitForLoadState("networkidle").catch(() => {});
  await browser.close();

  const statusAfter = await fetchStatus(service, uid);
  log("7. 실행 후 상태 재조회", JSON.stringify(statusAfter));

  const post = checkAfterExecution(policy, statusAfter, {
    disclosedFee: Number(formInfo.fields.disclosed_fee || 0),
  });

  if (!post.ok) {
    log("8. 🛑 실행 후 검증 실패 — 무결성 위반 탐지", post.reason);
    printVerdict({
      service,
      uid,
      attack,
      blocked: false,
      executed: true,
      integrityViolation: true,
      stage: "post-execution",
      reason: post.reason,
      statusBefore,
      statusAfter,
      durationMs: Date.now() - startedAt,
    });
    return;
  }

  log("8. ✅ 실행 후 검증 통과", "정상 해지 확인됨");
  printVerdict({
    service,
    uid,
    attack,
    blocked: false,
    executed: true,
    integrityViolation: false,
    statusBefore,
    statusAfter,
    durationMs: Date.now() - startedAt,
  });
}

main().catch((err) => {
  console.error("실행 중 오류:", err);
  process.exitCode = 1;
});
