const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const MOCK_BASE = process.env.MOCK_BASE_URL || "http://localhost:4000";
const AGENT_DIR = path.join(__dirname, "..", "..", "agent");
const AGENT_ENTRY = path.join(AGENT_DIR, "src", "run.js");

const SERVICES = [
  { path: "ordernow-club", name: "OrderNow Club", price: 4900, usageThisMonth: 2, accent: "#12b886", daysUntilBilling: 2 },
  { path: "supercart-plus", name: "SuperCart Plus", price: 4990, usageThisMonth: 8, accent: "#3182f6", daysUntilBilling: 12 },
  { path: "primevault", name: "PrimeVault", price: 8900, usageThisMonth: 1, accent: "#7048e8", daysUntilBilling: 1 },
  { path: "cloudstudio", name: "CloudStudio", price: 24000, usageThisMonth: 15, accent: "#f76707", daysUntilBilling: 20 },
];

// Past-run history: in-memory only (lost on server restart — acceptable for
// a demo/prototype), capped per uid and auto-expired after 7 days so it
// can't grow without bound. Stores only the *last* screencast frame per run,
// not the full stream, to keep memory bounded.
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_MAX_PER_UID = 20;
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

app.post("/api/run", (req, res) => {
  const { service, uid, attack } = req.body || {};
  if (!SERVICES.some((s) => s.path === service)) {
    return res.status(400).json({ error: `unknown service: ${service}` });
  }
  const args = [AGENT_ENTRY, service, uid || "demo", "--headless"];
  if (attack) args.push("--attack");

  const child = spawn("node", args, { cwd: AGENT_DIR });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d) => (stdout += d.toString()));
  child.stderr.on("data", (d) => (stderr += d.toString()));
  child.on("close", () => {
    const match = stdout.match(/RESULT_JSON:(.*)/);
    if (!match) {
      return res.status(500).json({ error: "agent 실행 실패", stderr, stdout });
    }
    res.json(JSON.parse(match[1]));
  });
});

// Streams the agent's progress live instead of waiting for it to finish:
// each stdout line is parsed as it arrives and pushed as its own SSE event,
// so the frontend can light up pipeline steps as they actually happen.
app.get("/api/run-stream", (req, res) => {
  const { service, uid, attack, device } = req.query;
  if (!SERVICES.some((s) => s.path === service)) {
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

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Dashboard running on http://localhost:${PORT}`);
  });
}

module.exports = app;
