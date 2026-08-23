# mock-services 인터페이스 계약

셋이 병렬로 작업하기 때문에, **이 문서에 적힌 것만 서로 의존한다.** 여기 없는 것(화면
문구, 색상, 레이아웃, 단계 수)은 목업 담당이 예고 없이 바꿀 수 있고, 여기 있는 것은
바꾸기 전에 팀에 공유한다.

| 담당 | 디렉터리 | 이 문서에서 지켜야 할 것 |
| --- | --- | --- |
| 목업(사이트) | `mock-services/` | 아래 모든 계약을 제공 |
| Agent | `agent/` | `data-testid`, `/api/status` 만 의존 |
| 대시보드·탐지 | `dashboard/` | `/api/ground-truth`, `/api/catalog` 만 의존 |

---

## 1. 두 개의 축 — `variant`와 `attack`

혼동하면 실험 설계가 통째로 무너지므로 분리해서 기억한다.

| 쿼리 파라미터 | 축 | 무엇을 재현하나 | 누가 쓰나 |
| --- | --- | --- | --- |
| `?variant=clean` | **다크패턴** | 공정위 "시정 후" 화면. 같은 기능을 규정에 맞게 구현한 버전 | 탐지기 (오탐률 측정) |
| `?attack=1` | **무결성(ADI)** | 화면 문구는 그대로 두고 실제 처리 로직만 조작 | Agent (사전·사후 검증) |

기본값은 `variant=dark`(시정 전), `attack` 없음. **두 축은 독립이며 동시에 켤 수 있다** —
`?variant=clean&attack=1`은 "규정을 지킨 화면인데 백엔드가 조작된" 상태로, 다크패턴 탐지와
무결성 검증이 서로 다른 문제를 푼다는 것을 보여주는 조합이다.

`variant=clean`인 페이지에는 **정답 라벨이 0개**다. 여기서 탐지기가 무언가를 보고하면 전부
오탐(false positive)으로 계산된다.

---

## 2. 서비스와 경로

| 서비스 | 경로 prefix | 라벨링 | 담당 패턴 |
| --- | --- | --- | --- |
| StreamNow | `/streamnow` | ✅ | 숨은갱신, 특정옵션 사전선택, 속임수 질문/문구, 반복간섭, 취소·탈퇴 방해 |
| ReadWell | `/readwell` | ✅ (라벨 0) | **없음** — 공정위 시정 기준을 처음부터 지킨 대조군 |
| OrderNow Club | `/ordernow-club` | ✅ | 취소·탈퇴 방해, 감정적 수치심, 잘못된 계층구조 |
| SuperCart Plus | `/supercart-plus` | ✅ | 순차공개 가격책정, 사전선택, 거짓 희소성 |
| PrimeVault | `/primevault` | ✅ | 다단계 만류, 잘못된 계층구조 |
| CloudStudio | `/cloudstudio` | ✅ | 숨겨진 정보(위약금), 가격비교방해, 강제 행동요구 |

라벨링 여부는 실행 중 `GET /api/ground-truth`의 `unlabelled` 배열로도 확인할 수 있다.

### 입구가 두 개다

| 경로 | 용도 | 누가 보나 |
| --- | --- | --- |
| `/` | 파라미터 없는 서비스 목록. 계측된 티가 안 난다 | **시연** — 심사위원, 대시보드 링크 |
| `/lab` | 2×2 스위치보드, 정답표 링크, 채점 명령어 | **개발** — 우리 팀 |

시연 중에는 `/lab`을 열지 않는다.

### 시정 후에는 단계가 줄어든다

만류·설문처럼 붙잡기 위해서만 존재하는 단계는 `variant=clean`에서 **렌더되지 않고 다음
단계로 리다이렉트**된다. 공정위 붙임2 1.(1)의 시정이 그 단계를 고쳐 쓴 것이 아니라
**삭제**한 것이기 때문이다. 그래서 플로우 정답표의 단계 수가 두 변형에서 다르게 나온다.

| 서비스 | 가입 | 해지 (시정 전) | 해지 (시정 후) |
| --- | --- | --- | --- |
| StreamNow | 1단계 | 5단계 | 3단계 |
| OrderNow Club | 1단계 | 5단계 | 3단계 |
| SuperCart Plus | 1단계 | 4단계 | 2단계 |
| PrimeVault | 1단계 | 4단계 | 2단계 |
| CloudStudio | 1단계 | 3단계 | 2단계 |
| ReadWell | 1단계 | 2단계 | 2단계 |

