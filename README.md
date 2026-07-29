# 다크패턴 해지 Agent + 무결성 검증

구독/멤버십 해지 다크패턴을 뚫고 실행해주는 Agent와, 그 Agent가 조작(ADI형 공격)당하지
않는지 검증하는 무결성 레이어를 함께 구현하는 프로젝트.

## 구성

- `mock-services/` — 다크패턴 해지 플로우를 재현한 목업 사이트 4개 (국내 2 + 해외 2).
  각 사이트는 실제 사례에서 착안했으나 상표 문제를 피하기 위해 이름을 변경함.
  - **OrderNow Club** — 배달의민족 배민클럽류 멤버십 (메뉴 깊숙이 숨긴 해지, 리텐션 쿠폰,
    confirmshaming 설문)
  - **SuperCart Plus** — 쿠팡 로켓와우류 멤버십 (해지 아닌 옵션이 기본 선택, 불필요한
    전화인증)
  - **PrimeVault** — Amazon Prime "Iliad Flow"(FTC 제소 건) 스타일 4단계 만류 플로우
  - **CloudStudio** — Adobe Creative Cloud(FTC 제소 건) 스타일, 위약금 아코디언에 숨김
- `agent/` — 정책 변환 / 사전(pre-execution) DOM 검증 / 일회성 실행 토큰 / 실행 후 상태
  대조를 수행하는 무결성 검증 Agent. Playwright로 4개 목업 서비스를 실제로 조작한다.
- `dashboard/` — 구독 목록·AI 제안·무결성 로그를 보여주는 웹 대시보드 (예정)

## 공격 모드 (ADI 시뮬레이션)

각 목업 서비스는 쿼리 파라미터 `?attack=1`로 "공격 모드"를 켤 수 있다. 공격 모드에서는
화면에 보이는 버튼 라벨/문구는 그대로 두고, 실제 처리 로직만 다르게 동작한다
(라벨-엔드포인트 불일치, 히든 필드 주입, 표시된 결과와 실제 상태 불일치). Agent Data
Injection(ADI, arXiv:2607.05120)에서 설명하는 "명령이 아니라 메타데이터를 위조해
Agent가 스스로 잘못 판단하게 만드는" 공격을 재현하기 위함이다.

## 실행 방법

```bash
npm install
npm run mock:start
# http://localhost:4000 에서 4개 목업 서비스 목록 확인
```

각 서비스는 `GET /<service>/api/status?uid=<uid>` 로 실제 구독 상태를 조회할 수 있다.
Agent의 "실행 후 상태 대조" 단계는 화면 표시 문구가 아니라 이 API를 신뢰 소스로 사용한다.

## Agent 실행 방법

`mock-services`가 `http://localhost:4000`에서 떠 있는 상태에서, 새 터미널을 열고:

```bash
cd agent
node src/run.js <service> [uid] [--attack] [--headless]
# 예: node src/run.js ordernow-club demo1          (정상 모드, 브라우저 창이 보임)
# 예: node src/run.js primevault demo2 --attack     (공격 모드)
```

`service`는 `ordernow-club` / `supercart-plus` / `primevault` / `cloudstudio` 중 하나.
`--headless`를 빼면 실제 브라우저 창이 뜨면서 Agent가 클릭하는 과정이 화면에 보인다
(시연 영상 녹화용). 콘솔에는 정책 변환 → 사전 검증 → 토큰 발급/검증 → 실행 → 사후
상태 대조까지 각 단계 로그와 최종 판정(JSON)이 출력된다.

**공격 유형별 방어 지점 (요약):**

| 목업 서비스 | 공격 기법 | 어느 단계에서 잡히는가 |
| --- | --- | --- |
| SuperCart Plus | hidden field 주입 (해지 버튼인데 실제 필드는 다운그레이드) | 사전(pre-execution) DOM 검증 — 실행 자체가 차단됨 |
| PrimeVault | form action 스왑 (버튼 라벨은 그대로, 실제 제출 대상 endpoint가 다름) | 사전(pre-execution) DOM 검증 — 실행 자체가 차단됨 |
| OrderNow Club | 표시된 결과와 실제 상태 불일치 (성공 화면은 거짓) | 사전 검증으로는 탐지 불가 → 사후 상태 재조회로 탐지 |
| CloudStudio | 공시된 금액과 실제 청구액 불일치 | 사전 검증으로는 탐지 불가 → 사후 상태 재조회로 탐지 |

두 서비스는 사전 차단, 두 서비스는 사후 탐지로 잡힌다는 점이 핵심 — 사전 검증만으로도,
사후 검증만으로도 충분하지 않고 두 계층이 모두 필요하다는 것을 그대로 보여준다.
