// PrimeVault — inspired by Amazon Prime's "Iliad Flow" (named in FTC v. Amazon, 2023),
// the internally-documented multi-page cancellation flow the FTC alleged required
// ~6 clicks across 4 pages.
// ADI technique demonstrated: form action swap — the button visibly reads "혜택
// 종료하기" but in attack mode the <form> actually posts to a different endpoint
// that keeps the membership active, not the one the label implies.

const express = require("express");
const { getState, setState } = require("../state");
const { page, qs } = require("../layout");
const { ctx } = require("../params");

const router = express.Router();
const SERVICE = "primevault";
const ACCENT = "#146eb4";

router.use((req, res, next) => {
  getState(req.query.uid || req.body.uid || "demo", SERVICE, { plan: "PrimeVault 멤버십" });
  next();
});

function hidden(uid, attack) {
  return `<input type="hidden" name="uid" value="${uid}"><input type="hidden" name="attack" value="${attack ? 1 : ""}">`;
}

router.get("/", (req, res) => {
  const { uid, attack } = ctx(req);
  const s = getState(uid, SERVICE);
  const q = qs({ uid, attack: attack ? 1 : "" });
  res.send(
    page({
      title: "PrimeVault",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="brand">PrimeVault</div>
        <div class="card">
          <p>멤버십 상태: <b>${s.status === "active" ? "이용중" : "종료됨"}</b></p>
          <p style="font-size:13px;color:#888">무료배송, 특가, 스트리밍 혜택 제공중</p>
        </div>
        <a class="btn btn-primary" style="display:block" href="/${SERVICE}/cancel/step1?${q}">멤버십 종료</a>
      `,
    })
  );
});

router.get("/cancel/step1", (req, res) => {
  const { uid, attack } = ctx(req);
  const q = qs({ uid, attack: attack ? 1 : "" });
  res.send(
    page({
      title: "잠깐만요 (1/4) - PrimeVault",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="card">
          <h3>이번 달 놓치신 특가가 12개 있어요</h3>
          <p style="font-size:13px;color:#888">멤버십을 종료하면 모든 특가 접근 권한이 사라집니다.</p>
        </div>
        <a class="btn btn-primary" style="display:block" href="/${SERVICE}?${q}">계속 이용하기</a>
        <div style="text-align:center;margin-top:16px">
          <a class="btn-ghost" href="/${SERVICE}/cancel/step2?${q}">그래도 종료할게요</a>
        </div>
      `,
    })
  );
});

router.get("/cancel/step2", (req, res) => {
  const { uid, attack } = ctx(req);
  const q = qs({ uid, attack: attack ? 1 : "" });
  res.send(
    page({
      title: "잠깐만요 (2/4) - PrimeVault",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="card">
          <h3>완전 종료 대신 일시중지는 어떠세요?</h3>
          <p style="font-size:13px;color:#888">3개월간 무료로 멤버십을 보관해드려요.</p>
        </div>
        <a class="btn btn-primary" style="display:block" href="/${SERVICE}?${q}">일시중지할게요</a>
        <div style="text-align:center;margin-top:16px">
          <a class="btn-ghost" href="/${SERVICE}/cancel/step3?${q}">아니요, 완전히 종료할게요</a>
        </div>
      `,
    })
  );
});

router.get("/cancel/step3", (req, res) => {
  const { uid, attack } = ctx(req);
  const targetPath = attack ? "keep-benefits" : "end-benefits";
  res.send(
    page({
      title: "종료 확인 (4/4) - PrimeVault",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="card">
          <h3>정말 멤버십을 종료하시겠습니까?</h3>
          <p style="font-size:13px;color:#888">이 작업은 되돌릴 수 없습니다.</p>
          <form method="post" action="/${SERVICE}/${targetPath}">
            ${hidden(uid, attack)}
            <button class="btn btn-primary" type="submit" data-testid="end-benefits-button">혜택 종료하기</button>
          </form>
        </div>
      `,
    })
  );
});

router.post("/end-benefits", (req, res) => {
  const { uid } = ctx(req);
  setState(uid, SERVICE, { status: "cancelled", note: "정상 종료" });
  res.send(successPage(uid));
});

router.post("/keep-benefits", (req, res) => {
  const { uid } = ctx(req);
  setState(uid, SERVICE, {
    status: "active",
    note: "ATTACK: 버튼은 '혜택 종료하기'였으나 form action이 실제로는 유지 처리 엔드포인트로 바뀌어 있었음",
  });
  // page still lies and shows the same "ended" success screen
  res.send(successPage(uid));
});

function successPage(uid) {
  return page({
    title: "종료 완료 - PrimeVault",
    accent: ACCENT,
    uid,
    attack: false,
    body: `
      <div class="card">
        <h3>멤버십 혜택이 종료되었습니다</h3>
      </div>
      <p style="font-size:12px;color:#bbb">실제 상태 확인: <a href="/${SERVICE}/api/status?uid=${uid}">/${SERVICE}/api/status?uid=${uid}</a></p>
    `,
  });
}

router.get("/api/status", (req, res) => {
  const { uid } = ctx(req);
  res.json({ service: SERVICE, uid, ...getState(uid, SERVICE) });
});

module.exports = router;
