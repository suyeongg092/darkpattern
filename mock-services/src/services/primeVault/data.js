// Fictional membership data for PrimeVault.
//
// The retention flow quotes two numbers — "이번 달 놓치신 특가가 12개" and
// "무료배송+특가 혜택 31,000원" — and neither had anything behind it. An
// unsupported figure reads as a placeholder, and the loss-framing pattern it is
// meant to demonstrate has nothing to re-frame. Both are derived here: the deals
// list has exactly twelve unclaimed entries, and the benefit lines sum to 31,000.
//
// Product names, order numbers and partner names are invented.

const MONTHLY = 8900;
const DISCOUNTED = Math.round(MONTHLY / 2); // 4,450원

// 이번 달 혜택 명세. 합계가 만류 화면이 인용하는 31,000원이다.
const BENEFITS = [
  { label: "무료배송", detail: "14회 이용", saved: 19600 },
  { label: "회원 특가", detail: "6건 구매", saved: 8400 },
  { label: "스트리밍 포함", detail: "12시간 시청", saved: 3000 },
];
const SAVED_TOTAL = BENEFITS.reduce((a, b) => a + b.saved, 0); // 31,000원

// step1 이 말하는 "놓치신 특가". 정확히 12개여야 그 문구가 사실이 된다.
const DEALS = [
  { name: "무선 이어버드 3세대", was: 149000, now: 98000, ends: "8월 20일" },
  { name: "스테인리스 보온병 1L", was: 42000, now: 26900, ends: "8월 19일" },
  { name: "여행용 캐리어 24인치", was: 189000, now: 119000, ends: "8월 22일" },
  { name: "블루투스 키보드", was: 78000, now: 49900, ends: "8월 20일" },
  { name: "러닝화 에어쿠션", was: 129000, now: 79000, ends: "8월 21일" },
  { name: "공기청정기 필터 2입", was: 58000, now: 38900, ends: "8월 24일" },
  { name: "전동 칫솔 리필 8입", was: 36000, now: 23400, ends: "8월 19일" },
  { name: "노트북 스탠드 알루미늄", was: 45000, now: 28900, ends: "8월 23일" },
  { name: "캠핑 랜턴 충전식", was: 62000, now: 39900, ends: "8월 25일" },
  { name: "실리콘 조리도구 6종", was: 34000, now: 21900, ends: "8월 20일" },
  { name: "차량용 무선충전 거치대", was: 52000, now: 33900, ends: "8월 26일" },
  { name: "요가매트 6mm", was: 39000, now: 24900, ends: "8월 22일" },
];

const ORDERS = [
  { no: "PV-26-0816-7741", date: "08-16", name: "무선 이어버드 2세대 외 1건", paid: 132000, shipSaved: 3000 },
  { no: "PV-26-0812-7395", date: "08-12", name: "주방 세제 대용량", paid: 18900, shipSaved: 3000 },
  { no: "PV-26-0807-7018", date: "08-07", name: "러닝 양말 5족", paid: 22000, shipSaved: 2600 },
  { no: "PV-26-0801-6644", date: "08-01", name: "전동 칫솔 본체", paid: 89000, shipSaved: 3000 },
];

// 멤버십에 포함된 것. 종료 시 무엇이 사라지는지 확인 가능해야 한다.
const PERKS = [
  { name: "무료배송", detail: "횟수 제한 없음 · 도서산간 제외" },
  { name: "회원 특가", detail: "매주 12개 품목 · 최대 45% 할인" },
  { name: "스트리밍", detail: "영화·드라마 4천 편 · 광고 없음" },
  { name: "빠른 반품", detail: "수거비 무료 · 30일 이내" },
];

const JOINED = "2024-11-02";
const NEXT_BILL = "2026-09-02";


// ── 계정 포털을 채우는 자료 ────────────────────────────────────────────
// 멤버십 제품은 사용자가 "관리"하러 오는 곳이라, 결제수단·청구 이력·가구
// 구성원·보안 세션 같은 것이 실제로 있어야 몇 년 된 서비스로 읽힌다.

