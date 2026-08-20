// ReadWell — the compliant control. A real service with a real subscription and
// a real cancel flow, built to the 공정위 시정 후 standard from the start. It has
// no dark variant and no attack mode: nothing here is meant to be caught.
//
// Why a whole service rather than just `?variant=clean`: a detector that answers
// "다크패턴입니다" to everything scores perfectly on a set made only of offenders.
// The clean variants already give the scorer that control group, but in a demo
// "이건 clean 버전입니다" is an explanation, whereas an ordinary-looking service
// the agent cancels in two clicks — and the detector stays silent on — is a
// demonstration.
//
// The harder requirement is that it must be *persuasive*. A control that is
// plain and unmarketed teaches the detector that tidy means honest, which is the
// shortcut this whole exercise exists to rule out. So ReadWell deliberately
// carries the shapes dark patterns usually take, each made transparent:
//
//   promotional banner   → 연간 플랜 제안. 월 결제 12개월 총액과 연 결제 금액을 나란히
//                          적어 절약액을 검산할 수 있게 하고, 두 선택지 모두 실제로
//                          상태를 바꾼다.
//   discount offer       → 20% 할인. 갱신 시점과 사전 고지 기간을 함께 밝힌다.
//   free trial           → 7일 무료. 전환 날짜와 금액을 수락 전에 명시하고, 수락한
//                          뒤의 화면도 같은 날짜를 표시한다.
//   marketing opt-in     → 기본 해제 + (선택) 표시. 선택 결과를 알림 설정에 노출한다.
//   recommendation rail  → 추천 근거를 함께 적는다.
//
// 전자책 분야로 둔 이유: 공정위 보도자료가 다루는 "OTT·음원·전자책 등 구독서비스"
// 중 전자책만 목업에 없었다.
//
// Compliance checklist this page set is built against (공정위 2025-09-30 붙임2):
//   1.(2)  계약을 웹에서 했으면 해지도 웹에서 — 전화 유도 없음
//   1.(1)  해지의사 재확인 '단계' 없음 — 관리 화면에서 두 번 만에 해지 완료
//   2.(2)  유료 전환·금액 변경은 동의·비동의를 병렬 제공
//   3.(2)  '정기결제 해지'와 '즉시해지'를 같은 크기로 병렬 제공
//   4.     첫 화면에 총액(부가세 포함) 표시 — 공급가·부가세 내역까지 함께
//   5.(5)  약관 동의 항목의 필수·선택 구분 표시
//
//   붙임2 1.(1)이 삭제하라고 한 것은 만류 화면이다: 혜택 상실을 강조하고, 설문을
//   끼워 넣고, 일시중지 같은 대안을 들이밀고, '계속 이용하기'를 크게 그리는 단계.
//   실수로 눌렀는지 묻는 확인 자체가 금지된 것은 아니다. 다만 확인을 페이지로 하나
//   더 만들면 '대조군이 재확인 단계를 갖고 있다'는 반론이 생기므로, 여기서는 단계를
//   늘리지 않고 같은 화면에서 오클릭을 막는다.
//
//     - 해지 방식은 기본 선택이 없는 radio 다. 잘못 눌러도 아무것도 일어나지 않는다
//     - 실제 처리는 별도의 제출 버튼을 눌러야 일어난다 (의도적 조작 2회)
//     - 서버도 mode 가 없으면 되돌려보낸다
//     - 그리고 되돌릴 수 있다: 예약은 취소, 즉시 해지는 재구독
//
//   만류와 다른 점은 확인 화면에 혜택 상실·설문·대안 제안이 하나도 없고, 두 선택지와
//   두 버튼의 시각적 무게가 같다는 것이다.
//
// 구독 상태는 세 가지다. 정기결제 해지를 `cancelled` 하나로 뭉뚱그리면, 9월 12일까지
// 이용할 수 있다고 안내해 놓고 그 자리에서 서재를 잠그는 화면이 나온다. 대조군에
// 고지와 실제가 어긋나는 화면이 있으면, 그걸 잡아낸 탐지기가 오탐으로 채점된다.
//
//   active     이용 중
//   scheduled  정기결제 해지 접수 — PERIOD_END 까지 그대로 이용, 갱신만 중단
//   cancelled  즉시 해지 — 오늘 종료, 잔여분 환불

