const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

const MOCK_BASE = process.env.MOCK_BASE_URL || "http://localhost:4000";

// NOTE: agent 통합이 빠진 임시 버전입니다 (agent 팀 작업이 아직 push되지 않아
// mock-services만으로 시연/촬영이 가능하도록 임시로 뺐습니다). agent가 준비되면
// git history의 이전 커밋(spawn 기반 /api/run, /api/run-stream, 실행 기록 기능)을
// 참고해 다시 통합하면 됩니다.
const SERVICES = [
  { path: "streamnow", name: "StreamNow", price: 13900, usageThisMonth: 3, accent: "#7b3fe4", daysUntilBilling: 6 },
  { path: "ordernow-club", name: "OrderNow Club", price: 4900, usageThisMonth: 2, accent: "#12b886", daysUntilBilling: 2 },
  { path: "supercart-plus", name: "SuperCart Plus", price: 4990, usageThisMonth: 8, accent: "#3182f6", daysUntilBilling: 12 },
  { path: "primevault", name: "PrimeVault", price: 8900, usageThisMonth: 1, accent: "#7048e8", daysUntilBilling: 1 },
  { path: "cloudstudio", name: "CloudStudio", price: 24000, usageThisMonth: 15, accent: "#f76707", daysUntilBilling: 20 },
  { path: "readwell", name: "ReadWell", price: 9900, usageThisMonth: 5, accent: "#1f7a5c", daysUntilBilling: 9 },
];
const SERVICE_PATHS = new Set(SERVICES.map((s) => s.path));

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
