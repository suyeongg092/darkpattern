const express = require("express");
const ordernowClub = require("./services/orderNowClub");
const supercartPlus = require("./services/superCartPlus");
const primevault = require("./services/primeVault");
const cloudstudio = require("./services/cloudStudio");
const streamnow = require("./services/streamNow");
const readwell = require("./services/readWell");
const { PATTERNS } = require("./darkpatterns/catalog");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Two entrances, deliberately.
//
//   /      the front door — a plain list of services with no query parameters.
//          This is what gets shown in a demo, and what the dashboard links into.
//          Nothing here hints that the sites are instrumented.
//   /lab   the back door — the 2x2 switchboard, answer keys, scoring commands.
//          Ours to work in; not opened in front of an audience.
//
// They used to be the same page, which made the whole thing read as a test
// harness rather than as a set of services worth cancelling a subscription on.
const SERVICES = [
  { path: "streamnow", name: "StreamNow", tagline: "영화·드라마·예능 스트리밍", origin: "웨이브·Hulu 무료체험 전환 inspired", accent: "#7b3fe4", router: streamnow },
  { path: "ordernow-club", name: "OrderNow Club", tagline: "배달 멤버십", origin: "배달의민족 배민클럽 inspired", accent: "#2ac1bc", router: ordernowClub },
  { path: "supercart-plus", name: "SuperCart Plus", tagline: "커머스 멤버십·쇼핑", origin: "쿠팡 로켓와우 inspired", accent: "#e2493c", router: supercartPlus },
  { path: "primevault", name: "PrimeVault", tagline: "무료배송·특가 멤버십", origin: "Amazon Prime \"Iliad Flow\" inspired (FTC v. Amazon)", accent: "#146eb4", router: primevault },
  { path: "cloudstudio", name: "CloudStudio", tagline: "창작 도구 구독", origin: "Adobe Creative Cloud inspired (FTC v. Adobe)", accent: "#da1f26", router: cloudstudio },
  { path: "readwell", name: "ReadWell", tagline: "전자책·오디오북 구독", origin: "공정위 시정 기준 준수 사례 (대조군)", accent: "#1f7a5c", router: readwell },
];
for (const s of SERVICES) {
  s.labelled = Boolean(s.router.meta);
  s.compliant = Boolean(s.router.meta && s.router.meta.compliant);
}

const FONT = `-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif`;