const { defineService } = require("../darkpatterns/service");
const { custom } = require("../darkpatterns/components");
const { THEME, header, footer, bookTile, won } = require("./readWell/ui");
const {
  MONTHLY,
  ANNUAL,
  ANNUAL_LIST,
  ANNUAL_SAVE,
  READING,
  RECOMMEND,
  STATS,
  INVOICES,
  CARD,
  JOINED,
  NEXT_BILL,
  PERIOD_END,
  TODAY,
  TRIAL_DAYS,
  TRIAL_END,
  REFUND_IF_IMMEDIATE,
  CATALOG_SIZE,
  breakdown,
} = require("./readWell/data");

const SERVICE = "readwell";
const ACCENT = "#5A2A44";

// 상태 읽기를 한 곳에 모은다. 화면마다 status 를 직접 비교하면 상태가 하나 늘어날 때
// 어떤 화면은 갱신되고 어떤 화면은 남는다 — PrimeVault 에서 "해지했는데 일시중지 중"이
// 나온 원인이 정확히 그것이었다.
const isAnnual = (s) => s.billing === "annual";
const canRead = (s) => s.status === "active" || s.status === "scheduled";
const priceOf = (s) => (isAnnual(s) ? ANNUAL : MONTHLY);
const cycleOf = (s) => (isAnnual(s) ? "연 구독" : "월 구독");

// 계정 화면의 판형. 읽기 제품이라 사이드바를 두지 않고 본문 한 단으로 좁힌다.
function doc(c, { kicker, title, lede, body }) {
  return `<main class="shell doc"><div class="narrow">
    ${kicker ? `<div class="kicker">${kicker}</div>` : ""}
    <h1 class="title">${title}</h1>
    ${lede ? `<p class="lede">${lede}</p>` : ""}
    ${body}
  </div></main>`;
}

