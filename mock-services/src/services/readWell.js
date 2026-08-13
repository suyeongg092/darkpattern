// ReadWell — the compliant control. A real service with a real subscription and
// a real cancel flow, built to the 공정위 시정 후 standard from the start. It has
// no dark variant and no attack mode: nothing here is meant to be caught.
//
// Why a whole site rather than just relying on `?variant=clean`: a detector that
// answers "다크패턴입니다" to everything scores 100% on an evaluation set made
// only of offenders. The clean variants already give us that control group for
// scoring, but in a live demo "이건 clean 버전입니다" is an explanation, whereas an
// ordinary-looking service the agent cancels in three clicks — and the detector
// stays silent on — is a demonstration.
//
// 전자책 분야로 둔 이유: 공정위 보도자료가 다루는 "OTT·음원·전자책 등 구독서비스"
// 중 전자책만 목업에 없었다.
//
// Compliance checklist this page set is built against (공정위 2025-09-30 붙임2):
//   1.(2)  계약을 웹에서 했으면 해지도 웹에서 — 전화 유도 없음
//   1.(1)  해지의사 재확인 단계 없음 — 관리 메뉴에서 두 번 만에 해지 완료
//   2.(2)  유료 전환·금액 변경은 '동의'·'비동의' 병렬 제공
//   3.(2)  '정기결제 해지'와 '즉시해지'를 같은 크기로 병렬 제공
//   4.     첫 화면에 총액(부가세 포함) 표시
//   5.(5)  약관 동의 항목의 필수·선택 구분 표시

const { defineService } = require("../darkpatterns/service");
const { plain, card, custom } = require("../darkpatterns/components");

const SERVICE = "readwell";
const ACCENT = "#1f7a5c";
const MONTHLY = 9900;