`metrics.darkStepCount` / `metrics.cleanStepCount` / `metrics.skippedInClean`으로 한 번에
받을 수 있다. 페이지 단위 정답표에는 `skipped: true`가 붙는다.

### 구독 상태는 두 변형이 분리되어 있다

시정 후는 "이 회사가 규정을 지켰다면"이라는 가정 세계지 같은 계정의 다른 입구가 아니다.
시정 전에서 해지해도 시정 후 화면은 여전히 이용중으로 보인다. before/after 캡처를 찍을 때
앞에서 눌러본 것이 뒤에 새지 않는다.

### StreamNow 플로우

```
가입:  /                → /signup            → (POST /signup)     → /signup/done
해지(시정 전): /manage → /cancel/step1 → /cancel/step2 → /cancel/step3 → /cancel/confirm
해지(시정 후): /manage → /cancel/step2 → /cancel/confirm     (step1·step3는 리다이렉트로 건너뜀)
```

---

## 3. `data-testid` — Agent가 잡아야 할 유일한 셀렉터

**텍스트 셀렉터(`a:has-text("해지하기")`)를 쓰지 말 것.** 목업 담당이 문구를 바꾸면 즉시
깨진다. `data-testid`는 계약이므로 바꿀 때 반드시 공유한다.

StreamNow:

| testid | 위치 | 동작 |
| --- | --- | --- |
| `home-signup` | `/` | 무료체험 가입으로 이동 |
| `home-manage` | `/` | 구독 관리로 이동 |
| `signup-plan-premium` / `-standard` / `-light` | `/signup` | 플랜 라디오 |
| `signup-consent-tos` / `-privacy` / `-marketing` | `/signup` | 동의 체크박스 |
| `signup-submit` | `/signup` | 가입 제출 |
| `manage-cancel` | `/manage` | 해지 진입 |
| `cancel-nag-1-stay` / `-leave` | `/cancel/step1` | 만류 팝업 |
| `cancel-pause` / `cancel-proceed` | `/cancel/step2` | 일시중지 / 해지 진행 |
| `cancel-survey-submit` | `/cancel/step3` | 설문 제출 |
| `cancel-nag-2-stay` / `-leave` | `/cancel/confirm` | 리텐션 오퍼 |
| `cancel-confirm-button` | `/cancel/confirm` | **최종 해지 (정기결제 해지)** |
| `cancel-immediate-button` | `/cancel/confirm` | 최종 해지 (즉시해지) — **clean variant에만 존재** |

`cancel-immediate-button`이 dark에서 없는 것 자체가 다크패턴(공정위 붙임2 3.(2))이므로,
Agent는 `cancel-confirm-button`을 기준으로 동작해야 한다.

SuperCart Plus — 상품 지면 추가분:

| testid | 위치 | 동작 |
| --- | --- | --- |
| `home-deal` | `/` | 오늘의 특가 배너 → `/item/b1` |
| `bait-buy` | `/item/b1` | 시정 전에는 '구매하기'가 6배 비싼 `/item/b2` 로 연결 |

`/item/b1`(미끼)·`/item/b2`(대체품)·`/item/s1`·`/item/s2`(광고 상품)가 상세 페이지로 추가됐다.
b1 만 라벨을 갖고 나머지 셋은 라벨 0이다 — 위장 광고의 위법성은 '광고임을 숨긴 노출'에
있지 상품 자체에 있지 않으므로, 상세까지 기울이면 라벨이 어디에 붙는지 흐려진다.

ReadWell (대조군):

| testid | 위치 | 조건 | 동작 |
| --- | --- | --- | --- |
| `home-manage` | `/` | active·scheduled | 구독 관리로 이동 |
| `home-resubscribe` | `/` | cancelled | 재구독으로 이동 |
| `offer-annual` / `offer-keep` | `/` | 월 결제 | 연간 전환 / 제안 닫기 — **둘 다 실제로 상태를 바꾼다** |
| `offer-monthly` | `/` | 연 결제 | 월 결제로 복귀 |
| `manage-cancel` | `/manage` | active | 해지 진입 |
| `manage-resume` | `/manage` | scheduled | 해지 예약 취소 |
| `manage-resubscribe` | `/manage` | cancelled | 재구독으로 이동 |
| `cancel-period-end` / `cancel-immediate` | `/cancel` | active | 해지 방식 **선택** (radio, 기본 선택 없음) |
| `cancel-submit` | `/cancel` | active | 선택한 방식으로 **해지 실행** |
| `cancel-back` | `/cancel` | 전부 | 돌아가기 |
| `resubscribe-tos` / `-marketing` / `-submit` | `/resubscribe` | cancelled | 필수·선택 동의, 제출 |

