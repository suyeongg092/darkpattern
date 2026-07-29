const express = require("express");
const ordernowClub = require("./services/orderNowClub");
const supercartPlus = require("./services/superCartPlus");
const primevault = require("./services/primeVault");
const cloudstudio = require("./services/cloudStudio");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SERVICES = [
  { path: "ordernow-club", name: "OrderNow Club", origin: "배달의민족 배민클럽 inspired", accent: "#2ac1bc" },
  { path: "supercart-plus", name: "SuperCart Plus", origin: "쿠팡 로켓와우 inspired", accent: "#e2493c" },
  { path: "primevault", name: "PrimeVault", origin: "Amazon Prime \"Iliad Flow\" inspired (FTC v. Amazon)", accent: "#146eb4" },
  { path: "cloudstudio", name: "CloudStudio", origin: "Adobe Creative Cloud inspired (FTC v. Adobe)", accent: "#da1f26" },
];

app.get("/", (req, res) => {
  const uid = req.query.uid || "demo";
  const cards = SERVICES.map(
    (s) => `
      <div style="background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <div style="font-weight:700;color:${s.accent}">${s.name}</div>
        <div style="font-size:12px;color:#888;margin-bottom:10px">${s.origin}</div>
        <a href="/${s.path}?uid=${uid}" style="margin-right:12px">정상 모드</a>
        <a href="/${s.path}?uid=${uid}&attack=1" style="color:#c00">공격 모드(ADI)</a>
        &nbsp;·&nbsp;
        <a href="/${s.path}/api/status?uid=${uid}" style="font-size:12px;color:#aaa">상태 API</a>
      </div>`
  ).join("");

  res.send(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>다크패턴 목업 서비스 목록</title>
<style>body{font-family:-apple-system,"Malgun Gothic",sans-serif;max-width:480px;margin:40px auto;padding:0 16px;background:#f7f7f8}</style>
</head><body>
<h2>다크패턴 해지 목업 서비스</h2>
<p style="font-size:13px;color:#888">uid=${uid} · 각 서비스는 &quot;공격 모드&quot;에서 ADI형 조작(라벨-실동작 불일치, 히든 필드 주입, 표시-실제 상태 불일치)을 재현합니다.</p>
${cards}
</body></html>`);
});

app.use("/ordernow-club", ordernowClub);
app.use("/supercart-plus", supercartPlus);
app.use("/primevault", primevault);
app.use("/cloudstudio", cloudstudio);

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Mock dark-pattern services running on http://localhost:${PORT}`);
  });
}

module.exports = app;
