// Fictional licensing data for CloudStudio.
//
// The early-termination fee is the whole point of this service, and a number
// with no derivation on screen reads as arbitrary. Everything here exists so
// 132,000원 can be computed by the reader: 계약 12개월 중 1개월 경과 → 잔여 11개월,
// 월 24,000원, 위약금은 잔여 계약금의 50%. The billing history shows the one
// payment that has actually been taken, which is what makes "1개월 경과" checkable.
//
// App names, invoice numbers and device names are invented.

const MONTHLY = 24000;
const SINGLE_APP_MONTHLY = 12000;
const TERM_MONTHS = 12;
const ELAPSED_MONTHS = 1;
const REMAINING_MONTHS = TERM_MONTHS - ELAPSED_MONTHS; // 11
const ETF_RATE = 0.5;
const ETF = MONTHLY * REMAINING_MONTHS * ETF_RATE; // 132,000원

const APPS = [
  { name: "Composer", role: "벡터 드로잉", ver: "26.2.1", size: "2.4GB", state: "설치됨", hue: 8 },
  { name: "Retouch", role: "사진 편집", ver: "26.1.4", size: "3.1GB", state: "설치됨", hue: 210 },
  { name: "Motion", role: "영상 편집", ver: "25.9.0", size: "5.8GB", state: "업데이트 필요", hue: 268 },
  { name: "Layout", role: "편집 디자인", ver: "26.0.2", size: "1.9GB", state: "설치됨", hue: 40 },
  { name: "Modeler", role: "3D 모델링", ver: "26.2.0", size: "7.2GB", state: "미설치", hue: 160 },
  { name: "Palette", role: "컬러 관리", ver: "24.7.3", size: "0.4GB", state: "미설치", hue: 320 },
];

// 위약금 산정의 근거. 결제가 1회만 있었다는 사실이 "1개월 경과"를 확인 가능하게 한다.
const INVOICES = [
  { no: "CS-2026-0718-44192", date: "2026-07-18", desc: "연간 약정(월납) 1회차", amount: MONTHLY, state: "결제 완료" },
  { no: "CS-2026-0618-41077", date: "2026-06-18", desc: "연간 약정 계약 체결", amount: 0, state: "0원 청구" },
  { no: "CS-2026-0521-38810", date: "2026-05-21", desc: "월 단위(무약정) 이용료", amount: 37000, state: "결제 완료" },
  { no: "CS-2026-0421-35604", date: "2026-04-21", desc: "월 단위(무약정) 이용료", amount: 37000, state: "결제 완료" },
  { no: "CS-2026-0321-32219", date: "2026-03-21", desc: "월 단위(무약정) 이용료", amount: 37000, state: "결제 완료" },
  { no: "CS-2026-0221-29944", date: "2026-02-21", desc: "월 단위(무약정) 이용료", amount: 37000, state: "결제 완료" },
];

const DEVICES = [
  { name: "MacBook Pro 14 (사무실)", os: "macOS 15.4", last: "2026-08-18 09:12", id: "D-7F2A-1188" },
  { name: "Windows 데스크톱 (집)", os: "Windows 11", last: "2026-08-16 22:40", id: "D-91C4-2073" },
  { name: "iPad Pro 13", os: "iPadOS 19", last: "2026-08-11 14:05", id: "D-3E88-6621" },
];

// 해지 허브가 보여주는 "작업 현황"의 출처.
const USAGE = {
  files: 128,
  exports: 9,
  assets: 34,
  storageUsed: 214, // GB
  storageTotal: 1024,
};

// 요금제 비교 화면. dark 에서는 표시 단위가 제각각이라 총액 비교가 불가능하다.
const PLANS = [
  { key: "annual_monthly", name: "연간 약정 (월납)", unitLabel: "월 24,000원", yearTotal: 288000, etf: ETF },
  { key: "annual_upfront", name: "연간 약정 (일시납)", unitLabel: "연 259,000원", yearTotal: 259000, etf: ETF },
  { key: "monthly", name: "월 단위 (무약정)", unitLabel: "월 37,000원", yearTotal: 444000, etf: 0 },
];

module.exports = {
  MONTHLY,
  SINGLE_APP_MONTHLY,
  TERM_MONTHS,
  ELAPSED_MONTHS,
  REMAINING_MONTHS,
  ETF_RATE,
  ETF,
  APPS,
  INVOICES,
  DEVICES,
  USAGE,
  PLANS,
};