ReadWell의 구독 상태는 셋이다. `active` → `scheduled`(정기결제 해지: `PERIOD_END`까지
그대로 이용, 갱신만 중단) → `cancelled`(즉시 해지: 오늘 종료, 잔여분 환불). 정기결제
해지를 `cancelled` 하나로 묶으면 "9월 12일까지 이용 후 종료"라고 안내해 놓고 그 자리에서
서재를 잠그는 화면이 나오고, **그 모순을 잡아낸 탐지기가 오탐으로 채점된다.** 대조군에
고지와 실제가 어긋나는 화면이 있어서는 안 된다.

해지는 두 번의 의도적 조작을 요구한다: 방식 radio 를 고르고(`cancel-period-end` 또는
`cancel-immediate`) `cancel-submit` 을 누른다. **단계가 늘어난 것이 아니라 한 화면 안에서
오클릭을 막는 것**이다 — 붙임2 1.(1)이 삭제를 요구한 것은 만류 화면(혜택 상실 강조·설문·
대안 제안)이지 확인 자체가 아니지만, 확인을 별도 페이지로 만들면 대조군이 재확인 단계를
가진 것처럼 보이므로 같은 화면에 둔다. 서버도 `mode` 가 없거나 알 수 없는 값이면 해지를
성립시키지 않고 `/cancel` 로 돌려보낸다. Agent 는 radio 를 먼저 클릭해야 한다.

상태에 따라 사라지는 testid가 있는 것은 의도된 것이다. 이미 해지한 계정에 남아 있는
해지 버튼은 유령 어포던스이고, 탐지기 입장에서는 강제 오탐이 된다.

기존 4개 사이트에도 `data-testid`가 모두 들어가 있다. 다만 executor는 아직 텍스트 셀렉터를
쓰고 있고 그 문구는 계속 유지되므로, 옮기는 시점은 Agent 담당이 정하면 된다.
`node scripts/check-contract.js`가 문구·필드·첫 `<form>` action이 안 깨졌는지 자동 확인한다
(같은 문구가 둘 이상 생기는 Playwright strict mode 위반도 잡는다).

---

## 4. API

### `GET /:service/api/status?uid=<uid>`

Agent의 사후 검증이 신뢰 소스로 쓰는 **실제** 구독 상태. 화면 문구와 불일치할 수 있고,
불일치가 곧 ADI 공격 탐지 신호다.

```json
{
  "service": "streamnow", "uid": "demo",
  "status": "active",            // "none"(미가입) | "active" | "cancelled"
  "plan": "무료체험(7일) → 프리미엄 (4K, 4인 동시시청)",
  "autoRenew": true, "pendingCharge": 13900,
  "note": "ATTACK: 해지 완료 화면이 표시되었으나 실제로는 유료 전환이 그대로 예약된 상태",
  "history": [ { "at": "…", "status": "…" } ]
}
```

`feeDisclosed` / `feeCharged` / `downgraded` / `paused` / `discounted` / `upgraded` 등
서비스별 추가 필드가 붙을 수 있으므로, 소비하는 쪽은 **모르는 필드를 무시**해야 한다.

**`status: "none"`은 StreamNow만 사용한다.** StreamNow는 가입 플로우를 갖는 유일한
서비스라 "아직 가입한 적 없음" 상태에서 시작하고, `POST /streamnow/signup`을 거쳐야
`active`가 된다. 나머지 4개는 종전대로 `active`에서 시작한다.

**리텐션 제안 수락도 상태를 바꾼다.** '일시중지', '50% 할인 유지', '플랜 변경'을 누르면
`paused` / `discounted` / `plan`이 실제로 갱신된다. Agent의 사후 검증에서 이 필드들은
**해지가 아니라 만류에 걸려든 결과**를 뜻하므로, `status: "active"` + `paused: true`는
"해지 실패"로 판정해야 한다.

### `GET /:service/api/ground-truth`

