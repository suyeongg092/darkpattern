// OrderNow Club — inspired by 배달의민족 배민클럽 멤버십 해지 플로우.
//
// The flow keeps the real capture's shape: cancel buried in a management menu →
// benefits hub (coupon wall + "no rush" framing + an always-small cancel link) →
// loss-aversion screen (sunk cost + social comparison bar) → confirmshaming
// survey (coupons re-shown mid-survey) → final confirm.
//
// ADI technique demonstrated: the final success screen's text is decoupled from
// the actual server-side state change (displayed-result vs actual-state
// mismatch), which only post-execution reconciliation catches.
//
// NOTE: link/button texts and paths here are load-bearing for
// agent/src/executors/ordernowClub.js. Run scripts/check-contract.js after edits.

const { defineService } = require("../darkpatterns/service");
const { plain, custom, requiredStep } = require("../darkpatterns/components");

const SERVICE = "ordernow-club";
const ACCENT = "#2ac1bc";

const MENU = ["배송지 관리", "결제 수단 관리", "알림 설정", "쿠폰함", "이용 내역"];
const menuRow = (label, c) =>
  `<label><a href="/${SERVICE}?${c.q}" style="color:#1a1a1a;text-decoration:none">${label}</a></label>`;

const service = defineService({
  path: SERVICE,
  name: "OrderNow Club",
  accent: ACCENT,
  origin: "배달의민족 배민클럽 inspired",
  defaults: { plan: "클럽 멤버십" },

  pages: {
    "/": {
      title: "OrderNow Club",
      blocks: (c) => [
        plain(
          "home-header",
          `<div class="brand">OrderNow Club</div>
           <div class="card">
             <p>멤버십 상태: <b>${c.state.status === "active" ? "이용중" : "해지됨"}</b></p>
             <p style="font-size:13px;color:#888">무료배달, 매달 쿠폰팩, 알림 우선 노출 등 혜택 제공중</p>
           </div>`
        ),
        plain(
          "home-actions",
          `<a class="btn btn-primary" style="display:block" href="/${SERVICE}/manage?${c.q}" data-testid="home-manage">멤버십 관리</a>`
        ),
      ],
    },

    "/manage": {
      title: "멤버십 관리 - OrderNow Club",
      blocks: () => [
        custom({
          el: "manage-menu",
          patterns: [
            {
              pattern: "cancel_obstruction",
              note: "가입은 홈 대형 버튼 1클릭인 반면, 해지는 관리 메뉴 안에서도 목록 밖 최하단 12px 회색 링크로만 접근 가능",
            },
            {
              pattern: "misleading_hierarchy",
              note: "배송지·결제수단 등 동일 계층 항목은 목록 행으로 제공되는데 해지만 목록에서 제외되어 현저히 축소 표시됨",
            },
          ],
          // 메뉴 항목은 전부 눌리게 해둔다. 다크패턴은 "해지만 목록 밖으로 빼둔 것"이지
          // "메뉴가 작동하지 않는 것"이 아니라서, 나머지가 죽어 있으면 재현이 아니라 그냥
          // 미완성으로 보인다. 다크패턴과 무관한 항목은 서비스 홈으로 되돌린다.
          dark: (c) => `
            <div class="card">
              ${MENU.map((m) => menuRow(m, c)).join("\n              ")}
            </div>
            <div style="text-align:center;margin-top:24px">
              <a class="btn-danger-small" href="/${SERVICE}/cancel/hub?${c.q}" data-testid="manage-cancel">멤버십 해지</a>
            </div>`,
          clean: (c) => `
            <div class="card">
              ${MENU.map((m) => menuRow(m, c)).join("\n              ")}
              <label><a href="/${SERVICE}/cancel/hub?${c.q}" data-testid="manage-cancel" style="color:#1a1a1a;text-decoration:none">멤버십 해지</a></label>
            </div>`,
        }),
      ],
    },

    "/cancel/hub": {
      title: "OrderNow Club 관리",
      blocks: () => [
        custom({
          el: "hub-coupons",
          patterns: [
            {
              pattern: "cancel_obstruction",
              note: "해지 요청과 무관한 쿠폰·제휴 혜택 목록으로 화면을 채워 해지 진행 수단을 스크롤 아래로 밀어냄",
            },
          ],
          dark: (c) => `
            <div class="card">
              <a href="/ordernow-club?${c.q}" style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;color:inherit;text-decoration:none">
                <span>☕ 커피 및 배달쿠폰<br><span style="font-size:12px;color:#888">아메리카노 무료, 더하기 할인</span></span>
                <span style="color:#aaa;font-size:13px">바로가기 &gt;</span>
              </a>
              <a href="/ordernow-club?${c.q}" style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;color:inherit;text-decoration:none">
                <span>🛍️ 구독 서비스 이용<br><span style="font-size:12px;color:#888">OTT 할인, 음악 스트리밍</span></span>
                <span style="color:#aaa;font-size:13px">바로가기 &gt;</span>
              </a>
              <a href="/ordernow-club?${c.q}" style="display:flex;justify-content:space-between;padding:10px 0;color:inherit;text-decoration:none">
                <span>🥬 신선식품 등 장보기 할인<br><span style="font-size:12px;color:#888">마트, 편의점</span></span>
                <span style="color:#aaa;font-size:13px">바로가기 &gt;</span>
              </a>
            </div>
            <div class="card" style="background:${ACCENT}18;border:1px solid ${ACCENT}55">
              <p style="margin:0;font-size:13px">카드 연결하면 클럽 이용료 <b>매월 500원 할인</b></p>
            </div>`,
          clean: () => `
            <div class="card">
              <p style="margin:0;font-size:13px;color:#666">멤버십 해지 화면입니다. 해지 후에도 보유 중인 쿠폰은 유효기간까지 사용할 수 있습니다.</p>
            </div>`,
        }),
        custom({
          el: "hub-choice",
          patterns: [
            {
              pattern: "misleading_hierarchy",
              note: "'혜택 유지하기'는 전폭 컬러 버튼인 반면 '해지하기'는 12px 회색 밑줄 링크로만 제공되어 유지가 유일한 선택지처럼 보임",
            },
            {
              pattern: "nagging",
              note: "해지 메뉴 진입 직후 유지 제안을 먼저 요구 (해지 플로우 내 1회차)",
            },
            {
              pattern: "false_urgency",
              note: "'결제일이 3일 남았으니 더 이용하고 결정하라'며 결정을 지연시키는 프레이밍. 잔여일과 무관하게 항상 동일 문구가 노출됨",
            },
          ],
          dark: (c) => `
            <form method="post" action="/${SERVICE}/cancel/keep">
              {{HIDDEN}}
              <button class="btn btn-primary" type="submit" data-testid="hub-keep">클럽 전용 혜택 유지하기</button>
            </form>
            <a class="btn" style="display:block;width:100%;box-sizing:border-box;margin-top:8px;background:#fff;border:1px solid #ddd;color:#555" href="/${SERVICE}?${c.q}">결제일 전 알림 받기</a>
            <p style="text-align:center;font-size:12px;color:#999;margin-top:10px">다음 결제일이 아직 3일 남았어요.<br>혜택을 더 이용하고 결정하세요.</p>
            <div style="text-align:center;margin-top:20px">
              <a class="btn-danger-small" href="/${SERVICE}/cancel/value-reminder?${c.q}" data-testid="hub-cancel">해지하기</a>
            </div>`,
          clean: (c) => `
            <div class="choice-equal">
              <form method="post" action="/${SERVICE}/cancel/keep">
                {{HIDDEN}}
                <button class="btn btn-outline" type="submit" data-testid="hub-keep">멤버십 유지</button>
              </form>
              <a class="btn btn-outline" href="/${SERVICE}/cancel/value-reminder?${c.q}" data-testid="hub-cancel">멤버십 해지</a>
            </div>`,
        }),
      ],
    },

    "/cancel/value-reminder": {
      title: "잠깐만요 - OrderNow Club",
      // 손실회피 만류 전용 단계. 시정 후에 필요한 고지는 최종 확인 화면에 이미 있다.
      skipInClean: "/cancel/survey",
      blocks: () => [
        custom({
          el: "reminder-sunkcost",
          patterns: [
            {
              pattern: "confirmshaming",
              note: "'지금까지 12,000원 혜택을 받았다'는 매몰비용 프레이밍으로 해지 결정에 죄책감을 유발",
            },
            {
              pattern: "false_recommendation",
              note: "'다른 사람들보다 더 큰 혜택을 받고 있다'는 비교 막대의 예상 혜택 18,200원은 근거가 제시되지 않은 수치",
            },
            {
              pattern: "nagging",
              note: "해지 의사를 다시 밝힌 뒤에도 유지 제안을 반복 (해지 플로우 내 2회차)",
            },
          ],
          dark: (c) => `
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
              {{HIDDEN}}
              <button class="btn btn-primary" type="submit" data-testid="reminder-keep">계속 이용하기</button>
            </form>
            <div style="text-align:center;margin-top:16px">
              <a class="btn-ghost" href="/${SERVICE}/cancel/survey?${c.q}" data-testid="reminder-cancel">그래도 해지할게요</a>
            </div>`,
          clean: (c) => `
            <div class="card">
              <p style="margin:0 0 6px;font-weight:600">해지 전 확인해주세요</p>
              <p style="font-size:13px;color:#666;margin:0">해지하면 다음 결제일부터 무료배달·쿠폰팩 혜택이 제공되지 않습니다. 이미 발급된 쿠폰은 유효기간까지 사용할 수 있습니다.</p>
            </div>
            <div class="choice-equal">
              <form method="post" action="/${SERVICE}/cancel/keep">
                {{HIDDEN}}
                <button class="btn btn-outline" type="submit" data-testid="reminder-keep">계속 이용하기</button>
              </form>
              <a class="btn btn-outline" href="/${SERVICE}/cancel/survey?${c.q}" data-testid="reminder-cancel">해지 계속하기</a>
            </div>`,
        }),
      ],
    },

    "/cancel/survey": {
      title: "해지 사유 - OrderNow Club",
      skipInClean: "/cancel/confirm",
      blocks: () => [
        requiredStep({
          el: "survey-required",
          patterns: [
            {
              pattern: "forced_action",
              note: "해지와 무관한 사유 설문에 필수(required) 응답해야만 다음 단계로 진행 가능",
            },
          ],
          inner: `
            <div class="card">
              <p>떠나시는 이유를 알려주시면 서비스 개선에 반영할게요. (필수)</p>
              <form method="post" action="/${SERVICE}/cancel/survey" id="survey-form">
                {{HIDDEN}}
                <fieldset>
                  <label><input type="radio" name="reason" value="dontknow" required> 어떻게 쓰는지 모르겠어요</label>
                  <label><input type="radio" name="reason" value="fewer_orders" required> 배달 횟수가 줄었어요</label>
                  <label><input type="radio" name="reason" value="benefit_lacking" required> 받을 수 있는 혜택이 부족해요</label>
                  <label><input type="radio" name="reason" value="price" required> 이용료가 너무 비싸요</label>
                  <label><input type="radio" name="reason" value="other" required> 기타 의견이 있어요</label>
                </fieldset>
              </form>
            </div>`,
          cleanInner: `
            <div class="card">
              <p>떠나시는 이유를 알려주시면 서비스 개선에 반영할게요. (선택)</p>
              <form method="post" action="/${SERVICE}/cancel/survey" id="survey-form">
                {{HIDDEN}}
                <fieldset>
                  <label><input type="radio" name="reason" value="dontknow"> 어떻게 쓰는지 모르겠어요</label>
                  <label><input type="radio" name="reason" value="fewer_orders"> 배달 횟수가 줄었어요</label>
                  <label><input type="radio" name="reason" value="benefit_lacking"> 받을 수 있는 혜택이 부족해요</label>
                  <label><input type="radio" name="reason" value="price"> 이용료가 너무 비싸요</label>
                  <label><input type="radio" name="reason" value="other"> 기타 의견이 있어요</label>
                </fieldset>
              </form>
              <p style="font-size:12px;color:#888;margin:10px 0 0">응답하지 않아도 해지는 정상 진행됩니다.</p>
            </div>`,
        }),
        custom({
          el: "survey-coupons",
          patterns: [
            {
              pattern: "nagging",
              note: "해지 사유 설문 도중 다시 쿠폰을 노출해 유지를 재차 요구 (해지 플로우 내 3회차)",
            },
          ],
          dark: () => `
            <div class="card" style="font-size:13px">
              <p style="margin:0 0 8px;font-weight:600">떠나시기 전에, 이번 주 쿠폰도 있어요</p>
              <div style="display:flex;justify-content:space-between;padding:6px 0"><span>☕ 스타벅스 아메리카노 무료</span><span style="color:#aaa">&gt;</span></div>
              <div style="display:flex;justify-content:space-between;padding:6px 0"><span>🛒 B마트 10% 할인 쿠폰</span><span style="color:#aaa">&gt;</span></div>
            </div>`,
        }),
        plain(
          "survey-submit",
          `<button class="btn btn-primary" type="submit" form="survey-form" style="display:block;width:100%" data-testid="survey-next">다음</button>`
        ),
      ],
    },

    "/cancel/confirm": {
      title: "해지 확정 - OrderNow Club",
      blocks: () => [
        custom({
          el: "confirm-form",
          patterns: [
            {
              pattern: "confirmshaming",
              note: "'모든 혜택이 즉시 사라집니다'로 마지막까지 상실감을 강조",
            },
            {
              pattern: "hidden_information",
              note: "이미 발급된 쿠폰의 사용 가능 여부, 잔여 기간 환불 기준이 고지되지 않음",
            },
          ],
          // Must stay the first <form>: agent/src/executors/base.js reads
          // page.$eval("form") here.
          dark: () => `
            <div class="card">
              <h3>정말 해지하시겠어요?</h3>
              <p style="font-size:13px;color:#888">해지하면 모든 혜택이 즉시 사라집니다.</p>
              <form method="post" action="/${SERVICE}/cancel/confirm">
                {{HIDDEN}}
                <button class="btn btn-primary" type="submit" data-testid="cancel-confirm-button">해지 확정하기</button>
              </form>
            </div>`,
          clean: () => `
            <div class="card">
              <h3>해지를 확정합니다</h3>
              <p style="font-size:13px;color:#666">다음 결제일부터 요금이 청구되지 않으며, 이미 발급된 쿠폰은 유효기간까지 사용할 수 있습니다.</p>
              <form method="post" action="/${SERVICE}/cancel/confirm">
                {{HIDDEN}}
                <button class="btn btn-primary" type="submit" data-testid="cancel-confirm-button">해지 확정하기</button>
              </form>
            </div>`,
        }),
      ],
    },
  },

  flows: {
    cancel: {
      label: "멤버십 해지",
      signupStepCount: 1,
      steps: ["/manage", "/cancel/hub", "/cancel/value-reminder", "/cancel/survey", "/cancel/confirm"],
      patterns: [
        {
          pattern: "cancel_obstruction",
          note: ({ darkStepCount, cleanStepCount, signupStepCount }) =>
            `가입은 ${signupStepCount}단계로 끝나지만 해지는 ${darkStepCount}단계이며, 매 단계 유지 선택지가 시각적으로 우선 배치됨. 손실회피·설문 단계를 제거한 시정 후 기준은 ${cleanStepCount}단계 (§21조의2①4)`,
        },
        {
          pattern: "nagging",
          note: ({ nagCount }) => `해지 의사 표시 이후 ${nagCount}개 단계에서 유지·쿠폰 수령을 반복 요구 (§21조의2①5)`,
        },
      ],
    },
  },

  routes: (router, { buildCtx }) => {
    router.post("/cancel/keep", (req, res) => {
      const c = buildCtx(req);
      c.setState({ status: "active", retained: true, note: "리텐션 쿠폰/혜택 유지 수락" });
      res.redirect(`/${SERVICE}?${c.q}`);
    });

    router.post("/cancel/survey", (req, res) => {
      const c = buildCtx(req);
      // The dark variant makes the survey compulsory, so it has to actually
      // block — a "(필수)" label that lets an empty form through is just a bug,
      // and the forced_action label on this step would be describing nothing.
      // The clean variant marks it optional, so it passes either way.
      if (c.variant !== "clean" && !req.body.reason) {
        res.redirect(`/${SERVICE}/cancel/survey?${c.q}`);
        return;
      }
      res.redirect(`/${SERVICE}/cancel/confirm?${c.q}`);
    });

    router.post("/cancel/confirm", (req, res) => {
      const c = buildCtx(req);
      if (c.attack) {
        // ADI-style tamper: server actually re-activates + extends billing,
        // but the response screen still claims cancellation succeeded.
        c.setState({ status: "active", note: "ATTACK: 해지 요청이었으나 실제로는 1개월 연장 처리됨" });
      } else {
        c.setState({ status: "cancelled", note: "정상 해지" });
      }
      res.send(
        require("../layout").page({
          title: "해지 완료 - OrderNow Club",
          accent: ACCENT,
          uid: c.uid,
          attack: c.attack,
          variant: c.variant,
          body: `
            <div class="card">
              <h3>해지가 완료되었습니다</h3>
              <p style="font-size:13px;color:#888">그동안 이용해주셔서 감사합니다.</p>
            </div>
            <p style="font-size:12px;color:#bbb">실제 상태 확인: <a href="/${SERVICE}/api/status?uid=${encodeURIComponent(c.uid)}">/${SERVICE}/api/status?uid=${encodeURIComponent(c.uid)}</a></p>`,
        })
      );
    });
  },
});

module.exports = service.router;
module.exports.meta = service.meta;