// ── 정문 ────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  const uid = req.query.uid || "demo";
  const q = uid === "demo" ? "" : `?uid=${encodeURIComponent(uid)}`;
  const rows = SERVICES.map(
    (s) => `
      <a class="svc" href="/${s.path}${q}">
        <span class="dot" style="background:${s.accent}"></span>
        <span class="svc-text">
          <span class="svc-name">${s.name}</span>
          <span class="svc-tag">${s.tagline}</span>
        </span>
        <span class="svc-go">&rsaquo;</span>
      </a>`
  ).join("");

  res.send(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>구독 서비스</title>
<style>
  body{font-family:${FONT};max-width:460px;margin:0 auto;padding:48px 16px 40px;background:#f7f7f8;color:#1a1a1a}
  h1{font-size:22px;margin:0 0 4px}
  .sub{font-size:13px;color:#8a8f98;margin:0 0 28px}
  .svc{display:flex;align-items:center;gap:14px;background:#fff;border-radius:12px;
       padding:16px 18px;margin-bottom:10px;text-decoration:none;color:inherit;
       box-shadow:0 1px 3px rgba(0,0,0,.07)}
  .svc:hover{box-shadow:0 2px 8px rgba(0,0,0,.11)}
  .dot{width:10px;height:10px;border-radius:50%;flex:none}
  .svc-text{display:flex;flex-direction:column;flex:1;min-width:0}
  .svc-name{font-weight:700;font-size:15px}
  .svc-tag{font-size:12.5px;color:#8a8f98;margin-top:2px}
  .svc-go{color:#c4c8cf;font-size:20px;line-height:1}
  footer{margin-top:34px;font-size:12px;color:#b6bac1;text-align:center}
  footer a{color:#b6bac1}
</style>
</head><body>
<h1>구독 서비스</h1>
<p class="sub">이용 중인 서비스로 이동합니다.</p>
${rows}
<footer><a href="/lab${q}">평가 패널</a></footer>
</body></html>`);
});

// ── 뒷문 ────────────────────────────────────────────────────────────────
app.get("/lab", (req, res) => {
  const uid = req.query.uid || "demo";
  const cards = SERVICES.map((s) => {
    if (s.compliant) {
      return `
      <div class="card">
        <div class="name" style="color:${s.accent}">${s.name}<span class="pill pill-clean">대조군 · 라벨 0</span></div>
        <div class="origin">${s.origin}</div>
        <p class="note">다크패턴이 없는 서비스입니다. 탐지기가 여기서 무언가를 보고하면 전부 오탐입니다.</p>
        <div class="links"><a href="/${s.path}?uid=${uid}">서비스 열기</a> ·
          <a href="/${s.path}/api/ground-truth?uid=${uid}">정답표</a> ·
          <a href="/${s.path}/api/status?uid=${uid}">상태</a></div>
      </div>`;
    }
    return `
      <div class="card">
        <div class="name" style="color:${s.accent}">${s.name}${
      s.labelled ? '<span class="pill">라벨링 완료</span>' : '<span class="pill pill-todo">라벨 없음</span>'
    }</div>
        <div class="origin">${s.origin}</div>
        <table class="switch">
          <tr><td class="corner"></td><th>백엔드 정상</th><th>백엔드 조작 (ADI)</th></tr>
          <tr>
            <th>화면 시정 전</th>
            <td><a href="/${s.path}?uid=${uid}">시정 전</a></td>
            <td><a href="/${s.path}?uid=${uid}&attack=1" style="color:#c00">공격 모드</a></td>
          </tr>
          <tr>
            <th>화면 시정 후</th>
            <td><a href="/${s.path}?uid=${uid}&variant=clean" style="color:#1a7f37">시정 후</a></td>
            <td><a href="/${s.path}?uid=${uid}&variant=clean&attack=1" style="color:#7a4bd0">시정 후 + 공격</a></td>
          </tr>
        </table>
        ${
          s.labelled
            ? `<div class="links">
                 <a href="/${s.path}/api/ground-truth?uid=${uid}">정답표</a> ·
                 <a href="/${s.path}/api/status?uid=${uid}">상태</a></div>`
            : ""
        }
      </div>`;
  }).join("");

  res.send(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>평가 패널</title>
<style>
  body{font-family:${FONT};max-width:600px;margin:0 auto;padding:40px 16px 60px;background:#f7f7f8;color:#1a1a1a}
  h1{font-size:21px;margin:0 0 6px}
  h2{font-size:15px;margin:32px 0 10px;padding-top:14px;border-top:1px solid #e0e2e7}
  a{color:#2f5bea}
  code{background:#ececf0;padding:1px 5px;border-radius:3px;font-size:12px}
  .intro{font-size:13px;color:#666;line-height:1.75}
  .card{background:#fff;border-radius:10px;padding:16px 18px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.07)}
  .name{font-weight:700;font-size:15px}
  .pill{font-size:11px;background:#eef3ff;color:#2f5bea;border-radius:999px;padding:2px 8px;margin-left:6px;font-weight:600}
  .pill-clean{background:#e3f6e8;color:#1a7f37}
  .pill-todo{background:#f2f2f4;color:#999}
  .origin{font-size:12px;color:#8a8f98;margin-top:2px}
  .note{font-size:12.5px;color:#666;margin:10px 0 8px}
  .links{font-size:12px;color:#aaa;margin-top:8px}
  .links a{color:#aaa}
  table.switch{border-collapse:collapse;width:100%;margin:12px 0 4px;font-size:13px}
  table.switch th,table.switch td{border:1px solid #e3e3e8;padding:7px 10px;text-align:center}
  table.switch th{background:#f0f0f4;color:#666;font-weight:600;font-size:12px}
  table.switch td.corner{border:none;background:transparent}
  table.switch tr th:first-child{text-align:right;white-space:nowrap}
  pre{background:#fff;border:1px solid #e3e3e8;border-radius:8px;padding:14px 16px;overflow-x:auto;
      font-size:12px;line-height:1.9;margin:0}
  .c{color:#a0a4ac}
</style>
</head><body>
<h1>평가 패널</h1>
<p class="intro">
  개발·채점용 화면입니다. 시연에서는 <a href="/">정문</a>을 씁니다.<br>
  스위치가 <b>두 개</b>라 사이트마다 조합이 <b>네 가지</b>입니다.
  <b>화면 축(<code>variant</code>)</b>은 탐지기를, <b>백엔드 축(<code>attack</code>)</b>은 Agent를 시험합니다.
  오른쪽 아래 칸(<span style="color:#7a4bd0">시정 후 + 공격</span>)은 화면이 규정을 다 지켰는데도
  백엔드가 거짓말하는 상태로, 화면 검사만으로는 잡을 수 없는 공격이 따로 있다는 걸 보여줍니다.
</p>

<h2>서비스</h2>
${cards}

<h2>채점</h2>
<pre><span class="c"># 정답표에서 만든 완벽한 탐지기로 파이프라인 검증</span>
npm run score:sample
<span class="c"># 채점기가 오류를 실제로 잡는지 확인</span>
node scripts/score.js --sample --noisy
<span class="c"># 화면 수정 후 Agent 셀렉터가 안 깨졌는지 (필수)</span>
node scripts/check-contract.js</pre>

<h2>API</h2>
<p class="intro">
  <a href="/api/ground-truth?uid=${uid}">전체 정답표 인덱스</a> ·
  <a href="/api/catalog">다크패턴 유형 카탈로그</a><br>
  페이지 단위 <code>/:service/api/ground-truth?path=/signup</code> ·
  플로우 단위 <code>?flow=cancel</code>
</p>
</body></html>`);
});

// Type catalog — the dashboard and the scorer both need 유형명/법조문/심각도,
// and neither should hardcode its own copy.
app.get("/api/catalog", (req, res) => {
  res.json({ patterns: PATTERNS });
});

// Index of every labelled service, so scripts/score.js can enumerate the
// evaluation set without a hardcoded list.
app.get("/api/ground-truth", (req, res) => {
  const uid = req.query.uid || "demo";
  res.json({
    services: SERVICES.filter((s) => s.labelled).map((s) => ({
      service: s.path,
      name: s.name,
      compliant: s.compliant,
      groundTruth: `/${s.path}/api/ground-truth?uid=${uid}`,
      pages: s.router.meta.pages,
      flows: s.router.meta.flows,
    })),
    unlabelled: SERVICES.filter((s) => !s.labelled).map((s) => s.path),
  });
});

for (const s of SERVICES) app.use(`/${s.path}`, s.router);

// Named MOCK_PORT (not PORT) so this can run in the same container as
// dashboard/, which binds PORT for the public-facing web service.
const PORT = process.env.MOCK_PORT || 4000;
if (require.main === module) {
  // Bind loopback-only: in the deployed container this must stay invisible
  // to Render's automatic port scan (which targets 0.0.0.0 listeners), or it
  // can get picked as the routed port instead of dashboard's.
  const HOST = process.env.MOCK_HOST || "127.0.0.1";
  app.listen(PORT, HOST, () => {
    console.log(`Mock dark-pattern services running on http://${HOST}:${PORT}`);
  });
}

module.exports = app;
