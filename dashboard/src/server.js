const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

const MOCK_BASE = process.env.MOCK_BASE_URL || "http://localhost:4000";
const AGENT_DIR = path.join(__dirname, "..", "..", "agent");
const AGENT_ENTRY = path.join(AGENT_DIR, "src", "run.js");
const DETECTOR_DIR = path.join(AGENT_DIR, "detector");

// 두 개의 서로 다른 실행기가 있다.
//   agent/           (JS)     — 정해진 정책으로 ADI(백엔드 위조) 공격을 검증한다.
//   agent/detector   (Python) — 서비스에 종속되지 않은 코드로 다크패턴을 그때그때
//                                판단해서 우회한다.
// 둘 다 CDP 스크린캐스트로 실시간 화면을 보내는 동일한 와이어 프로토콜
// (FRAME:/LOG-or-RESULT_JSON:)을 stdout에 찍도록 맞춰져 있어서, 아래 두 SSE
// 엔드포인트는 spawn 대상과 로그 파싱 방식만 다르고 구조는 같다.
const SERVICES = [
  { path: "streamnow", name: "StreamNow", price: 13900, usageThisMonth: 3, accent: "#7b3fe4", daysUntilBilling: 6 },
  { path: "ordernow-club", name: "OrderNow Club", price: 4900, usageThisMonth: 2, accent: "#12b886", daysUntilBilling: 2 },
  { path: "supercart-plus", name: "SuperCart Plus", price: 4990, usageThisMonth: 8, accent: "#3182f6", daysUntilBilling: 12 },
  { path: "primevault", name: "PrimeVault", price: 8900, usageThisMonth: 1, accent: "#7048e8", daysUntilBilling: 1 },
  { path: "cloudstudio", name: "CloudStudio", price: 24000, usageThisMonth: 15, accent: "#f76707", daysUntilBilling: 20 },
  { path: "readwell", name: "ReadWell", price: 9900, usageThisMonth: 5, accent: "#1f7a5c", daysUntilBilling: 9 },
];
const SERVICE_PATHS = new Set(SERVICES.map((s) => s.path));

// Past-run history: in-memory only (lost on server restart — acceptable for
// a demo/prototype), capped per uid and auto-expired after 7 days so it
// can't grow without bound. Stores only the *last* screencast frame per run,
// not the full stream, to keep memory bounded. `kind` distinguishes which
// executor produced the run ("integrity" | "detector") since the two have
// different result shapes.
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_MAX_PER_UID = 30;
const history = new Map(); // uid -> records, newest first

function pruneHistory(uid) {
  const now = Date.now();
  const kept = (history.get(uid) || []).filter((r) => now - r.at < HISTORY_TTL_MS).slice(0, HISTORY_MAX_PER_UID);
  history.set(uid, kept);
  return kept;
}

function addHistory(uid, record) {
  const kept = pruneHistory(uid);
  kept.unshift(record);
  history.set(uid, kept.slice(0, HISTORY_MAX_PER_UID));
}

app.get("/api/history", (req, res) => {
  const uid = req.query.uid || "demo";
  const list = pruneHistory(uid).map(({ lastFrame, logs, ...meta }) => ({
    ...meta,
    expiresAt: meta.at + HISTORY_TTL_MS,
  }));
  res.json({ history: list });
});

app.get("/api/history/:id", (req, res) => {
  const uid = req.query.uid || "demo";
  const record = pruneHistory(uid).find((r) => r.id === req.params.id);
  if (!record) {
    return res.status(404).json({ error: "기록을 찾을 수 없습니다 (7일이 지나 삭제되었을 수 있어요)" });
  }
  res.json(record);
});

