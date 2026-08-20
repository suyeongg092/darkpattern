// Fictional local-commerce data for OrderNow Club.
//
// The cancel flow leans on three numbers — "지금까지 12,000원 혜택 받았어요",
// "예상 월 혜택 18,200원", and a wall of coupons — none of which had anything
// behind them. An unsupported number reads as a stub, and the dark pattern it is
// meant to demonstrate (re-framing accrued value as a loss) loses its footing:
// there is no accrued value to re-frame.
//
// So the order history is the source. 혜택 총액 is summed from it, and the coupon
// wall on the cancel hub lists coupons that also exist in the 쿠폰함. Restaurant
// names, menus and districts are invented.

const RESTAURANTS = [
  { id: "r01", name: "청담 마라공방", cat: "중식", rating: 4.8, reviews: 2431, mins: [22, 32], min: 12000, fee: 0, tags: ["1인분", "쿠폰"], hue: 8 },
  { id: "r02", name: "성수동 화덕피자", cat: "양식", rating: 4.7, reviews: 1180, mins: [28, 38], min: 15000, fee: 2000, tags: ["신규"], hue: 32 },
  { id: "r03", name: "노원 순대국밥", cat: "한식", rating: 4.9, reviews: 5602, mins: [18, 28], min: 9000, fee: 0, tags: ["단골"], hue: 20 },
  { id: "r04", name: "합정 사누키우동", cat: "일식", rating: 4.6, reviews: 894, mins: [25, 35], min: 11000, fee: 1500, tags: [], hue: 44 },
  { id: "r05", name: "연남 크리스피치킨", cat: "치킨", rating: 4.8, reviews: 7714, mins: [30, 45], min: 17000, fee: 0, tags: ["쿠폰"], hue: 36 },
  { id: "r06", name: "망원 샐러드보울", cat: "샐러드", rating: 4.5, reviews: 621, mins: [20, 30], min: 10000, fee: 2500, tags: [], hue: 128 },
  { id: "r07", name: "홍대 마제소바 본점", cat: "일식", rating: 4.7, reviews: 3308, mins: [24, 34], min: 13000, fee: 0, tags: ["1인분"], hue: 16 },
  { id: "r08", name: "서교동 떡볶이연구소", cat: "분식", rating: 4.6, reviews: 4127, mins: [15, 25], min: 8000, fee: 1000, tags: ["단골"], hue: 4 },
  { id: "r09", name: "상수 수제버거랩", cat: "양식", rating: 4.4, reviews: 512, mins: [26, 36], min: 14000, fee: 2000, tags: ["신규"], hue: 28 },
  { id: "r10", name: "연희동 평양냉면", cat: "한식", rating: 4.9, reviews: 2088, mins: [20, 30], min: 12000, fee: 0, tags: [], hue: 190 },
  { id: "r11", name: "합정 리얼타코", cat: "멕시칸", rating: 4.5, reviews: 733, mins: [27, 37], min: 13000, fee: 1500, tags: ["쿠폰"], hue: 48 },
  { id: "r12", name: "망원시장 닭강정", cat: "치킨", rating: 4.7, reviews: 1954, mins: [17, 27], min: 9000, fee: 1000, tags: [], hue: 24 },
];

const CATEGORIES = ["전체", "한식", "치킨", "분식", "일식", "중식", "양식", "샐러드", "카페", "장보기"];

// 배달비 절약분이 곧 멤버십 혜택액이다. 만류 화면의 "12,000원"은 이 합계에서 나온다.
const ORDERS = [
  { date: "08-16", name: "노원 순대국밥", items: "순대국밥 외 1", paid: 17400, saved: 3000 },
  { date: "08-12", name: "연남 크리스피치킨", items: "후라이드 반마리 외 2", paid: 26800, saved: 3000 },
  { date: "08-09", name: "서교동 떡볶이연구소", items: "로제떡볶이 세트", paid: 14200, saved: 2000 },
  { date: "08-04", name: "청담 마라공방", items: "마라샹궈(중)", paid: 23900, saved: 2000 },
  { date: "07-30", name: "홍대 마제소바 본점", items: "마제소바 외 1", paid: 18600, saved: 2000 },
  { date: "07-24", name: "망원시장 닭강정", items: "닭강정(대)", paid: 15000, saved: 0 },
  { date: "07-19", name: "연희동 평양냉면", items: "물냉면 2인", paid: 21000, saved: 0 },
  { date: "07-11", name: "합정 사누키우동", items: "붓카케우동", paid: 11500, saved: 0 },
];

const SAVED_TOTAL = ORDERS.reduce((a, o) => a + o.saved, 0); // 12,000원
const ORDER_COUNT_30D = ORDERS.filter((o) => o.date.startsWith("08")).length;

// The cancel hub lists these as a wall of unrelated benefits; the 쿠폰함 screen
// lists the same six, so the wall is a real part of the product rather than
// decoration invented for one screen.
const COUPONS = [
  { icon: "☕", name: "스타벅스 아메리카노 무료", sub: "클럽 전용 · 매월 1회", exp: "08-31" },
  { icon: "🛒", name: "B마트 10% 할인", sub: "1만원 이상 · 최대 3천원", exp: "08-25" },
  { icon: "🍗", name: "치킨 3,000원 할인", sub: "연남 크리스피치킨 외 4곳", exp: "09-03" },
  { icon: "🥬", name: "장보기 5,000원 할인", sub: "3만원 이상 결제 시", exp: "09-10" },
  { icon: "🍕", name: "피자 배달비 무료", sub: "성수동 화덕피자", exp: "08-28" },
  { icon: "🧋", name: "카페 2,000원 할인", sub: "제휴 카페 전체", exp: "09-15" },
];

const ADDRESS = "서울 마포구 월드컵북로 12길 · 3층";
const MONTHLY_FEE = 4900;

module.exports = {
  RESTAURANTS,
  CATEGORIES,
  ORDERS,
  COUPONS,
  SAVED_TOTAL,
  ORDER_COUNT_30D,
  ADDRESS,
  MONTHLY_FEE,
};
