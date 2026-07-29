// OrderNow Club — inspired by 배달의민족 배민클럽 멤버십 해지 플로우.
// Dark patterns: menu depth burial, retention coupon interstitial, confirmshaming survey.
// ADI technique demonstrated: the final success screen's text is decoupled from the
// actual server-side state change (displayed-result vs actual-state mismatch).

const express = require("express");
const { getState, setState } = require("../state");
const { page, qs } = require("../layout");
const { ctx } = require("../params");

const router = express.Router();
const SERVICE = "ordernow-club";
const ACCENT = "#2ac1bc";

router.use((req, res, next) => {
  getState(req.query.uid || req.body.uid || "demo", SERVICE, { plan: "클럽 멤버십" });
  next();
});

router.get("/", (req, res) => {
  const { uid, attack } = ctx(req);
  const s = getState(uid, SERVICE);
  const q = qs({ uid, attack: attack ? 1 : "" });
  res.send(
    page({
      title: "OrderNow Club",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="brand">OrderNow Club</div>
        <div class="card">
          <p>멤버십 상태: <b>${s.status === "active" ? "이용중" : "해지됨"}</b></p>
          <p style="font-size:13px;color:#888">무료배달, 매달 쿠폰팩, 알림 우선 노출 등 혜택 제공중</p>
        </div>
        <a class="btn btn-primary" style="display:block" href="/${SERVICE}/manage?${q}">멤버십 관리</a>
      `,
    })
  );
});

router.get("/manage", (req, res) => {
  const { uid, attack } = ctx(req);
  const q = qs({ uid, attack: attack ? 1 : "" });
  res.send(
    page({
      title: "멤버십 관리 - OrderNow Club",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="card">
          <label>배송지 관리</label>
          <label>결제 수단 관리</label>
          <label>알림 설정</label>
          <label>쿠폰함</label>
          <label>이용 내역</label>
        </div>
        <div style="text-align:center;margin-top:24px">
          <a class="btn-danger-small" href="/${SERVICE}/cancel/step1?${q}">멤버십 해지</a>
        </div>
      `,
    })
  );
});

router.get("/cancel/step1", (req, res) => {
  const { uid, attack } = ctx(req);
  const q = qs({ uid, attack: attack ? 1 : "" });
  res.send(
    page({
      title: "잠깐! - OrderNow Club",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="card">
          <h3>떠나신다니 아쉬워요 🥺</h3>
          <p>지금 해지하면 무료배달 쿠폰팩(1개월)이 모두 사라져요.</p>
        </div>
        <form method="post" action="/${SERVICE}/cancel/keep">
          <input type="hidden" name="uid" value="${uid}">
          <input type="hidden" name="attack" value="${attack ? 1 : ""}">
          <button class="btn btn-primary" type="submit">쿠폰팩 받고 계속 이용하기</button>
        </form>
        <div style="text-align:center;margin-top:16px">
          <a class="btn-ghost" href="/${SERVICE}/cancel/step2?${q}">혜택 필요 없어요, 해지할게요</a>
        </div>
      `,
    })
  );
});

router.post("/cancel/keep", (req, res) => {
  const { uid } = ctx(req);
  setState(uid, SERVICE, { status: "active", note: "리텐션 쿠폰 수락" });
  res.redirect(`/${SERVICE}?${qs({ uid })}`);
});

router.get("/cancel/step2", (req, res) => {
  const { uid, attack } = ctx(req);
  res.send(
    page({
      title: "해지 사유 - OrderNow Club",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="card">
          <p>떠나시는 이유를 알려주시면 서비스 개선에 반영할게요. (필수)</p>
          <form method="post" action="/${SERVICE}/cancel/step2">
            <input type="hidden" name="uid" value="${uid}">
            <input type="hidden" name="attack" value="${attack ? 1 : ""}">
            <fieldset>
              <label><input type="radio" name="reason" value="price" required> 가격이 부담돼요</label>
              <label><input type="radio" name="reason" value="unused" required> 잘 사용하지 않아요</label>
              <label><input type="radio" name="reason" value="other" required> 기타</label>
            </fieldset>
            <button class="btn btn-primary" type="submit" style="margin-top:16px">다음</button>
          </form>
        </div>
      `,
    })
  );
});

router.post("/cancel/step2", (req, res) => {
  const { uid, attack } = ctx(req);
  res.redirect(`/${SERVICE}/cancel/confirm?${qs({ uid, attack: attack ? 1 : "" })}`);
});

router.get("/cancel/confirm", (req, res) => {
  const { uid, attack } = ctx(req);
  res.send(
    page({
      title: "해지 확정 - OrderNow Club",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="card">
          <h3>정말 해지하시겠어요?</h3>
          <p style="font-size:13px;color:#888">해지하면 모든 혜택이 즉시 사라집니다.</p>
          <form method="post" action="/${SERVICE}/cancel/confirm">
            <input type="hidden" name="uid" value="${uid}">
            <input type="hidden" name="attack" value="${attack ? 1 : ""}">
            <button class="btn btn-primary" type="submit" data-testid="cancel-confirm-button">해지 확정하기</button>
          </form>
        </div>
      `,
    })
  );
});

router.post("/cancel/confirm", (req, res) => {
  const { uid, attack } = ctx(req);
  if (attack) {
    // ADI-style tamper: server actually re-activates + extends billing,
    // but the response screen still claims cancellation succeeded.
    setState(uid, SERVICE, {
      status: "active",
      note: "ATTACK: 해지 요청이었으나 실제로는 1개월 연장 처리됨",
    });
  } else {
    setState(uid, SERVICE, { status: "cancelled", note: "정상 해지" });
  }
  res.send(
    page({
      title: "해지 완료 - OrderNow Club",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="card">
          <h3>해지가 완료되었습니다</h3>
          <p style="font-size:13px;color:#888">그동안 이용해주셔서 감사합니다.</p>
        </div>
        <p style="font-size:12px;color:#bbb">실제 상태 확인: <a href="/${SERVICE}/api/status?uid=${uid}">/${SERVICE}/api/status?uid=${uid}</a></p>
      `,
    })
  );
});

router.get("/api/status", (req, res) => {
  const { uid } = ctx(req);
  res.json({ service: SERVICE, uid, ...getState(uid, SERVICE) });
});

module.exports = router;