app.get("/api/subscriptions", async (req, res) => {
  const uid = req.query.uid || "demo";
  try {
    const subscriptions = await Promise.all(
      SERVICES.map(async (s) => {
        const r = await fetch(`${MOCK_BASE}/${s.path}/api/status?uid=${uid}`);
        const status = await r.json();
        const suggestCancel = s.usageThisMonth <= 3 && status.status === "active";
        return {
          ...s,
          status: status.status,
          note: status.note || null,
          feeCharged: status.feeCharged,
          suggestCancel,
          suggestionText: suggestCancel
            ? `이번 달 ${s.usageThisMonth}번밖에 안 켠 서비스에 매달 ${s.price.toLocaleString()}원 나가고 있어요.`
            : null,
        };
      })
    );
    const active = subscriptions.filter((s) => s.status === "active");
    const totalMonthly = active.reduce((sum, s) => sum + s.price, 0);
    const soonest = active.slice().sort((a, b) => a.daysUntilBilling - b.daysUntilBilling)[0] || null;
    res.json({ uid, subscriptions, summary: { totalMonthly, activeCount: active.length, soonest } });
  } catch (err) {
    res.status(502).json({ error: "mock-services에 연결할 수 없습니다 (localhost:4000이 떠 있는지 확인)", detail: String(err) });
  }
});

// ── 무결성 검증 실행 (agent/, JS) ──────────────────────────────────────────
// Streams the agent's progress live instead of waiting for it to finish:
// each stdout line is parsed as it arrives and pushed as its own SSE event,
// so the frontend can light up pipeline steps as they actually happen.
app.get("/api/run-stream", (req, res) => {
  const { service, uid, attack, device } = req.query;
  if (!SERVICE_PATHS.has(service)) {
    return res.status(400).json({ error: `unknown service: ${service}` });
  }
  const args = [AGENT_ENTRY, service, uid || "demo", "--headless"];
  if (attack === "1" || attack === "true") args.push("--attack");
  const deviceMode = device === "mobile" ? "mobile" : "pc";

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  const child = spawn("node", args, {
    cwd: AGENT_DIR,
    env: { ...process.env, STREAM_FRAMES: "1", SLOW_DEMO: "1", DEVICE: deviceMode },
  });
  let buffer = "";
  let lastFrame = null;
  const collectedLogs = [];
  let finalVerdict = null;

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep the last (possibly incomplete) line

    for (const line of lines) {
      const frameMatch = line.match(/^FRAME:(.*)$/);
      if (frameMatch) {
        lastFrame = frameMatch[1];
        send({ type: "frame", data: frameMatch[1] });
        continue;
      }
      const resultMatch = line.match(/^RESULT_JSON:(.*)$/);
      if (resultMatch) {
        const { verdict } = JSON.parse(resultMatch[1]);
        finalVerdict = verdict;
        send({ type: "verdict", verdict });
        continue;
      }
      const logMatch = line.match(/^\[[^\]]+\]\s(.+)$/);
      if (logMatch) {
        const rest = logMatch[1];
        const sepIndex = rest.indexOf(" — ");
        const step = sepIndex === -1 ? rest : rest.slice(0, sepIndex);
        const detail = sepIndex === -1 ? null : rest.slice(sepIndex + 3);
        collectedLogs.push({ step, detail });
        send({ type: "log", step, detail });
      }
    }
  });

  child.on("close", (code) => {
    if (code !== 0) send({ type: "error", message: "agent 프로세스가 비정상 종료됨" });
    if (finalVerdict) {
      const serviceMeta = SERVICES.find((s) => s.path === service);
      addHistory(uid || "demo", {
        id: crypto.randomUUID(),
        kind: "integrity",
        at: Date.now(),
        service,
        serviceName: serviceMeta ? serviceMeta.name : service,
        attack: attack === "1" || attack === "true",
        device: deviceMode,
        verdict: finalVerdict,
        logs: collectedLogs,
        lastFrame,
      });
    }
    send({ type: "done" });
    res.end();
  });

  req.on("close", () => child.kill());
});

