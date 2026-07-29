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
- `dashboard/` — 구독 목록·AI 제안·무결성 로그를 보여주는 웹 대시보드. 버튼 클릭으로
  `agent/`를 실행하고 결과를 실시간 타임라인으로 표시한다.

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

## 대시보드 실행 방법

`mock-services`가 떠 있는 상태에서, 새 터미널을 열고:

```bash
npm run dashboard:start
# http://localhost:5000 접속
```

구독 목록 카드마다 "AI Agent로 해지 (정상)" / "AI Agent로 해지 (공격 시뮬레이션)" 버튼이
있다. 클릭하면 서버가 `agent/src/run.js`를 그대로 실행하고, 콘솔에 찍히는 것과 동일한
단계별 로그 + 최종 판정을 오른쪽 패널에 실시간으로 보여준다. 발표/시연 영상은 이 화면과
Playwright가 띄우는 브라우저 창을 같이 녹화하면 된다. 상단의 "새 데모 세션" 버튼은 모든
구독 상태를 다시 "이용중"으로 리셋한다 (uid를 새로 발급하는 방식).

## 평가 지표 측정

```bash
cd agent
node scripts/evaluate.js 5   # 서비스 4개 x (정상/공격) x 5회 = 40회 자동 실행
```

공격 차단률, 정상 업무 성공률(오탐률), 평균 지연시간을 계산해 콘솔에 출력하고
`agent/eval-results.json`에 원본 결과를 저장한다. 로컬에서 3회 반복 기준 공격 차단률
100%, 정상 성공률 100%(오탐 0%), 평균 지연 1.3~1.6초가 나왔다 — 보고서의 "5주차: 성공률/
차단률/오탐률/지연시간 측정" 항목에 그대로 쓸 수 있는 수치다.

## 공개 URL로 배포하기 (Render)

`mock-services` + `agent` + `dashboard`를 컨테이너 하나로 묶은 `Dockerfile`이 준비되어
있다. 팀원들과 공유할 실제 URL이 필요하면:

1. [render.com](https://render.com)에서 GitHub 계정으로 무료 가입
2. New → Blueprint → 이 저장소 선택 (루트의 `render.yaml`을 자동으로 인식함)
3. Deploy 클릭 — 첫 빌드는 Playwright 이미지(약 2GB) 때문에 5~10분 정도 걸림
4. 완료되면 `https://darkpattern-agent-integrity-XXXX.onrender.com` 같은 URL이 발급됨

**주의사항**
- Render 무료 플랜은 15분간 요청이 없으면 슬립 상태가 되고, 다음 요청에서 10~30초 정도
  깨어나는 지연(cold start)이 있다. 시연/발표 직전에 한 번 미리 접속해두면 지연 없이 바로
  쓸 수 있다.
- 공개 URL이므로 아무나 `/api/run`을 호출해 브라우저 자동화를 실행시킬 수 있다. 팀 내부
  공유·데모 용도로만 링크를 쓰고, 무제한 공개 배포로 남겨두지 않는 걸 권장한다.
- 로컬 Docker로 먼저 확인하려면: `docker build -t darkpattern . && docker run -p 5000:5000
  -e PORT=5000 darkpattern` 후 `http://localhost:5000` 접속.
