// Fictional library data for ReadWell.
//
// ReadWell is the negative control, and a control only works if it is as
// commercially persuasive as the offenders. So it deliberately carries the
// *shapes* that dark patterns usually take — a promotional banner, an annual
// discount, a free trial, a marketing opt-in, a recommendation rail — with each
// one made transparent instead of manipulative:
//
//   - the annual offer shows both the monthly total and the annual price, so the
//     saving can be checked rather than taken on faith;
//   - the trial states the conversion date and amount before it is accepted;
//   - the marketing consent is unchecked and marked 선택;
//   - cancelling is a row in the account list, and both cancellation modes are
//     offered side by side with the refund spelled out.
//
// A detector that flags this service is not spotting a dark pattern — it is
// reacting to persuasion, which is exactly the confusion the control measures.
//
// Titles, authors and publishers are invented.

const MONTHLY = 9900;
const ANNUAL = 95000;
const ANNUAL_LIST = MONTHLY * 12; // 118,800원
const ANNUAL_SAVE = ANNUAL_LIST - ANNUAL; // 23,800원

const BOOKS = [
  { id: "b01", title: "밤의 도서관", author: "정하람", pub: "물결출판", year: 2025, pages: 412, hue: 254, progress: 0.42, mins: 96 },
  { id: "b02", title: "느린 관찰", author: "윤서진", pub: "여백", year: 2024, pages: 288, hue: 28, progress: 0.78, mins: 61 },
  { id: "b03", title: "우리가 남긴 지도", author: "한도경", pub: "북로드", year: 2026, pages: 356, hue: 168, progress: 0.15, mins: 22 },
  { id: "b04", title: "겨울 산책자", author: "임세아", pub: "물결출판", year: 2023, pages: 240, hue: 208 },
  { id: "b05", title: "조용한 기술", author: "배현우", pub: "코너스톤", year: 2026, pages: 320, hue: 12 },
  { id: "b06", title: "말 없는 정원", author: "노유진", pub: "여백", year: 2025, pages: 268, hue: 128 },
  { id: "b07", title: "다시 쓰는 문장", author: "곽민서", pub: "북로드", year: 2024, pages: 304, hue: 320 },
  { id: "b08", title: "해변의 사서", author: "정하람", pub: "물결출판", year: 2022, pages: 380, hue: 190 },
  { id: "b09", title: "작은 실험들", author: "서지호", pub: "코너스톤", year: 2026, pages: 216, hue: 44 },
  { id: "b10", title: "빛이 지나간 자리", author: "문가온", pub: "여백", year: 2025, pages: 344, hue: 278 },
];

const READING = BOOKS.filter((b) => b.progress !== undefined);
const RECOMMEND = BOOKS.filter((b) => b.progress === undefined).slice(0, 6);

// 이번 달 독서 기록. 계정 화면이 근거 있는 수치를 보여줄 수 있게 한다.
const STATS = { booksFinished: 3, minutes: 512, streakDays: 11, highlights: 24 };

const INVOICES = [
  { date: "2026. 08. 13", desc: "월 구독", amount: MONTHLY, state: "결제 완료", no: "RW-260813-2204" },
  { date: "2026. 07. 13", desc: "월 구독", amount: MONTHLY, state: "결제 완료", no: "RW-260713-2071" },
  { date: "2026. 06. 13", desc: "월 구독", amount: MONTHLY, state: "결제 완료", no: "RW-260613-1938" },
];

const CARD = { issuer: "하나카드", last4: "6640" };
const JOINED = "2025. 04. 09";
const NEXT_BILL = "2026. 09. 13";
// 정기결제 해지를 택했을 때 이용이 끝나는 날 = 다음 결제일 하루 전. 해지 화면과
// 완료 안내가 같은 값을 인용해야 하므로 문자열을 손보지 않고 여기서 못박는다.
const PERIOD_END = "2026. 09. 12";
// 무료 체험을 수락했을 때 실제로 적용되는 날짜. 고지 문구와 재구독 후 화면이
// 같은 값을 써야 한다 — 두 곳이 어긋나면 대조군에 "고지와 실제가 다른 화면"이
// 생기고, 그걸 잡아낸 탐지기가 오탐으로 채점된다.
// 화면들이 "오늘"이라고 부르는 날. 해지 완료 안내와 구독 요약이 같은 값을 써야 한다.
const TODAY = "2026. 08. 18";

const TRIAL_DAYS = 7;
const TRIAL_END = "2026. 08. 25";

const REFUND_IF_IMMEDIATE = 4620;

// 부가세 포함 총액을 공급가와 세액으로 되돌린다. 첫 화면에 총액을 적는 것만으로는
// 붙임2 4번을 보였다고 하기 어렵고, 내역이 함께 있어야 "결제 단계에서 붙는 금액이
// 없다"는 주장이 검산 가능해진다.
function breakdown(total) {
  const net = Math.round(total / 1.1);
  return { net, vat: total - net, total };
}
const CATALOG_SIZE = 120000;

module.exports = {
  MONTHLY, ANNUAL, ANNUAL_LIST, ANNUAL_SAVE,
  BOOKS, READING, RECOMMEND, STATS, INVOICES,
  CARD, JOINED, NEXT_BILL, PERIOD_END, TODAY, TRIAL_DAYS, TRIAL_END,
  REFUND_IF_IMMEDIATE, CATALOG_SIZE, breakdown,
};