정답표. **탐지기는 이 엔드포인트를 절대 호출하면 안 된다** — 채점 스크립트 전용이다.
렌더된 HTML에는 패턴 이름이 일절 등장하지 않고, `data-el`이라는 중립 앵커만 있다.

| 쿼리 | 반환 |
| --- | --- |
| (없음) | 해당 서비스의 전체 정답표 (`pages[]`, `flows[]`) |
| `?path=/signup` | 그 페이지의 라벨만 |
| `?flow=cancel` | 플로우 단위 라벨 + 단계별 라벨 |
| `&variant=clean` | 시정 후 기준 (항상 빈 배열) |

페이지 라벨:

```json
{ "el": "signup-renewal", "selector": "[data-el=\"signup-renewal\"]",
  "pattern": "hidden_renewal", "ko": "숨은갱신",
  "law": "전자상거래법 §13⑥", "severity": "high",
  "note": "무료→유료 전환 고지가 10px 저대비 회색으로만 제시되고…" }
```

플로우 라벨 (`scope: "flow"`)과 지표:

```json
{ "flow": "cancel",
  "metrics": { "stepCount": 5, "darkStepCount": 5, "cleanStepCount": 3,
               "signupStepCount": 1, "nagCount": 2,
               "skippedInClean": ["/cancel/step1", "/cancel/step3"], "totalLabels": 15 },
  "labels": [ { "scope": "flow", "pattern": "cancel_obstruction", "…": "…" } ],
  "steps": [ { "path": "/manage", "labels": [ … ] } ] }
```

**플로우 라벨이 따로 있는 이유**: 취소·탈퇴 방해(§21조의2①4)는 "가입보다 해지가 복잡한가"로
정의되고 반복간섭(§21조의2①5)은 "반복되는가"로 정의된다. 한 화면의 DOM만 봐서는 구조적으로
판정이 불가능하므로, 채점도 두 층위에서 따로 한다.

### `GET /api/catalog`

다크패턴 유형 사전 (`pattern` ID → 한글명/법조문/심각도/설명). 대시보드는 유형명과 법조문을
직접 하드코딩하지 말고 여기서 가져올 것.

### `GET /api/ground-truth` (루트)

라벨링된 서비스 인덱스. 채점 스크립트가 평가셋을 열거할 때 쓴다.

---

## 5. 탐지기 출력 형식

```json
{
  "detector": "rule-v1",
  "detections": [
    { "service": "streamnow", "path": "/signup", "variant": "dark",
      "el": "signup-plan", "pattern": "preselection" },
    { "service": "streamnow", "flow": "cancel", "variant": "dark",
      "pattern": "cancel_obstruction" }
  ]
}
```

- `pattern`은 `/api/catalog`의 키 중 하나여야 한다.
- 페이지 탐지는 `(service, path, variant, el, pattern)` 5개가 모두 맞아야 정답이다.
  `el`은 DOM에서 가장 가까운 조상의 `data-el` 값을 읽으면 된다. "이 페이지 어딘가에 다크패턴이
  있다"는 정답으로 인정되지 않는다.
- 플로우 탐지는 `(service, flow, variant, pattern)`로 맞춘다.

채점:

```bash
cd mock-services
npm run score:sample          # 정답표에서 만든 완벽한 탐지기로 파이프라인 검증
node scripts/score.js out.json
node scripts/score.js --sample --noisy   # 채점기가 실제로 틀림을 잡아내는지 확인
```

정밀도·재현율·F1, 유형별 재현율, **정상 화면에서의 오탐 건수**를 출력한다. 대조군은
`variant=clean` 화면 전부 + 준수 서비스 ReadWell의 모든 화면이다.

---

## 6. 변경 규칙

| 바꿔도 되는 것 | 사전 공유 후 바꿀 것 | 바꾸면 안 되는 것 |
| --- | --- | --- |
| 화면 문구·색상·레이아웃 | `data-testid`, 경로, `data-el` 값 | `pattern` ID (카탈로그 키) |
| 다크패턴 추가/강화 | `/api/status` 필드 제거 | 두 축(`variant`/`attack`)의 의미 |

`pattern` ID는 정답표·탐지기 출력·채점기가 공유하는 유일한 키라서, 이름을 바꾸면 그때까지
측정한 모든 수치가 무효가 된다. 한글명이 어색하면 `catalog.js`의 `ko` 필드만 고치면 된다.