// 구독 요약. 항목 자체가 상태에 따라 달라진다 — 해지된 계정에 "매월 청구 9,900원"이
// 남아 있으면 요약이 아니라 오보다. 항목 이름은 그대로 두고 값만 "없음"으로 바꾸는
// 방식도 같은 문제를 만든다: 청구가 없는 계정에는 청구 줄이 있을 이유가 없다.
function summary(c) {
  const s = c.state;
  const card = `${CARD.issuer} ···· ${CARD.last4}`;
  const label = { active: "이용중", scheduled: "해지 예약", cancelled: "해지됨" }[s.status] || "해지됨";
  const rows = [["상태", `<span class="tag ${s.status === "active" ? "tag-on" : ""}">${label}</span>`]];
  if (s.status === "cancelled") {
    rows.push(
      ["플랜", "없음"],
      ["이용 종료일", TODAY],
      ["남은 청구", "없음"],
      ["등록된 결제 수단", card],
      ["구독 기간", `${JOINED} ~ ${TODAY}`]
    );
  } else if (s.status === "scheduled") {
    rows.push(
      ["플랜", cycleOf(s)],
      ["이용 종료일", PERIOD_END],
      ["남은 청구", "없음"],
      ["결제 수단", card],
      ["구독 시작", JOINED]
    );
  } else {
    rows.push(
      ["플랜", cycleOf(s)],
      [isAnnual(s) ? "연 청구" : "매월 청구", won(priceOf(s))],
      ["다음 결제일", `${s.nextBill} · ${won(priceOf(s))}`],
      ["결제 수단", card],
      ["구독 시작", JOINED]
    );
  }
  return `<div class="sec">
      <div class="sec-h"><h2>구독 정보</h2></div>
      <dl style="margin:0">
        ${rows.map(([k, v]) => `<div class="kv"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
      </dl>
    </div>`;
}

// 요금 명세. 총액만 적어 두면 "결제 단계에서 붙는 금액이 없다"를 검산할 수 없다.
// 순차공개 가격책정(§21조의2①1)의 정확한 반대편이라 대조군에 반드시 있어야 한다.
function priceTable(c) {
  const s = c.state;
  const b = breakdown(priceOf(s));
  const per = isAnnual(s) ? "연 구독료" : "월 구독료";
  // 해지된 계정에서 이 표는 청구서가 아니라 재구독 안내다. 제목과 합계 이름이 그걸
  // 말하지 않으면, 결제가 끝난 계정이 여전히 돈을 내는 것처럼 읽힌다.
  const head =
    s.status === "cancelled" ? "재구독 시 요금" : "요금 안내";
  const sum =
    s.status === "cancelled"
      ? "다시 구독하시면 매월"
      : s.status === "scheduled"
      ? "해지 전까지 청구되던 금액"
      : isAnnual(s)
      ? "1년마다 청구되는 금액"
      : "매월 청구되는 금액";
  const note =
    s.status === "cancelled"
      ? "지금은 청구되는 금액이 없습니다. 다시 구독하시면 위 금액이 적용되며, 별도로 추가되는 금액은 없습니다."
      : s.status === "scheduled"
      ? `정기결제가 해지되어 ${PERIOD_END} 이후에는 청구되지 않습니다. 종료일까지 추가로 청구되는 금액도 없습니다.`
      : "별도로 추가되는 금액이 없습니다. 요금이 바뀌면 최소 30일 전에 안내하고 동의를 다시 받습니다.";
  return `<div class="sec">
      <div class="sec-h"><h2>${head}</h2></div>
      <dl style="margin:0">
        <div class="kv"><dt>${per}</dt><dd>${won(b.net)}</dd></div>
        <div class="kv"><dt>부가세</dt><dd>${won(b.vat)}</dd></div>
        <div class="kv" style="font-weight:700"><dt>${sum}</dt><dd>${won(b.total)}</dd></div>
      </dl>
      <p class="fine" style="margin-top:10px">${note}</p>
    </div>`;
}

// 연간 플랜 제안. 설득적이되 검산 가능하고, 두 선택지가 모두 실제로 동작한다 —
// 아무 일도 일어나지 않는 '동의·비동의 병렬 제공'은 병렬 제공이 아니다.
function planOffer(c) {
  const s = c.state;
  // active 일 때만. 해지를 접수한 계정에 "연간으로 바꾸면 23,800원 아껴요"를 띄우면
  // 그건 요금제 안내가 아니라 만류다 — 대조군이 하면 안 되는 바로 그 행동이다.
  if (s.status !== "active") return "";
  if (isAnnual(s)) {
    return `<div class="promo">
        <div class="promo-l">
          <div class="promo-h">연 구독을 이용 중입니다</div>
          <p class="promo-p">다음 결제일 ${s.nextBill}에 ${won(ANNUAL)}이 청구됩니다.</p>
          <div class="promo-terms">
            월 결제로 언제든 되돌릴 수 있습니다. 되돌리면 다음 결제일부터 매월 ${won(MONTHLY)}이 청구됩니다.
          </div>
        </div>
        <div class="promo-r">
          <form method="post" action="/${SERVICE}/plan" style="margin:0;max-width:280px">
            {{HIDDEN}}<input type="hidden" name="choice" value="monthly">
            <button class="act act-quiet act-full" type="submit" data-testid="offer-monthly">월 결제로 변경</button>
          </form>
        </div>
      </div>`;
  }
  if (s.offerDismissed) return "";
  return `<div class="promo">
      <div class="promo-l">
        <div class="promo-h">연간 플랜으로 바꾸면 ${won(ANNUAL_SAVE)} 아낄 수 있어요</div>
        <p class="promo-p">같은 서비스, 결제 주기만 다릅니다.</p>
        <div class="promo-terms">
          연 결제는 다음 결제일 ${s.nextBill}부터 적용되며 1년마다 자동 갱신됩니다.
          갱신 30일 전에 이메일로 금액을 안내하고, 기간 중 해지하면 남은 개월 수만큼 일할 환불됩니다.
        </div>
      </div>
      <div class="promo-r">
        <dl style="margin:0">
          <div class="kv"><dt>월 결제 (현재) · 12개월 합계</dt><dd>${won(ANNUAL_LIST)}</dd></div>
          <div class="kv"><dt>연 결제</dt><dd>${won(ANNUAL)}</dd></div>
          <div class="kv"><dt>차액</dt><dd>${won(ANNUAL_SAVE)} (20%)</dd></div>
        </dl>
        <form method="post" action="/${SERVICE}/plan" style="margin:16px 0 0">
          {{HIDDEN}}
          <div class="act-row">
            <button class="act act-quiet" type="submit" name="choice" value="annual" data-testid="offer-annual">연간 플랜으로 변경</button>
            <button class="act act-quiet" type="submit" name="choice" value="keep" data-testid="offer-keep">월 결제 유지</button>
          </div>
        </form>
      </div>
    </div>`;
}

const service = defineService({
  path: SERVICE,
  name: "ReadWell",
  accent: ACCENT,
  origin: "전자책 구독 · 공정위 시정 기준 준수 사례",
  compliant: true,
  theme: THEME,
  chrome: { header, footer },
  defaults: {
    plan: `월 구독 (월 ${MONTHLY.toLocaleString()}원)`,
    billing: "monthly",
    nextBill: NEXT_BILL,
    marketingOptIn: false,
    offerDismissed: false,
  },

  pages: {
    // ── 서재 ─────────────────────────────────────────────────────────
    "/": {
      title: "ReadWell",
      // 홈은 네 덩어리로 쌓인다: 인사 → 다음에 할 일 → 서재 → 요금과 구독.
      // 블록마다 <div data-el> 이 감싸므로 하나의 그리드를 여러 블록에 걸쳐 열어둘
      // 수 없다. 그래서 각 덩어리가 자기 폭을 스스로 정한다.
      blocks: () => [
        custom({
          el: "home-header",
          patterns: [],
          dark: (c) => {
            const s = c.state;
            const title =
              s.status === "active"
                ? "읽던 곳부터 이어서"
                : s.status === "scheduled"
                ? "계속 읽으실 수 있어요"
                : "다시 시작해볼까요";
            const lede =
              s.status === "active"
                ? `전자책 ${CATALOG_SIZE.toLocaleString()}권과 오디오북을 제한 없이 읽을 수 있습니다.`
                : s.status === "scheduled"
                ? `정기결제가 해지되어 ${PERIOD_END}까지 이용하신 뒤 종료됩니다. 그때까지는 그대로 읽으실 수 있습니다.`
                : "구독이 종료되어 대여 중이던 책은 열람이 중지되었습니다. 읽던 진도와 메모는 그대로 보관되어 있습니다.";
            return `<div class="shell" style="padding-top:28px">
                <div class="kicker">2026년 8월</div>
                <h1 class="title">${title}</h1>
                <p class="lede">${lede}</p>
              </div>`;
          },
        }),
        custom({
          el: "home-actions",
          patterns: [],
          dark: (c) =>
            canRead(c.state)
              ? `<div class="shell" style="padding-top:18px">
                   <div class="act-row" style="max-width:420px">
                     <a class="act act-solid" href="/${SERVICE}?${c.q}">이어서 읽기</a>
                     <a class="act act-quiet" href="/${SERVICE}/manage?${c.q}" data-testid="home-manage">구독 관리</a>
                   </div>
                 </div>`
              : `<div class="shell" style="padding-top:18px">
                   <div style="max-width:320px">
                     <a class="act act-solid act-full" href="/${SERVICE}/resubscribe?${c.q}" data-testid="home-resubscribe">다시 구독하기</a>
                   </div>
                 </div>`,
        }),
        custom({
          el: "home-library",
          patterns: [],
          dark: (c) => {
            const on = canRead(c.state);
            return `<main class="shell doc" style="padding-top:10px;padding-bottom:0">
              ${
                on
                  ? `<div class="sec" style="margin-top:20px">
                       <div class="sec-h"><h2>읽는 중</h2><span>${READING.length}권</span></div>
                       <div class="shelf">${READING.map((b) => bookTile(b, c)).join("")}</div>
                     </div>`
                  : ""
              }
              <div class="sec"${on ? "" : ' style="margin-top:20px"'}>
                <div class="sec-h"><h2>이런 책은 어떠세요</h2><span>읽으신 책과 비슷한 주제</span></div>
                <div class="shelf">${RECOMMEND.map((b) => bookTile(b, c)).join("")}</div>
              </div>
              <div class="sec">
                <div class="sec-h"><h2>이번 달 기록</h2></div>
                <dl class="stats">
                  <div><dt>다 읽은 책</dt><dd>${STATS.booksFinished}권</dd></div>
                  <div><dt>읽은 시간</dt><dd>${Math.floor(STATS.minutes / 60)}시간 ${STATS.minutes % 60}분</dd></div>
                  <div><dt>연속 독서</dt><dd>${STATS.streakDays}일</dd></div>
                  <div><dt>하이라이트</dt><dd>${STATS.highlights}개</dd></div>
                </dl>
              </div>
            </main>`;
          },
        }),
        custom({
          el: "home-price",
          patterns: [],
          dark: (c) => `<main class="shell doc" style="padding-top:0">
              <div class="pair">${summary(c)}${priceTable(c)}</div>
              ${planOffer(c)}
            </main>`,
        }),
      ],
    },

    // ── 구독 관리 ────────────────────────────────────────────────────
    "/manage": {
      title: "구독 관리 - ReadWell",
      blocks: () => [
        custom({
          el: "manage-menu",
          patterns: [],
          // 해지가 다른 관리 항목과 같은 목록에, 같은 크기로 있다. 숨기지 않는 것이
          // 시정의 핵심이라 이 화면에서 바로 해지로 갈 수 있다. 이미 해지를 접수한
          // 뒤에는 같은 자리가 '예약 취소'가 된다 — 남아 있어도 아무 일도 하지 않는
          // 줄은 사용자에게도, 화면을 읽는 에이전트에게도 거짓말이다.
          dark: (c) => {
            const s = c.state;
            const lastRow =
              s.status === "active"
                ? `<a href="/${SERVICE}/cancel?${c.q}" data-testid="manage-cancel">구독 해지<span class="chev">›</span></a>`
                : s.status === "scheduled"
                ? `<form method="post" action="/${SERVICE}/plan" style="margin:0">
                     {{HIDDEN}}<input type="hidden" name="choice" value="resume">
                     <button class="act-txt" type="submit" data-testid="manage-resume">해지 예약 취소</button>
                     <span class="val">${PERIOD_END} 종료 예정</span>
                   </form>`
                : `<a href="/${SERVICE}/resubscribe?${c.q}" data-testid="manage-resubscribe">다시 구독하기<span class="chev">›</span></a>`;
            const when =
              s.status === "active"
                ? `${cycleOf(s)} · 다음 결제일 ${s.nextBill}`
                : s.status === "scheduled"
                ? `${cycleOf(s)} · ${PERIOD_END} 종료 예정`
                : `해지됨 · ${TODAY} 종료`;
            return doc(c, {
              kicker: "마이페이지",
              title: "구독 관리",
              lede: when,
              body: `${summary(c)}
                <div class="sec">
                  <div class="sec-h"><h2>계정</h2></div>
                  <div class="rows">
                    <a href="/${SERVICE}/manage?${c.q}">프로필 관리<span class="chev">›</span></a>
                    <a href="/${SERVICE}/manage?${c.q}">읽은 책 기록<span class="val">${STATS.booksFinished}권</span><span class="chev">›</span></a>
                    <a href="/${SERVICE}/manage?${c.q}">결제 수단 관리<span class="val">${CARD.issuer} ···· ${CARD.last4}</span><span class="chev">›</span></a>
                    <a href="/${SERVICE}/manage?${c.q}">알림 설정<span class="val">신간 소식 ${s.marketingOptIn ? "수신" : "수신 안 함"}</span><span class="chev">›</span></a>
                    ${lastRow}
                  </div>
                  <p class="fine" style="margin-top:12px">가입과 동일하게 웹에서 바로 해지할 수 있습니다. 전화 상담은 필요하지 않습니다.</p>
                </div>
                ${priceTable(c)}
                <div class="sec">
                  <div class="sec-h"><h2>결제 내역</h2><span>최근 ${INVOICES.length}건</span></div>
                  <dl style="margin:0">
                    ${INVOICES.map(
                      (v) => `<div class="kv"><dt>${v.date} · ${v.desc}<br><span class="fine">${v.no}</span></dt>
                        <dd>${won(v.amount)}<br><span class="fine">${v.state}</span></dd></div>`
                    ).join("")}
                  </dl>
                </div>`,
            });
          },
        }),
      ],
    },

    // ── 해지 ─────────────────────────────────────────────────────────
    "/cancel": {
      title: "구독 해지 - ReadWell",
      blocks: () => [
        custom({
          el: "cancel-options",
          patterns: [],
          dark: (c) => {
            // 이미 해지한 계정에 해지 버튼을 다시 보여주지 않는다.
            if (c.state.status !== "active") {
              const done = c.state.status === "scheduled";
              return doc(c, {
                kicker: "마이페이지 › 구독 관리",
                title: done ? "이미 해지가 접수되었습니다" : "이미 해지되었습니다",
                lede: done
                  ? `${PERIOD_END}까지 이용하신 뒤 종료됩니다. 추가로 하실 일은 없습니다.`
                  : "구독이 종료되어 더 이상 결제되지 않습니다.",
                body: `<div style="margin-top:22px;max-width:320px">
                    <a class="act act-quiet act-full" href="/${SERVICE}/manage?${c.q}" data-testid="cancel-back">구독 관리로</a>
                  </div>`,
              });
            }
            return doc(c, {
              kicker: "마이페이지 › 구독 관리",
              title: "구독을 해지합니다",
              lede: "해지 방식을 고르신 뒤 아래 버튼을 눌러주세요. 어느 쪽을 선택하셔도 위약금은 없습니다.",
              body: `<div class="note">
                  <b>해지 후에도</b>
                  읽던 책의 진도와 하이라이트 ${STATS.highlights}개는 그대로 보관되며, 구매하신 개별 도서는 계속 열람할 수 있습니다.
                </div>
                <div class="sec">
                  <div class="sec-h"><h2>해지 방식</h2></div>
                  <form method="post" action="/${SERVICE}/cancel" style="margin:0">
                    {{HIDDEN}}
                    <label class="chk">
                      <input type="radio" name="mode" value="period_end" required data-testid="cancel-period-end">
                      <span><b>정기결제 해지</b><br>
                        <span class="fine">${PERIOD_END}까지 그대로 이용하신 뒤 종료됩니다. 환불은 없습니다.</span></span>
                    </label>
                    <label class="chk">
                      <input type="radio" name="mode" value="immediate" required data-testid="cancel-immediate">
                      <span><b>즉시 해지</b><br>
                        <span class="fine">오늘 종료되고, 잔여 기간 ${won(REFUND_IF_IMMEDIATE)}을 3영업일 내 결제 수단으로 환불합니다.</span></span>
                    </label>
                    <p class="fine" style="margin-top:12px">
                      미리 선택된 항목은 없습니다. 버튼을 누르기 전까지는 아무것도 처리되지 않습니다.
                    </p>
                    <div class="act-row" style="margin-top:18px">
                      <button class="act act-quiet" type="submit" data-testid="cancel-submit">구독 해지하기</button>
                      <a class="act act-quiet" href="/${SERVICE}?${c.q}" data-testid="cancel-back">돌아가기</a>
                    </div>
                  </form>
                </div>`,
            });
          },
        }),
      ],
    },

    "/cancel/done": {
      title: "해지 완료 - ReadWell",
      blocks: () => [
        custom({
          el: "cancel-done",
          patterns: [],
          dark: (c) => {
            const scheduled = c.state.status === "scheduled";
            return doc(c, {
              kicker: "마이페이지 › 구독 관리",
              title: scheduled ? "해지가 접수되었습니다" : "해지가 완료되었습니다",
              lede: c.state.note || "",
              body: `<div class="sec">
                  <div class="sec-h"><h2>처리 내역</h2></div>
                  <dl style="margin:0">
                    <div class="kv"><dt>처리일</dt><dd>${TODAY}</dd></div>
                    <div class="kv"><dt>접수 번호</dt><dd>RW-C-260818-4471</dd></div>
                    <div class="kv"><dt>이용 종료일</dt><dd>${scheduled ? PERIOD_END : `${TODAY} (오늘)`}</dd></div>
                    <div class="kv"><dt>환불 예정</dt><dd>${c.state.refund ? won(c.state.refund) : "없음"}</dd></div>
                    <div class="kv"><dt>보관되는 기록</dt><dd>진도 · 하이라이트 ${STATS.highlights}개</dd></div>
                  </dl>
                  <p class="fine" style="margin-top:12px">${
                    scheduled
                      ? "생각이 바뀌시면 구독 관리에서 해지 예약을 취소하실 수 있습니다. 종료일까지는 언제든 가능합니다."
                      : "언제든 다시 구독하실 수 있고, 읽던 진도와 메모는 그대로 복원됩니다."
                  }</p>
                </div>`,
            });
          },
        }),
        custom({
          el: "cancel-done-actions",
          patterns: [],
          dark: (c) => `<div class="shell" style="padding-bottom:36px"><div class="narrow">
              <div class="act-row" style="max-width:420px">
                <a class="act act-solid" href="/${SERVICE}?${c.q}">홈으로</a>
                <a class="act act-quiet" href="/${SERVICE}/manage?${c.q}">구독 관리</a>
              </div>
            </div></div>`,
        }),
      ],
    },

    // ── 재구독 ───────────────────────────────────────────────────────
    "/resubscribe": {
      title: "다시 구독 - ReadWell",
      blocks: () => [
        custom({
          el: "resubscribe",
          patterns: [],
          // 무료 체험을 제안하되 전환 날짜와 금액을 수락 전에 밝힌다. 그리고 수락한
          // 뒤의 화면도 여기서 약속한 TRIAL_END 를 그대로 표시한다 — 고지와 실제가
          // 다르면 그건 대조군이 아니라 또 하나의 숨은갱신이다.
          dark: (c) => {
            if (canRead(c.state)) {
              return doc(c, {
                kicker: "구독",
                title: "이미 구독 중입니다",
                lede: `${cycleOf(c.state)}을 이용 중이라 다시 구독하실 필요가 없습니다.`,
                body: `${summary(c)}
                  <div style="margin-top:22px;max-width:320px">
                    <a class="act act-quiet act-full" href="/${SERVICE}?${c.q}">홈으로</a>
                  </div>`,
              });
            }
            return doc(c, {
              kicker: "구독",
              title: "다시 구독하기",
              lede: `전자책 ${CATALOG_SIZE.toLocaleString()}권과 오디오북을 제한 없이.`,
              body: `<div class="sec">
                  <div class="sec-h"><h2>${TRIAL_DAYS}일 무료 체험</h2><span>신규·재구독 회원</span></div>
                  <dl style="margin:0">
                    <div class="kv"><dt>오늘 결제되는 금액</dt><dd>0원</dd></div>
                    <div class="kv"><dt>체험 종료일</dt><dd>${TRIAL_END}</dd></div>
                    <div class="kv"><dt>첫 결제일 · 금액</dt><dd>${TRIAL_END} · ${won(MONTHLY)}</dd></div>
                    <div class="kv"><dt>이후</dt><dd>매월 같은 날 ${won(MONTHLY)} (부가세 포함)</dd></div>
                  </dl>
                  <div class="note">
                    <b>체험 종료 전 안내</b>
                    유료 전환 3일 전에 이메일과 앱 알림으로 금액과 날짜를 다시 안내합니다. 체험 기간 중 해지하면 요금이 청구되지 않습니다.
                  </div>
                </div>
                ${priceTable(c)}
                <div class="sec">
                  <div class="sec-h"><h2>동의 항목</h2></div>
                  <form method="post" action="/${SERVICE}/resubscribe" style="margin:0">
                    {{HIDDEN}}
                    <label class="chk">
                      <input type="checkbox" name="tos" required data-testid="resubscribe-tos">
                      <span><b>(필수)</b> 이용약관 및 체험 종료 후 자동결제에 동의합니다</span>
                    </label>
                    <label class="chk">
                      <input type="checkbox" name="marketing" data-testid="resubscribe-marketing">
                      <span><b>(선택)</b> 신간 소식과 추천을 이메일로 받아보겠습니다</span>
                    </label>
                    <div style="margin-top:18px;max-width:420px">
                      <button class="act act-solid act-full" type="submit" data-testid="resubscribe-submit">${TRIAL_DAYS}일 무료로 시작 · 이후 월 ${MONTHLY.toLocaleString()}원</button>
                    </div>
                    <p class="fine" style="margin-top:10px">해지는 마이페이지에서 언제든 가능하며, 별도 절차나 전화 상담이 필요하지 않습니다.</p>
                  </form>
                </div>`,
            });
          },
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
      // 방식을 고르지 않았으면 아무 일도 일어나지 않는다. 화면의 radio required 만
      // 믿으면 폼을 직접 던졌을 때 기본값 쪽으로 해지가 성립해 버린다.
      if (req.body.mode !== "period_end" && req.body.mode !== "immediate") {
        res.redirect(`/${SERVICE}/cancel?${c.q}`);
        return;
      }
      const immediate = req.body.mode === "immediate";
      c.setState(
        immediate
          ? {
              status: "cancelled",
              autoRenew: false,
              refund: REFUND_IF_IMMEDIATE,
              note: `즉시 해지 · 잔여 기간 ${REFUND_IF_IMMEDIATE.toLocaleString()}원이 3영업일 내 환불됩니다.`,
            }
          : {
              // 갱신만 멈춘다. 이미 결제한 기간은 그대로 쓸 수 있어야 한다.
              status: "scheduled",
              autoRenew: false,
              refund: 0,
              note: `정기결제 해지 · ${PERIOD_END}까지 이용하신 뒤 종료됩니다. 그때까지는 그대로 읽으실 수 있습니다.`,
            }
      );
      res.redirect(`/${SERVICE}/cancel/done?${c.q}`);
    });

    // 요금제 선택과 해지 예약 취소. 화면에 나란히 놓인 선택지는 전부 여기로 오고,
    // 전부 상태를 실제로 바꾼다. '월 결제 유지'는 제안을 닫는 것이 그 결과다.
    router.post("/plan", (req, res) => {
      const c = buildCtx(req);
      const choice = req.body.choice;
      if (choice === "annual") {
        c.setState({ billing: "annual", plan: `연 구독 (연 ${ANNUAL.toLocaleString()}원)`, offerDismissed: false });
      } else if (choice === "monthly") {
        c.setState({ billing: "monthly", plan: `월 구독 (월 ${MONTHLY.toLocaleString()}원)`, offerDismissed: false });
      } else if (choice === "keep") {
        c.setState({ offerDismissed: true });
      } else if (choice === "resume") {
        c.setState({ status: "active", autoRenew: true, refund: 0, note: "해지 예약이 취소되었습니다." });
      }
      res.redirect(`/${SERVICE}${choice === "resume" ? "/manage" : ""}?${c.q}`);
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
        billing: "monthly",
        plan: `월 구독 (월 ${MONTHLY.toLocaleString()}원)`,
        // 재구독 화면이 약속한 날짜를 그대로 쓴다.
        nextBill: TRIAL_END,
        marketingOptIn: Boolean(req.body.marketing),
        offerDismissed: false,
        note: "재구독",
      });
      res.redirect(`/${SERVICE}?${c.q}`);
    });
  },
});

module.exports = service.router;
module.exports.meta = service.meta;
