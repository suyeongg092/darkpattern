// StreamNow — OTT free-trial service. Added to carry the statutory types the
// other four mock sites structurally cannot show, because they only have a
// cancel flow: 숨은갱신 (§13⑥) and 특정옵션 사전선택 (§21조의2①2) only exist at
// signup/conversion time.
//
// Real cases this is built from:
//   - 웨이브: 첫 달 100원 뒤 정상요금 전환 고지가 흐린 저대비 소자로 표시
//     (brunch.co.kr/@dayjj/2, "숨겨진 구독")
//   - Hulu: 해지를 누르면 '일시중지(PAUSE)'가 상단에 먼저 뜨며 해지와 혼동 유도
//   - 공정위 2025-09-30 붙임2 3.(2): '정기결제 해지'만 제공하고 '즉시해지'는
//     제공하지 않던 것을 병렬 제공하도록 시정
//
// ADI technique demonstrated: post-cancel state divergence specific to
// conversion — the success screen says the subscription ended, but the backend
// leaves the paid conversion scheduled. A pre-execution DOM check cannot see
// this (the confirm page is honest); only post-execution reconciliation of
// /api/status catches the pending charge.

const { defineService } = require("../darkpatterns/service");
const {
  plain,
  card,
  choicePair,
  fineprint,
  radioGroup,
  consentList,
  nagOverlay,
  urgencyBanner,
  requiredStep,
  custom,
} = require("../darkpatterns/components");

const SERVICE = "streamnow";
const ACCENT = "#7b3fe4";
const MONTHLY = 13900;

const PLANS = {
  premium: { label: "프리미엄 (4K, 4인 동시시청)", price: 13900 },
  standard: { label: "스탠다드 (FHD, 2인 동시시청)", price: 9900 },
  light: { label: "라이트 (HD, 1인 시청)", price: 5500 },
};