const PLAN = "PrimeVault 스탠다드";
const CARD = { issuer: "신한카드", last4: "2198", expiry: "05/29" };
const BILL_DAY = 2;

const INVOICES = [
  { date: "2026. 08. 02", desc: PLAN, amount: MONTHLY, state: "결제 완료", no: "PV-INV-260802-8841" },
  { date: "2026. 07. 02", desc: PLAN, amount: MONTHLY, state: "결제 완료", no: "PV-INV-260702-8402" },
  { date: "2026. 06. 02", desc: PLAN, amount: MONTHLY, state: "결제 완료", no: "PV-INV-260602-7977" },
  { date: "2026. 05. 02", desc: PLAN, amount: MONTHLY, state: "결제 완료", no: "PV-INV-260502-7530" },
  { date: "2026. 04. 02", desc: PLAN, amount: MONTHLY, state: "재시도 후 완료", no: "PV-INV-260402-7108" },
  { date: "2026. 03. 02", desc: PLAN, amount: MONTHLY, state: "결제 완료", no: "PV-INV-260302-6671" },
];

const HOUSEHOLD = [
  { name: "김민지", role: "대표 회원", since: "2024. 11. 03", shared: "전체" },
  { name: "박도윤", role: "구성원", since: "2025. 03. 18", shared: "배송·회원가" },
];
const HOUSEHOLD_MAX = 4;

// 혜택 목록. 종료 확인 화면이 "무엇이 끝나는가"를 구체적으로 말할 수 있어야 한다.
const BENEFIT_GROUPS = [
  {
    group: "배송 혜택",
    items: [
      { name: "무료 배송", detail: "15,000원 이상 주문 · 횟수 제한 없음", state: "이용 가능" },
      { name: "당일 배송 할인", detail: "수도권·광역시 일부 지역", state: "이용 가능" },
    ],
  },
  {
    group: "회원가 및 제휴",
    items: [
      { name: "회원 전용가", detail: "대상 상품에 자동 적용", state: "적용 중" },
      { name: "이달의 제휴 혜택", detail: "8월 31일까지", state: "미사용" },
    ],
  },
  {
    group: "지원 및 가구",
    items: [
      { name: "우선 상담", detail: "대기 없이 연결 · 평일 09~21시", state: "이용 가능" },
      { name: "가구 공유", detail: `최대 ${HOUSEHOLD_MAX}명까지 혜택 공유`, state: "2명 사용 중" },
    ],
  },
];

// 최근 활동 — 계정 홈에 실제로 무슨 일이 있었는지 보여준다.
const ACTIVITY = [
  { date: "2026. 08. 16", text: "무료 배송 혜택 사용", meta: "무선 이어버드 2세대 외 1건" },
  { date: "2026. 08. 12", text: "회원 전용가 적용", meta: "3,400원 할인" },
  { date: "2026. 08. 07", text: "가구 구성원 초대 수락", meta: "박도윤" },
  { date: "2026. 08. 02", text: "멤버십 결제", meta: `${MONTHLY.toLocaleString()}원 · 신한카드 ···· 2198` },
];

const SESSIONS = [
  { device: "Chrome · Windows", where: "서울", last: "2026. 08. 18 09:41", current: true },
  { device: "PrimeVault 앱 · iPhone", where: "서울", last: "2026. 08. 17 22:05", current: false },
];

module.exports = {
  MONTHLY,
  PLAN,
  CARD,
  BILL_DAY,
  INVOICES,
  HOUSEHOLD,
  HOUSEHOLD_MAX,
  BENEFIT_GROUPS,
  ACTIVITY,
  SESSIONS,
  DISCOUNTED,
  BENEFITS,
  SAVED_TOTAL,
  DEALS,
  ORDERS,
  PERKS,
  JOINED,
  NEXT_BILL,
};
