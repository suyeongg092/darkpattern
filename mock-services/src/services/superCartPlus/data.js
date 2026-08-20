// Fictional catalogue for SuperCart Plus.
//
// The 순차공개 가격책정 case needs a store around it, not a single product card:
// the type is defined by what the *first* price screen omits, so there has to be
// a first screen with many prices on it, a detail page, and a checkout — each
// showing a different number for the same item. Prices follow 공정위 붙임2 4.(1)
// (62,000원 first screen → 102,000원 charged once 배송비 40,000원 is added).
//
// Seller names, product titles and reviews are invented.

const ITEM = {
  id: "p-4471",
  name: "콤데가르송 긴팔 티셔츠 레드와펜 남녀공용",
  brand: "COMME des GARÇONS",
  seller: "제이케이재팬",
  sellerRating: 4.7,
  sellerCount: 1183,
  base: 62000,
  shipping: 40000, // 해외배송비 + 관부가세
  list: 125000,
  rating: 4.6,
  reviews: 1118,
  options: ["S (90)", "M (95)", "L (100)", "XL (105)"],
  arrive: "8월 27일(목)",
  hue: 4,
};

const OTHER_SELLERS = [
  { name: "제이케이재팬", price: 62000, ship: 40000, note: "해외직구 · 7~10일" },
  { name: "wunderstory", price: 62800, ship: 40000, note: "해외직구 · 7~12일" },
  { name: "pyodeok65", price: 62900, ship: 40000, note: "해외직구 · 10~14일" },
  { name: "momo2004", price: 80100, ship: 0, note: "국내발송 · 무료배송" },
];

// 카테고리·연관 상품이 있어야 첫 화면이 "가격 표시 화면"으로 성립한다.
const CATEGORIES = ["패션의류", "뷰티", "식품", "가전디지털", "생활용품", "스포츠", "도서", "여행"];

// 그리드의 나머지 상품도 각자 상세 페이지를 갖는다. 전부 같은 페이지로 보내면
// "링크가 다 한 곳으로 간다"는 미완성 신호가 되고, 탐지기가 그걸 근거로 서비스 전체를
// 의심하게 만든다. 이 상품들에는 다크패턴을 심지 않았다 — 다크패턴이 있는 서비스
// 안에도 정직한 화면이 있어야, 탐지기가 "이 사이트는 나쁘니 전부 표시"로 넘어갈 수 없다.
const GRID = [
  { id: "g1", name: "메종키츠네 폭스 자수 맨투맨", brand: "MAISON KITSUNE", seller: "슈퍼카트 직매입",
    price: 148000, ship: 0, rating: 4.8, reviews: 902, tag: "로켓와우", hue: 210,
    arrive: "8월 19일(수)", options: ["S", "M", "L"] },
  { id: "g2", name: "아크네 스튜디오 머플러 울 100%", brand: "ACNE STUDIOS", seller: "슈퍼카트 직매입",
    price: 219000, ship: 0, rating: 4.9, reviews: 431, tag: "로켓와우", hue: 340,
    arrive: "8월 19일(수)", options: ["FREE"] },
  { id: "g3", name: "스톤아일랜드 가먼트다이 후디", brand: "STONE ISLAND", seller: "이탈리아셀렉트",
    price: 398000, ship: 25000, rating: 4.7, reviews: 188, tag: "해외직구", hue: 96,
    arrive: "8월 29일(토)", options: ["M", "L", "XL"] },
  { id: "g4", name: "폴로 랄프로렌 옥스퍼드 셔츠", brand: "POLO RALPH LAUREN", seller: "슈퍼카트 직매입",
    price: 89000, ship: 0, rating: 4.6, reviews: 3204, tag: "로켓와우", hue: 46,
    arrive: "8월 19일(수)", options: ["95", "100", "105", "110"] },
  { id: "g5", name: "톰브라운 4바 카디건 클래식", brand: "THOM BROWNE", seller: "슈퍼카트 직매입",
    price: 720000, ship: 0, rating: 4.8, reviews: 96, tag: "로켓와우", hue: 12,
    arrive: "8월 20일(목)", options: ["1", "2", "3"] },
  { id: "g6", name: "칼하트 WIP 디트로이트 자켓", brand: "CARHARTT WIP", seller: "웨어하우스코리아",
    price: 268000, ship: 12000, rating: 4.5, reviews: 741, tag: "해외직구", hue: 32,
    arrive: "8월 26일(수)", options: ["S", "M", "L"] },
];