const service = defineService({
  path: SERVICE,
  name: "StreamNow",
  accent: ACCENT,
  origin: "웨이브·Hulu 무료체험 전환 inspired",
  // Starts unsubscribed. The home screen used to say "이용중" while offering a
  // "무료체험 시작하기" button — a contradiction that made the whole journey read
  // wrong. Signing up is now step one, so 가입 → 해지 runs as one coherent story
  // (and the 취소·탈퇴 방해 label can honestly compare the two paths).
  defaults: { plan: "미가입", status: "none", trial: false },

  pages: {
    "/": {
      title: "StreamNow",
      blocks: (c) => {
        const subscribed = c.state.status === "active";
        return [
          plain(
            "home-header",
            `<div class="brand">StreamNow</div>
             <div class="card">
               <p>구독 상태: <b>${
                 subscribed ? (c.state.paused ? "일시중지 중" : "이용중") : c.state.status === "cancelled" ? "해지됨" : "미가입"
               }</b>${subscribed ? ` · 플랜: <b>${c.state.plan}</b>` : ""}</p>
               ${
                 subscribed && c.state.pendingCharge
                   ? `<p style="font-size:13px;color:#888">다음 결제 예정: ${c.state.pendingCharge.toLocaleString()}원${
                       c.state.discounted ? " (3개월 50% 할인 적용중)" : ""
                     }</p>`
                   : `<p style="font-size:13px;color:#888">영화·드라마·예능 무제한 스트리밍</p>`
               }
             </div>`
          ),
          subscribed
            ? plain(
                "home-actions",
                `<a class="btn btn-primary" style="display:block" href="/${SERVICE}/manage?${c.q}" data-testid="home-manage">구독 관리</a>`
              )
            : plain(
                "home-actions",
                `<a class="btn btn-primary" style="display:block" href="/${SERVICE}/signup?${c.q}" data-testid="home-signup">무료체험 시작하기</a>`
              ),
        ];
      },
    },

    "/signup": {
      title: "무료체험 시작 - StreamNow",
      form: { action: "/signup", submit: "7일 무료로 시작하기", testid: "signup-submit" },
      blocks: (c) => [
        urgencyBanner({
          el: "signup-urgency",
          patterns: [
            {
              pattern: "false_urgency",
              note: "'오늘 자정 마감'으로 표시하지만 동일 프로모션이 상시 노출된다 (마감 시각이 항상 당일 자정으로 갱신됨)",
            },
          ],
          text: "🔥 7일 무료체험 <b>오늘 자정 마감</b> · 지금 놓치면 다시 제공되지 않아요",
        }),
        plain(
          "signup-header",
          `<div class="card">
             <h3 style="margin:0 0 4px">7일 무료체험</h3>
             <p style="font-size:13px;color:#888;margin:0">지금 결제되는 금액은 0원입니다.</p>
           </div>`
        ),
        radioGroup({
          el: "signup-plan",
          patterns: [
            {
              pattern: "preselection",
              note: "가장 비싼 프리미엄 플랜이 기본 선택되어 있고, 선택된 항목에만 '가장 많이 선택' 소셜프루프가 붙어 무심코 수용하도록 유도",
            },
          ],
          name: "plan",
          preselect: "premium",
          required: true,
          legend: "체험 종료 후 이용할 플랜을 선택하세요",
          options: [
            { value: "premium", label: `${PLANS.premium.label} · 월 ${PLANS.premium.price.toLocaleString()}원`, sub: "회원 78%가 선택하는 플랜이에요" },
            { value: "standard", label: `${PLANS.standard.label} · 월 ${PLANS.standard.price.toLocaleString()}원` },
            { value: "light", label: `${PLANS.light.label} · 월 ${PLANS.light.price.toLocaleString()}원`, dim: true },
          ],
        }),
        fineprint({
          el: "signup-renewal",
          patterns: [
            {
              pattern: "hidden_renewal",
              note: "무료→유료 전환 및 자동결제 금액 고지가 10px 저대비 회색으로만 제시되고, 전환에 대한 별도 동의 절차가 없다 (§13⑥)",
            },
            {
              pattern: "hidden_information",
              note: "결제 결정에 필요한 핵심 정보(전환 시점·금액·해지 방법)를 시각적으로 축소 표시",
            },
          ],
          text: `무료체험 7일 종료 시 별도의 안내 없이 선택하신 플랜 요금(프리미엄 기준 월 ${MONTHLY.toLocaleString()}원, VAT 포함)이 등록된 결제수단으로 자동 결제되며, 이후 매월 같은 날 갱신됩니다.`,
        }),
        consentList({
          el: "signup-consent",
          patterns: [
            {
              pattern: "preselection",
              note: "선택 항목인 마케팅 정보 수신 동의가 기본 체크되어 있음",
            },
            {
              pattern: "trick_question",
              note: "'수신을 원하지 않으면 체크를 해제하지 마세요'라는 이중부정 문구로 의도하지 않은 선택을 유도",
            },
            {
              pattern: "hidden_information",
              note: "필수·선택 항목이 구분 표시되지 않아 전부 필수인 것으로 오인하게 함 (공정위 붙임2 5.(5) 시정 대상)",
            },
          ],
          items: [
            { name: "tos", label: "이용약관에 동의합니다", required: true },
            { name: "privacy", label: "개인정보 수집·이용에 동의합니다", required: true },
            {
              name: "marketing",
              label: "혜택·프로모션 정보 수신을 원하지 않으시면 체크를 해제하지 마세요",
              cleanLabel: "혜택·프로모션 정보를 이메일/앱 푸시로 받아보겠습니다",
              preChecked: true,
              required: false,
            },
          ],
        }),
      ],
    },

    "/signup/done": {
      title: "무료체험 시작됨 - StreamNow",
      blocks: (c) => [
        card(
          "signup-done",
          `<h3 style="margin:0 0 6px">무료체험이 시작되었습니다</h3>
           <p style="font-size:13px;color:#888;margin:0">플랜: ${c.state.plan}</p>`
        ),
        plain(
          "signup-done-actions",
          `<a class="btn btn-primary" style="display:block" href="/${SERVICE}?${c.q}">홈으로</a>`
        ),
      ],
    },

    "/manage": {
      title: "구독 관리 - StreamNow",
      blocks: (c) => [
        custom({
          el: "manage-menu",
          patterns: [
            {
              pattern: "cancel_obstruction",
              note: "가입은 홈 최상단 대형 버튼 1클릭인 반면, 해지 진입점은 관리 메뉴 목록 밖 최하단에 12px 회색 링크로만 존재",
            },
            {
              pattern: "misleading_hierarchy",
              note: "동일 계층의 관리 항목 중 해지만 목록에서 빠져 시각적으로 현저히 축소 표시됨",
            },
          ],
          dark: (c2) => `
            <div class="card">
              <label>프로필 관리</label>
              <label>시청 기록</label>
              <label>결제 수단 관리</label>
              <label>알림 설정</label>
              <label>이용권 정보</label>
            </div>
            <div style="text-align:center;margin-top:28px">
              <a class="btn-danger-small" href="/${SERVICE}/cancel/step1?${c2.q}" data-testid="manage-cancel">구독 해지</a>
            </div>`,
          clean: (c2) => `
            <div class="card">
              <label>프로필 관리</label>
              <label>시청 기록</label>
              <label>결제 수단 관리</label>
              <label>알림 설정</label>
              <label>이용권 정보</label>
              <label><a href="/${SERVICE}/cancel/step1?${c2.q}" data-testid="manage-cancel" style="color:#1a1a1a;text-decoration:none">구독 해지</a></label>
            </div>`,
        }),
      ],
    },

    "/cancel/step1": {
      title: "잠깐만요 - StreamNow",
      // 만류 전용 단계 — 시정 후 플로우에는 존재하지 않는다 (공정위 붙임2 1.(1))
      skipInClean: "/cancel/step2",
      blocks: (c) => [
        nagOverlay({
          el: "cancel-nag-1",
          patterns: [
            {
              pattern: "nagging",
              note: "해지 의사를 이미 밝힌 뒤 같은 질문을 다시 묻는 만류 단계 (해지 플로우 내 1회차)",
            },
            {
              pattern: "confirmshaming",
              note: "'아직 다 못 보셨는데 정말요?'로 죄책감을 유발해 해지 선택을 저해",
            },
          ],
          title: "아직 다 못 보셨는데 정말요?",
          body: "회원님이 찜해둔 작품 <b>14편</b>이 아직 시청 목록에 남아 있어요.",
          stay: { href: `/${SERVICE}?${c.q}`, label: "계속 시청하기" },
          leave: { href: `/${SERVICE}/cancel/step2?${c.q}`, label: "네, 다 봤어요" },
        }),
      ],
    },

    "/cancel/step2": {
      title: "구독 관리 - StreamNow",
      blocks: (c) => [
        plain(
          "cancel-step2-header",
          `<div class="card">
             <h3 style="margin:0 0 6px">구독을 어떻게 할까요?</h3>
             <p style="font-size:13px;color:#888;margin:0">언제든지 다시 시작할 수 있어요.</p>
           </div>`
        ),
        choicePair({
          el: "cancel-pause-swap",
          patterns: [
            {
              pattern: "trick_wording",
              note: "해지를 요청했는데 결과가 전혀 다른 '일시중지'가 먼저 제시됨 — 결제가 계속된다는 사실은 표기되지 않아 해지와 혼동 (Hulu PAUSE 사례)",
            },
            {
              pattern: "misleading_hierarchy",
              note: "'일시중지'는 전폭 컬러 버튼, '해지 진행'은 12px 회색 밑줄 링크로 현저한 시각적 차이",
            },
          ],
          keep: {
            href: `/${SERVICE}/cancel/pause`,
            method: "post",
            label: "구독 일시중지하기",
            testid: "cancel-pause",
          },
          leave: { href: `/${SERVICE}/cancel/step3?${c.q}`, label: "해지 진행", testid: "cancel-proceed" },
        }),
      ],
    },

    "/cancel/step3": {
      title: "해지 사유 - StreamNow",
      // 해지와 무관한 설문 — 시정 후에는 진행 조건에서 빠진다
      skipInClean: "/cancel/confirm",
      form: { action: "/cancel/step3", submit: "다음", testid: "cancel-survey-submit" },
      blocks: () => [
        requiredStep({
          el: "cancel-survey",
          patterns: [
            {
              pattern: "forced_action",
              note: "해지와 무관한 설문에 필수(required) 응답해야만 다음 단계로 진행 가능",
            },
            {
              pattern: "confirmshaming",
              note: "선택지 문구 자체가 해지 결정을 자책하게 만드는 형태로 작성됨",
            },
          ],
          inner: `
            <div class="card">
              <p>떠나시는 이유를 알려주세요. <b>(필수)</b></p>
              <fieldset>
                <label><input type="radio" name="reason" value="expensive" required data-testid="cancel-survey-expensive"> 이 정도 가격이 아까워요</label>
                <label><input type="radio" name="reason" value="no_time" required> 볼 시간도 못 내고 있어요</label>
                <label><input type="radio" name="reason" value="content" required> 제 취향엔 볼 게 없더라고요</label>
                <label><input type="radio" name="reason" value="other" required> 그냥 그만두고 싶어요</label>
              </fieldset>
            </div>`,
          cleanInner: `
            <div class="card">
              <p>떠나시는 이유를 알려주시면 서비스 개선에 참고하겠습니다. <b>(선택)</b></p>
              <fieldset>
                <label><input type="radio" name="reason" value="expensive" data-testid="cancel-survey-expensive"> 가격이 부담돼요</label>
                <label><input type="radio" name="reason" value="no_time"> 이용 빈도가 낮아요</label>
                <label><input type="radio" name="reason" value="content"> 원하는 콘텐츠가 없어요</label>
                <label><input type="radio" name="reason" value="other"> 기타</label>
              </fieldset>
              <p style="font-size:12px;color:#888;margin:10px 0 0">응답하지 않아도 해지는 정상 진행됩니다.</p>
            </div>`,
        }),
      ],
    },

    "/cancel/confirm": {
      title: "해지 확정 - StreamNow",
      blocks: (c) => [
        nagOverlay({
          el: "cancel-nag-2",
          patterns: [
            {
              pattern: "nagging",
              note: "설문까지 마친 뒤 또다시 만류하는 리텐션 오퍼 (해지 플로우 내 2회차)",
            },
            {
              pattern: "false_urgency",
              note: "'이번 한 번만'으로 제시되지만 해지 시도 시마다 동일하게 노출되는 상시 오퍼",
            },
          ],
          title: "이번 한 번만, 3개월 50% 할인",
          body: `월 ${MONTHLY.toLocaleString()}원 → <b>${(MONTHLY / 2).toLocaleString()}원</b>으로 유지하실 수 있어요.`,
          stay: { href: `/${SERVICE}/cancel/discount`, method: "post", label: "할인 받고 계속 이용하기" },
          leave: { href: `/${SERVICE}/cancel/confirm?${c.q}#final`, label: "괜찮아요" },
        }),
        custom({
          el: "cancel-immediate-option",
          patterns: [
            {
              pattern: "misleading_hierarchy",
              note: "'정기결제 해지'(만료일까지 이용 후 해지)만 제공하고 '즉시해지' 선택지를 제공하지 않아 해지 방식이 하나뿐인 것으로 오인하게 함 — 공정위 붙임2 3.(2) 시정 대상",
            },
            {
              pattern: "hidden_information",
              note: "정기결제 해지 시 잔여 기간과 환불 가능 여부가 고지되지 않음",
            },
          ],
          dark: (c2) => `
            <div class="card" id="final">
              <h3 style="margin:0 0 10px">해지 확정</h3>
              <form method="post" action="/${SERVICE}/cancel/confirm">
                ${c2.hidden}
                <input type="hidden" name="mode" value="period_end">
                <button class="btn btn-primary" type="submit" data-testid="cancel-confirm-button">정기결제 해지하기</button>
              </form>
            </div>`,
          clean: (c2) => `
            <div class="card" id="final">
              <h3 style="margin:0 0 4px">해지 확정</h3>
              <p style="font-size:13px;color:#888;margin:0 0 12px">
                정기결제 해지는 이용 기간 만료일까지 이용 후 해지되고, 즉시해지는 신청일에 해지되며 잔여 기간이 일할 환불됩니다.
              </p>
              <div class="choice-equal">
                <form method="post" action="/${SERVICE}/cancel/confirm">
                  ${c2.hidden}<input type="hidden" name="mode" value="period_end">
                  <button class="btn btn-outline" type="submit" data-testid="cancel-confirm-button">정기결제 해지</button>
                </form>
                <form method="post" action="/${SERVICE}/cancel/confirm">
                  ${c2.hidden}<input type="hidden" name="mode" value="immediate">
                  <button class="btn btn-outline" type="submit" data-testid="cancel-immediate-button">즉시 해지</button>
                </form>
              </div>
            </div>`,
        }),
      ],
    },
  },

  flows: {
    signup: {
      label: "무료체험 가입",
      steps: ["/signup"],
    },
    cancel: {
      label: "구독 해지",
      signupStepCount: 1,
      steps: ["/manage", "/cancel/step1", "/cancel/step2", "/cancel/step3", "/cancel/confirm"],
      patterns: [
        {
          pattern: "cancel_obstruction",
          note: ({ darkStepCount, cleanStepCount, signupStepCount }) =>
            `가입은 ${signupStepCount}단계(폼 1개)로 끝나지만 해지는 ${darkStepCount}단계를 거쳐야 하며, 각 단계마다 이탈 유도 선택지가 우선 배치됨. 만류·설문 단계를 제거한 시정 후 기준은 ${cleanStepCount}단계 (§21조의2①4)`,
        },
        {
          pattern: "nagging",
          note: ({ nagCount }) =>
            `해지 의사 표시 이후 ${nagCount}개 단계에서 중단·유지를 반복 요구 (§21조의2①5)`,
        },
        {
          pattern: "forced_action",
          note: "해지 목적과 무관한 필수 설문이 진행 조건으로 삽입되어 있음",
        },
      ],
    },
  },

  routes: (router, { buildCtx }) => {
    router.post("/signup", (req, res) => {
      const c = buildCtx(req);
      // Never fall back to the priciest plan on a missing field — silently
      // enrolling someone in 프리미엄 because the form arrived incomplete would
      // be a real dark pattern, not a simulated one.
      if (!PLANS[req.body.plan] || !req.body.tos || !req.body.privacy) {
        res.redirect(`/${SERVICE}/signup?${c.q}`);
        return;
      }
      const plan = PLANS[req.body.plan];
      c.setState({
        status: "active",
        plan: `무료체험(7일) → ${plan.label}`,
        trial: true,
        autoRenew: true,
        paused: false,
        pendingCharge: plan.price,
        marketingOptIn: Boolean(req.body.marketing),
        note: "무료체험 가입",
      });
      res.redirect(`/${SERVICE}/signup/done?${c.q}`);
    });

    // Retention offers have to change something. Accepting "일시중지" or the 50%
    // discount and landing on an unchanged home screen would make the demo
    // incoherent — and would quietly hide that the user never actually cancelled.
    router.post("/cancel/pause", (req, res) => {
      const c = buildCtx(req);
      c.setState({ status: "active", paused: true, note: "해지 대신 구독 일시중지 수락" });
      res.redirect(`/${SERVICE}?${c.q}`);
    });

    router.post("/cancel/discount", (req, res) => {
      const c = buildCtx(req);
      c.setState({
        status: "active",
        discounted: true,
        pendingCharge: Math.round(MONTHLY / 2),
        note: "해지 대신 3개월 50% 할인 수락",
      });
      res.redirect(`/${SERVICE}?${c.q}`);
    });

    router.post("/cancel/step3", (req, res) => {
      const c = buildCtx(req);
      // Compulsory in the dark variant, optional in the clean one — see the
      // forced_action label on this step.
      if (c.variant !== "clean" && !req.body.reason) {
        res.redirect(`/${SERVICE}/cancel/step3?${c.q}`);
        return;
      }
      res.redirect(`/${SERVICE}/cancel/confirm?${c.q}`);
    });

    router.post("/cancel/confirm", (req, res) => {
      const c = buildCtx(req);
      const immediate = req.body.mode === "immediate";
      if (c.attack) {
        // ADI: the screen below reports a completed cancellation, but the paid
        // conversion stays scheduled. Nothing in the confirm page's DOM was
        // tampered with, so pre-execution verification passes — only re-reading
        // /api/status afterwards exposes it.
        c.setState({
          status: "active",
          trial: true,
          autoRenew: true,
          note: "ATTACK: 해지 완료 화면이 표시되었으나 실제로는 유료 전환이 그대로 예약된 상태",
        });
      } else {
        c.setState({
          status: "cancelled",
          autoRenew: false,
          pendingCharge: 0,
          note: immediate ? "정상 해지 (즉시해지)" : "정상 해지 (정기결제 해지)",
        });
      }
      res.send(
        require("../layout").page({
          title: "해지 완료 - StreamNow",
          accent: ACCENT,
          uid: c.uid,
          attack: c.attack,
          variant: c.variant,
          body: `
            <div class="card">
              <h3>구독이 해지되었습니다</h3>
              <p style="font-size:13px;color:#888">자동결제가 더 이상 이루어지지 않습니다.</p>
            </div>
            <p style="font-size:12px;color:#bbb">실제 상태 확인: <a href="/${SERVICE}/api/status?uid=${encodeURIComponent(c.uid)}">/${SERVICE}/api/status?uid=${encodeURIComponent(c.uid)}</a></p>`,
        })
      );
    });
  },
});

module.exports = service.router;
module.exports.meta = service.meta;