// ── 다크패턴 우회 실행 (agent/detector, Python team_agent) ─────────────────
// Same live-streaming shape as run-stream above, but spawns the Python CLI
// (see team_agent/run.py:run_live) and parses its FRAME:/LOG:/RESULT: lines
// instead of the JS agent's FRAME:/[..] .../RESULT_JSON: convention. Only a
// single dark-variant "rules" run — the multi-mode/clean comparison the CLI
// tool also supports is an offline scoring workflow, not a live demo.
app.get("/api/detector-stream", (req, res) => {
  const { service, uid, attack } = req.query;
  if (!SERVICE_PATHS.has(service)) {
    return res.status(400).json({ error: `unknown service: ${service}` });
  }
  const args = ["-m", "team_agent.run", service, "--mode", "rules", "--uid", uid || "demo"];
  if (attack === "1" || attack === "true") args.push("--attack");

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  const child = spawn("python3", args, {
    cwd: DETECTOR_DIR,
    env: {
      ...process.env,
      STREAM_FRAMES: "1",
      PYTHONUNBUFFERED: "1", // otherwise Python block-buffers stdout when piped and nothing streams live
      CHROMIUM_PATH: process.env.DETECTOR_CHROMIUM_PATH || process.env.CHROMIUM_PATH || "",
    },
  });
  let buffer = "";
  let lastFrame = null;
  const collectedLogs = [];
  let finalResult = null;
  let stderrTail = "";

  child.stderr.on("data", (chunk) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-4000);
  });

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith("FRAME:")) {
        lastFrame = line.slice("FRAME:".length);
        send({ type: "frame", data: lastFrame });
        continue;
      }
      if (line.startsWith("LOG:")) {
        try {
          const step = JSON.parse(line.slice("LOG:".length));
          collectedLogs.push(step);
          send({ type: "detector-step", step });
        } catch {
          // ignore malformed line — never let a parse hiccup kill the stream
        }
        continue;
      }
      if (line.startsWith("RESULT:")) {
        try {
          finalResult = JSON.parse(line.slice("RESULT:".length));
          send({ type: "detector-result", result: finalResult });
        } catch {
          // ignore
        }
      }
    }
  });

  child.on("close", (code) => {
    if (code !== 0 && !finalResult) {
      send({ type: "error", message: `detector 프로세스가 비정상 종료됨${stderrTail ? ": " + stderrTail.slice(-300) : ""}` });
    }
    if (finalResult) {
      const serviceMeta = SERVICES.find((s) => s.path === service);
      addHistory(uid || "demo", {
        id: crypto.randomUUID(),
        kind: "detector",
        at: Date.now(),
        service,
        serviceName: serviceMeta ? serviceMeta.name : service,
        attack: attack === "1" || attack === "true",
        result: finalResult,
        logs: collectedLogs,
        lastFrame,
      });
    }
    send({ type: "done" });
    res.end();
  });

  req.on("close", () => child.kill());
});

// mock-services는 배포 환경에서 loopback(127.0.0.1)에만 바인딩되어 브라우저가
// 직접 접근할 수 없다 (Render의 자동 포트 스캔과 충돌 방지). 그래서 서비스
// 카드를 눌렀을 때 "그 사이트로 그대로 넘어가는" 경험을 주려면 dashboard가
// 같은 경로(prefix)로 요청을 그대로 중계해야 한다 — mock-services 내부 링크와
// form action이 전부 `/${service}/...` 절대경로라서, 경로를 그대로 유지해야
// 페이지 안에서의 이동(장바구니, 해지 플로우 등)도 깨지지 않는다.
async function proxyToMock(req, res) {
  if (!SERVICE_PATHS.has(req.params.service)) {
    return res.status(404).send("알 수 없는 서비스입니다.");
  }
  const target = `${MOCK_BASE}${req.originalUrl}`;
  const init = { method: req.method, redirect: "manual" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.headers = { "content-type": "application/x-www-form-urlencoded" };
    init.body = new URLSearchParams(req.body || {}).toString();
  }
  try {
    const r = await fetch(target, init);
    // mock-services는 POST 처리 후 303 등으로 다음 화면으로 리다이렉트한다.
    // Location이 절대경로(`/${service}/...`)라서 브라우저에 그대로 돌려줘도
    // 같은 dashboard origin의 프록시 경로로 다시 들어와 정상 동작한다.
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      return res.redirect(r.status, r.headers.get("location"));
    }
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get("content-type");
    if (ct) res.set("content-type", ct);
    res.send(text);
  } catch (err) {
    res.status(502).send("mock-services에 연결할 수 없습니다 (localhost:4000이 떠 있는지 확인)");
  }
}
app.all("/:service", proxyToMock);
app.all("/:service/*", proxyToMock);

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Dashboard running on http://localhost:${PORT}`);
  });
}

module.exports = app;
