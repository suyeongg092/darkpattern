// OrderNow Club — inspired by 배달의민족 배민클럽 멤버십 해지 플로우 (실제 캡처 기반으로
// 단계를 늘림: 메뉴 깊숙이 숨긴 해지 → 혜택 허브(쿠폰 나열 + 임박하지 않다는 프레이밍 +
// 항상 작고 테두리만인 해지 링크) → 손실회피 화면(지금까지 받은 혜택 + "남들보다 더 큰
// 혜택 받는 중" 비교 막대) → confirmshaming 설문(설문 중에도 쿠폰 재노출) → 최종 확인.
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
          <a class="btn-danger-small" href="/${SERVICE}/cancel/hub?${q}">멤버십 해지</a>
        </div>
      `,
    })
  );
});

// Step 1: the "hub" — same page real 배민클럽 uses. Buries the cancel link
// beneath a wall of coupons and a discount offer, and frames the next
// billing date as far enough away that there's "no rush" to decide.
router.get("/cancel/hub", (req, res) => {
  const { uid, attack } = ctx(req);
  const q = qs({ uid, attack: attack ? 1 : "" });
  res.send(
    page({
      title: "OrderNow Club 관리",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="card">
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee">
            <span>☕ 커피 및 배달쿠폰<br><span style="font-size:12px;color:#888">아메리카노 무료, 더하기 할인</span></span>
            <span style="color:#aaa;font-size:13px">바로가기 &gt;</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee">
            <span>🛍️ 구독 서비스 이용<br><span style="font-size:12px;color:#888">OTT 할인, 음악 스트리밍</span></span>
            <span style="color:#aaa;font-size:13px">바로가기 &gt;</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0">
            <span>🥬 신선식품 등 장보기 할인<br><span style="font-size:12px;color:#888">마트, 편의점</span></span>
            <span style="color:#aaa;font-size:13px">바로가기 &gt;</span>
          </div>
        </div>
        <div class="card" style="background:${ACCENT}18;border:1px solid ${ACCENT}55">
          <p style="margin:0;font-size:13px">카드 연결하면 클럽 이용료 <b>매월 500원 할인</b></p>
        </div>
        <form method="post" action="/${SERVICE}/cancel/keep">
          <input type="hidden" name="uid" value="${uid}">
          <input type="hidden" name="attack" value="${attack ? 1 : ""}">
          <button class="btn btn-primary" type="submit">클럽 전용 혜택 유지하기</button>
        </form>
        <button class="btn" style="display:block;width:100%;margin-top:8px;background:#fff;border:1px solid #ddd;color:#555" disabled>결제일 전 알림 받기</button>
        <p style="text-align:center;font-size:12px;color:#999;margin-top:10px">다음 결제일이 아직 3일 남았어요.<br>혜택을 더 이용하고 결정하세요.</p>
        <div style="text-align:center;margin-top:20px">
          <a class="btn-danger-small" href="/${SERVICE}/cancel/value-reminder?${q}">해지하기</a>
        </div>
      `,
    })
  );
});

router.post("/cancel/keep", (req, res) => {
  const { uid } = ctx(req);
  setState(uid, SERVICE, { status: "active", note: "리텐션 쿠폰/혜택 유지 수락" });
  res.redirect(`/${SERVICE}?${qs({ uid })}`);
});

// Step 2: sunk-cost + social-comparison framing before even reaching the
// reason survey — also lifted straight from the real flow.
router.get("/cancel/value-reminder", (req, res) => {
  const { uid, attack } = ctx(req);
  const q = qs({ uid, attack: attack ? 1 : "" });
  res.send(
    page({
      title: "잠깐만요 - OrderNow Club",
      accent: ACCENT,
      uid,
      attack,
      body: `
        <div class="card" style="text-align:center">
          <h3>지금까지 OrderNow Club으로<br>12,000원 혜택 받았어요</h3>
          <p style="font-size:13px;color:#888">배달 3번 무료로 시킬 수 있는 금액이에요!</p>
        </div>
        <div class="card">
          <p style="font-size:13px;font-weight:600;margin:0 0 10px">다른 사람들보다 더 큰 혜택을 받고 있어요!</p>
          <div style="font-size:12px;color:#888;display:flex;justify-content:space-between"><span>월 이용료</span><span>4,900원</span></div>
          <div style="height:8px;background:#eee;border-radius:4px;margin:4px 0 10px;overflow:hidden"><div style="width:22%;height:100%;background:#ccc"></div></div>
          <div style="font-size:12px;color:${ACCENT};display:flex;justify-content:space-between;font-weight:700"><span>예상 월 혜택</span><span>18,200원</span></div>
          <div style="height:8px;background:#eee;border-radius:4px;margin:4px 0;overflow:hidden"><div style="width:82%;height:100%;background:${ACCENT}"></div></div>
        </div>
        <form method="post" action="/${SERVICE}/cancel/keep">
          <input type="hidden" name="uid" value="${uid}">
          <input type="hidden" name="attack" value="${attack ? 1 : ""}">
          <button class="btn btn-primary" type="submit">계속 이용하기</button>
        </form>
        <div style="text-align:center;margin-top:16px">
          <a class="btn-ghost" href="/${SERVICE}/cancel/survey?${q}">그래도 해지할게요</a>
        </div>
      `,
    })
  );
});

router.get("/cancel/survey", (req, res) => {
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
          <form method="post" action="/${SERVICE}/cancel/survey" id="survey-form">
            <input type="hidden" name="uid" value="${uid}">
            <input type="hidden" name="attack" value="${attack ? 1 : ""}">
            <fieldset>
              <label><input type="radio" name="reason" value="dontknow" required> 어떻게 쓰는지 모르겠어요</label>
              <label><input type="radio" name="reason" value="fewer_orders" required> 배달 횟수가 줄었어요</label>
              <label><input type="radio" name="reason" value="benefit_lacking" required> 받을 수 있는 혜택이 부족해요</label>
              <label><input type="radio" name="reason" value="price" required> 이용료가 너무 비싸요</label>
              <label><input type="radio" name="reason" value="other" required> 기타 의견이 있어요</label>
            </fieldset>
          </form>
        </div>
        <div class="card" style="font-size:13px">
          <p style="margin:0 0 8px;font-weight:600">떠나시기 전에, 이번 주 쿠폰도 있어요</p>
          <div style="display:flex;justify-content:space-between;padding:6px 0"><span>☕ 스타벅스 아메리카노 무료</span><span style="color:#aaa">&gt;</span></div>
          <div style="display:flex;justify-content:space-between;padding:6px 0"><span>🛒 B마트 10% 할인 쿠폰</span><span style="color:#aaa">&gt;</span></div>
        </div>
        <button class="btn btn-primary" type="submit" form="survey-form" style="display:block;width:100%">다음</button>
      `,
    })
  );
});

router.post("/cancel/survey", (req, res) => {
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