const service = defineService({
  path: SERVICE,
  name: "ReadWell",
  accent: ACCENT,
  origin: "전자책 구독 · 공정위 시정 기준 준수 사례",
  compliant: true,
  defaults: { plan: `월 구독 (월 ${MONTHLY.toLocaleString()}원)` },

  pages: {
    "/": {
      title: "ReadWell",
      blocks: (c) => {
        const active = c.state.status === "active";
        return [
          plain(
            "home-header",
            `<div class="brand">ReadWell</div>
             <div class="card">
               <p>구독 상태: <b>${active ? "이용중" : "해지됨"}</b>${active ? ` · ${c.state.plan}` : ""}</p>
               <p style="font-size:13px;color:#888;margin-top:4px">전자책 12만 권 무제한 · 오디오북 포함</p>
               ${
                 active
                   ? `<p style="font-size:13px;color:#666;margin-top:10px">
                        다음 결제일 <b>2026-09-13</b> · 결제 금액 <b>${MONTHLY.toLocaleString()}원</b> (부가세 포함)
                      </p>`
                   : `<p style="font-size:13px;color:#666;margin-top:10px">
                        해지되어 더 이상 결제되지 않습니다. 다시 구독하면 읽던 책과 메모가 그대로 복원됩니다.
                      </p>`
               }
             </div>`
          ),
          // 총액을 첫 화면에 그대로 — 결제 단계에서 추가되는 금액이 없다.
          card(
            "home-price",
            `<p style="margin:0 0 8px;font-weight:600">요금 안내</p>
             <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span>월 구독료</span><span>${(
               MONTHLY / 1.1
             ).toLocaleString(undefined, { maximumFractionDigits: 0 })}원</span></div>
             <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span>부가세</span><span>${(
               MONTHLY - MONTHLY / 1.1
             ).toLocaleString(undefined, { maximumFractionDigits: 0 })}원</span></div>
             <div style="display:flex;justify-content:space-between;padding:10px 0 0;border-top:1px solid #eee;font-weight:700"><span>매월 청구 금액</span><span>${MONTHLY.toLocaleString()}원</span></div>
             <p style="font-size:12px;color:#888;margin:10px 0 0">별도로 추가되는 금액이 없습니다. 요금 변경 시 최소 30일 전에 동의를 다시 받습니다.</p>`
          ),
          plain(
            "home-actions",
            active
              ? `<a class="btn btn-primary" style="display:block" href="/${SERVICE}/manage?${c.q}" data-testid="home-manage">구독 관리</a>`
              : `<a class="btn btn-primary" style="display:block" href="/${SERVICE}/resubscribe?${c.q}" data-testid="home-resubscribe">다시 구독하기</a>`
          ),
        ];
      },
    },

    "/manage": {
      title: "구독 관리 - ReadWell",
      blocks: (c) => [
        // 해지가 다른 관리 항목과 같은 목록에, 같은 크기로 있다. 숨기지 않는 것이
        // 시정의 핵심이라 이 화면에서 바로 해지로 갈 수 있다.
        custom({
          el: "manage-menu",
          patterns: [],
          dark: (c2) => `
            <div class="card">
              <label><a href="#" style="color:#1a1a1a;text-decoration:none">프로필 관리</a></label>
              <label><a href="#" style="color:#1a1a1a;text-decoration:none">읽은 책 기록</a></label>
              <label><a href="#" style="color:#1a1a1a;text-decoration:none">결제 수단 관리</a></label>
              <label><a href="#" style="color:#1a1a1a;text-decoration:none">알림 설정</a></label>
              <label><a href="/${SERVICE}/cancel?${c2.q}" style="color:#1a1a1a;text-decoration:none" data-testid="manage-cancel">구독 해지</a></label>
            </div>
            <p style="font-size:12px;color:#888;text-align:center">
              가입과 동일하게 웹에서 바로 해지할 수 있습니다. 전화 상담은 필요하지 않습니다.
            </p>`,
        }),
      ],
    },

    "/cancel": {
      title: "구독 해지 - ReadWell",
      blocks: () => [
        custom({
          el: "cancel-options",
          patterns: [],
          dark: (c) => `
            <div class="card">
              <h3 style="margin:0 0 6px">구독을 해지합니다</h3>
              <p style="font-size:13px;color:#666;margin:0 0 14px">
                해지 방식을 선택해주세요. 어느 쪽을 선택하셔도 위약금은 없습니다.
              </p>
              <div class="notice" style="margin-top:0">
                <b>해지 후에도</b>
                <p style="margin:4px 0 0;font-size:13px;color:#1a1a1a">
                  읽던 책의 진도와 메모는 보관되며, 구매하신 개별 도서는 계속 열람할 수 있습니다.
                </p>
              </div>
              <div class="choice-equal" style="margin-top:14px">
                <form method="post" action="/${SERVICE}/cancel" style="margin:0">
                  ${c.hidden}<input type="hidden" name="mode" value="period_end">
                  <button class="btn btn-outline" style="width:100%" type="submit" data-testid="cancel-period-end">정기결제 해지</button>
                </form>
                <form method="post" action="/${SERVICE}/cancel" style="margin:0">
                  ${c.hidden}<input type="hidden" name="mode" value="immediate">
                  <button class="btn btn-outline" style="width:100%" type="submit" data-testid="cancel-immediate">즉시 해지</button>
                </form>
              </div>
              <p style="font-size:12px;color:#888;margin:12px 0 0">
                정기결제 해지는 2026-09-12까지 이용 후 종료됩니다. 즉시 해지는 오늘 종료되며 잔여 기간 <b>4,620원</b>이 3영업일 내 환불됩니다.
              </p>
            </div>
            <div style="text-align:center;margin-top:16px">
              <a class="btn-ghost" href="/${SERVICE}?${c.q}" data-testid="cancel-back">돌아가기</a>
            </div>`,
        }),
      ],
    },

    "/cancel/done": {
      title: "해지 완료 - ReadWell",
      blocks: (c) => [
        card(
          "cancel-done",
          `<h3 style="margin:0 0 6px">해지가 완료되었습니다</h3>
           <p style="font-size:13px;color:#666;margin:0">${c.state.note || ""}</p>`
        ),
        plain(
          "cancel-done-actions",
          `<a class="btn btn-primary" style="display:block" href="/${SERVICE}?${c.q}">홈으로</a>`
        ),
      ],
    },

    "/resubscribe": {
      title: "다시 구독 - ReadWell",
      blocks: () => [
        custom({
          el: "resubscribe",
          patterns: [],
          dark: (c) => `
            <div class="card">
              <h3 style="margin:0 0 6px">다시 구독하기</h3>
              <p style="font-size:13px;color:#666;margin:0 0 4px">매월 <b>${MONTHLY.toLocaleString()}원</b>(부가세 포함)이 결제됩니다.</p>
              <p style="font-size:13px;color:#666;margin:0 0 14px">무료 체험 기간이나 자동 전환되는 프로모션 요금은 없습니다.</p>
              <form method="post" action="/${SERVICE}/resubscribe" style="margin:0">
                ${c.hidden}
                <fieldset>
                  <label><input type="checkbox" name="tos" required data-testid="resubscribe-tos"> <b>(필수)</b> 이용약관 및 자동결제에 동의합니다</label>
                  <label><input type="checkbox" name="marketing" data-testid="resubscribe-marketing"> <b>(선택)</b> 신간 소식을 이메일로 받아보겠습니다</label>
                </fieldset>
                <button class="btn btn-primary" style="margin-top:14px" type="submit" data-testid="resubscribe-submit">월 ${MONTHLY.toLocaleString()}원으로 구독하기</button>
              </form>
            </div>`,
        }),
      ],
    },
  },

  flows: {
    cancel: {
      label: "구독 해지",
      signupStepCount: 1,
      steps: ["/manage", "/cancel"],
    },
  },

  routes: (router, { buildCtx }) => {
    router.post("/cancel", (req, res) => {
      const c = buildCtx(req);
      const immediate = req.body.mode === "immediate";
      c.setState({
        status: "cancelled",
        autoRenew: false,
        refund: immediate ? 4620 : 0,
        note: immediate
          ? "즉시 해지 · 잔여 기간 4,620원이 3영업일 내 환불됩니다."
          : "정기결제 해지 · 2026-09-12까지 이용 후 종료됩니다.",
      });
      res.redirect(`/${SERVICE}/cancel/done?${c.q}`);
    });

    router.post("/resubscribe", (req, res) => {
      const c = buildCtx(req);
      if (!req.body.tos) {
        res.redirect(`/${SERVICE}/resubscribe?${c.q}`);
        return;
      }
      c.setState({
        status: "active",
        autoRenew: true,
        refund: 0,
        marketingOptIn: Boolean(req.body.marketing),
        note: "재구독",
      });
      res.redirect(`/${SERVICE}?${c.q}`);
    });
  },
});

module.exports = service.router;
module.exports.meta = service.meta;