// 광고 상품. 위장 광고(§21①1)는 "광고를 광고가 아닌 다른 콘텐츠인 것처럼 위장"하는
// 것이므로, 자연 검색 결과와 **같은 카드 형태**로 같은 그리드 안에 섞여야 성립한다.
// 별도 섹션으로 빼면 그건 그냥 광고 영역이고 위장이 아니다.
// 시정 후에는 같은 자리에 남되 '광고' 표기와 대가성 고지가 붙는다.
const SPONSORED = [
  { id: "s1", name: "락앤락 밀폐용기 12종 세트", brand: "LOCK&LOCK", seller: "락앤락 공식",
    price: 39900, ship: 0, rating: 4.5, reviews: 2841, tag: "로켓와우", hue: 172,
    arrive: "8월 19일(수)", options: ["12종", "18종"], sponsor: "락앤락(주)" },
  { id: "s2", name: "네이처리퍼블릭 알로에 수딩젤 300ml", brand: "NATURE REPUBLIC", seller: "네이처리퍼블릭",
    price: 8900, ship: 0, rating: 4.4, reviews: 15220, tag: "로켓와우", hue: 96,
    arrive: "8월 19일(수)", options: ["1개", "3개"], sponsor: "네이처리퍼블릭(주)" },
];

// 미끼상품. 유인 판매(§21①1)는 "실제로 판매되지 않는 미끼상품을 판매하는 것처럼
// 표시·광고"하는 것이다. 홈에서 9,900원으로 광고하지만 상세로 들어가면 품절이고,
// 구매 버튼은 6배 비싼 대체품으로 연결된다.
// 시정 후에는 광고 시점에 품절을 밝히고, 대체품은 '다른 상품'으로만 제시한다.
const BAIT = {
  id: "b1", name: "무선 블루투스 이어폰 노이즈캔슬링", brand: "SOUNDLY", seller: "사운들리",
  price: 9900, was: 79000, ship: 0, rating: 4.3, reviews: 6120, tag: "특가", hue: 24,
  arrive: "8월 19일(수)", options: ["블랙", "화이트"],
  stock: 0, stockNote: "1차 물량 소진",
};
const BAIT_ALT = {
  id: "b2", name: "사운들리 프로 ANC 이어폰 2세대", brand: "SOUNDLY", seller: "사운들리",
  price: 59900, ship: 0, rating: 4.6, reviews: 812, tag: "로켓와우", hue: 24,
  arrive: "8월 19일(수)", options: ["블랙"],
};

const REVIEWS = [
  { who: "d***2", stars: 5, when: "08-14", size: "M (95)", body: "생각보다 얇은데 여름에 걸치기 딱 좋아요. 와펜 마감도 깔끔합니다." },
  { who: "hy***", stars: 4, when: "08-11", size: "L (100)", body: "배송이 12일 걸렸어요. 물건은 정품 맞고 사이즈는 한 치수 크게 나옵니다." },
  { who: "s***07", stars: 5, when: "08-03", size: "M (95)", body: "관부가세가 따로 붙는 줄 모르고 샀다가 놀랐네요. 옷 자체는 만족합니다." },
];

// 멤버십 등급 체계. 해지 화면의 '베이직'이 어디서 나온 말인지 알 수 있어야 한다.
const TIERS = [
  { key: "basic", name: "베이직", price: 0, perks: "기본 배송 · 일반 판매가" },
  { key: "wow", name: "와우", price: 4890, perks: "무료 로켓배송 · 와우 전용 할인가 · 무료 반품" },
  { key: "wowplus", name: "와우 플러스", price: 9880, perks: "당일배송 무제한 · 반품비 무료 · 전용 특가 추가 5%" },
];

// 해지 허브가 보여주는 "이번 달 혜택"의 출처.
const USAGE = [
  { label: "무료 로켓배송", value: "14회 이용", saved: 33600 },
  { label: "와우 전용 할인가", value: "9,300원 절약", saved: 9300 },
  { label: "무료 반품", value: "2회 이용", saved: 5000 },
];

module.exports = {
  SPONSORED, BAIT, BAIT_ALT, ITEM, OTHER_SELLERS, CATEGORIES, GRID, REVIEWS, TIERS, USAGE };
