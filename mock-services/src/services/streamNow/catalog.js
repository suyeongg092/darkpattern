// Fictional catalogue for StreamNow.
//
// The cancel flow claims "찜해둔 작품 14편이 아직 남아 있어요" — a retention line
// that only works if those titles exist somewhere in the product. Without a
// library the number is unsupported, the screen reads as a stub, and the dark
// pattern it is supposed to demonstrate loses its footing. So the titles here
// are the same ones the home rails, the continue-watching row and the retention
// screen all draw from.
//
// Titles are invented. Any resemblance to real programmes is unintended.

const TITLES = [
  { id: "t01", title: "야간비행", kind: "드라마", year: 2025, eps: 12, mins: 58, hue: 268, tone: 42, progress: 0.62, badge: "이어보기" },
  { id: "t02", title: "소금 창고", kind: "영화", year: 2024, mins: 118, hue: 22, tone: 38 },
  { id: "t03", title: "펜트하우스 12층", kind: "드라마", year: 2025, eps: 16, mins: 64, hue: 210, tone: 30, progress: 0.18, badge: "이어보기" },
  { id: "t04", title: "월요일의 미식가", kind: "예능", year: 2026, eps: 40, mins: 72, hue: 34, tone: 52 },
  { id: "t05", title: "북위 38도", kind: "다큐", year: 2024, eps: 6, mins: 49, hue: 196, tone: 26 },
  { id: "t06", title: "라이트 오프", kind: "영화", year: 2026, mins: 104, hue: 288, tone: 34 },
  { id: "t07", title: "두 번째 여름", kind: "드라마", year: 2023, eps: 10, mins: 61, hue: 158, tone: 36 },
  { id: "t08", title: "코드네임 파랑", kind: "영화", year: 2025, mins: 132, hue: 224, tone: 24 },
  { id: "t09", title: "수요일 밤 라이브", kind: "예능", year: 2026, eps: 88, mins: 95, hue: 8, tone: 46 },
  { id: "t10", title: "해협을 건너서", kind: "다큐", year: 2025, eps: 4, mins: 52, hue: 182, tone: 28 },
  { id: "t11", title: "그림자 상속", kind: "드라마", year: 2026, eps: 8, mins: 55, hue: 320, tone: 30, progress: 0.87, badge: "이어보기" },
  { id: "t12", title: "마지막 정거장", kind: "영화", year: 2022, mins: 96, hue: 44, tone: 32 },
  { id: "t13", title: "홈 그라운드", kind: "예능", year: 2025, eps: 24, mins: 68, hue: 130, tone: 40 },
  { id: "t14", title: "붉은 사막의 밤", kind: "영화", year: 2024, mins: 141, hue: 14, tone: 30 },
  { id: "t15", title: "완벽한 이웃", kind: "드라마", year: 2026, eps: 14, mins: 57, hue: 250, tone: 28 },
  { id: "t16", title: "설계자들", kind: "드라마", year: 2025, eps: 12, mins: 60, hue: 200, tone: 22 },
  { id: "t17", title: "주말의 실험실", kind: "예능", year: 2026, eps: 31, mins: 78, hue: 52, tone: 48 },
  { id: "t18", title: "빙점 아래", kind: "다큐", year: 2023, eps: 3, mins: 45, hue: 190, tone: 24 },
  { id: "t19", title: "손님이 온다", kind: "영화", year: 2026, mins: 108, hue: 300, tone: 32 },
  { id: "t20", title: "여덟 번의 겨울", kind: "드라마", year: 2024, eps: 20, mins: 63, hue: 176, tone: 26 },
];

const byId = (id) => TITLES.find((t) => t.id === id);
const pick = (ids) => ids.map(byId).filter(Boolean);

// Rails are ordered deliberately: continue-watching first (an OTT home always
// resumes before it recommends), then editorial, then catalogue depth.
const RAILS = [
  { key: "resume", label: "이어서 보기", items: pick(["t01", "t03", "t11"]) },
  { key: "today", label: "오늘의 StreamNow", items: pick(["t06", "t08", "t15", "t02", "t19", "t14"]) },
  { key: "series", label: "정주행하기 좋은 시리즈", items: pick(["t16", "t20", "t07", "t04", "t13", "t17"]) },
  { key: "doc", label: "다큐 컬렉션", items: pick(["t05", "t10", "t18", "t12", "t09"]) },
];

const HERO = byId("t08");

// The count the retention screen quotes. Kept as a derived value so the copy and
// the list can never disagree.
const WATCHLIST = pick(["t01", "t03", "t11", "t15", "t16", "t20", "t02", "t06", "t19", "t07", "t04", "t10", "t05", "t14"]);

module.exports = { TITLES, RAILS, HERO, WATCHLIST, byId };
