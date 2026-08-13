# 다크패턴 해지 Agent + 무결성 검증

구독/멤버십 해지 다크패턴을 뚫고 실행해주는 Agent와, 그 Agent가 조작(ADI형 공격)당하지
않는지 검증하는 무결성 레이어를 함께 구현하는 프로젝트.

## 구성

- `mock-services/` — 다크패턴을 재현한 목업 사이트 5개 + 대조군 1개. 실제 사례에서
  착안했으나 상표 문제를 피하기 위해 이름을 변경함. **모든 다크패턴에 정답 라벨(ground
  truth)이 달려 있어 탐지기 평가셋으로 쓸 수 있다.**
  - **StreamNow** — 웨이브·Hulu류 OTT 무료체험 (숨은갱신, 사전선택, 속임수 문구/질문)
  - **OrderNow Club** — 배달의민족 배민클럽류 멤버십 (메뉴 깊숙이 숨긴 해지, 리텐션 쿠폰,
    confirmshaming 설문)
  - **SuperCart Plus** — 쿠팡 로켓와우류 멤버십 + 구매 플로우 (순차공개 가격책정,
    해지 아닌 옵션이 기본 선택, 불필요한 전화인증)
  - **PrimeVault** — Amazon Prime "Iliad Flow"(FTC 제소 건) 스타일 4단계 만류 플로우
  - **CloudStudio** — Adobe Creative Cloud(FTC 제소 건) 스타일, 위약금 아코디언에 숨김,
    즉시해지는 전화로만
  - **ReadWell** — 전자책 구독. **다크패턴이 하나도 없는 대조군.** 공정위 시정 기준을
    처음부터 지켜 만들었고 정답 라벨이 0개다. 탐지기가 여기서 무언가를 보고하면 전부 오탐
- `agent/` — 정책 변환 / 사전(pre-execution) DOM 검증 / 일회성 실행 토큰 / 실행 후 상태
  대조를 수행하는 무결성 검증 Agent. Playwright로 목업 서비스를 실제로 조작한다.
- `dashboard/` — 구독 목록·AI 제안·무결성 로그를 보여주는 웹 대시보드. 버튼 클릭으로
  `agent/`를 실행하고 결과를 실시간 타임라인으로 표시한다.

인터페이스 계약(경로, `data-testid`, API 스키마, 탐지기 출력 형식)은
[mock-services/CONTRACT.md](mock-services/CONTRACT.md)에 정리되어 있다. 세 디렉터리를
나눠서 작업할 때 서로 의존해도 되는 것은 그 문서에 적힌 것뿐이다.

## 두 개의 축 — `variant`와 `attack`

목업 사이트는 서로 독립인 두 개의 스위치를 갖는다. 섞으면 실험 설계가 무너지므로
분리해서 기억한다.

| 파라미터 | 축 | 재현하는 것 | 검증 대상 |
| --- | --- | --- | --- |
| `?variant=clean` | 다크패턴 | 공정위 "시정 후" 화면 | 탐지기의 오탐률 |
| `?attack=1` | 무결성(ADI) | 문구는 그대로, 처리 로직만 조작 | Agent의 사전·사후 검증 |

**다크패턴 축**: 기본값은 시정 전(`dark`)이고, `?variant=clean`을 붙이면 공정위 시정
사례에 맞춰 고친 같은 기능의 화면이 나온다 (해지/유지 버튼 동등 크기, '즉시해지' 병렬
제공, 총액 첫 화면 표시, 필수·선택 항목 구분 표시 등). clean 화면에는 정답 라벨이 0개이므로,
여기서 탐지기가 보고하는 것은 전부 오탐이다.

**무결성 축**: `?attack=1`은 화면에 보이는 버튼 라벨/문구는 그대로 두고 실제 처리 로직만
다르게 동작시킨다 (라벨-엔드포인트 불일치, 히든 필드 주입, 표시된 결과와 실제 상태 불일치).
Agent Data Injection(ADI, arXiv:2607.05120)에서 설명하는 "명령이 아니라 메타데이터를 위조해
Agent가 스스로 잘못 판단하게 만드는" 공격을 재현하기 위함이다.

두 축은 동시에 켤 수 있다. `?variant=clean&attack=1`은 "규정을 지킨 화면인데 백엔드가
조작된" 상태로, 다크패턴 탐지와 무결성 검증이 서로 다른 문제를 푼다는 것을 보여준다.

## 다크패턴 평가셋

각 페이지는 HTML 문자열이 아니라 **다크패턴 블록의 목록**으로 선언되고, 같은 선언에서
화면(`render`)과 정답표(`labels`)를 함께 뽑아낸다. 화면을 고치면 정답표가 자동으로 따라오므로
둘이 어긋날 수 없다. 렌더된 HTML에는 패턴 이름이 일절 등장하지 않고 `data-el`이라는 중립
앵커만 남으므로, 탐지기가 정답을 커닝할 수 없다.

```bash
cd mock-services
npm run score:sample                     # 정답표에서 만든 완벽한 탐지기로 파이프라인 검증
node scripts/score.js out.json           # 실제 탐지기 채점
node scripts/score.js --sample --noisy   # 채점기가 오류를 실제로 잡는지 확인
node scripts/check-contract.js           # agent executor 셀렉터가 안 깨졌는지 확인
```

현재 평가셋: **86개 라벨 / 18개 유형** (개정 전자상거래법이 신설 규율하는 6개 유형 전부 포함),
정상 화면 대조군 **50개 화면·플로우**(시정 후 화면 전부 + 준수 서비스 ReadWell). 정밀도·재현율·F1,
유형별 재현율, 정상 화면 오탐 건수를 출력한다.

**시정 후에는 해지 단계 자체가 줄어든다.** 만류·설문처럼 붙잡기 위해서만 존재하는 단계는
`variant=clean`에서 렌더되지 않고 다음 단계로 리다이렉트된다 — 공정위 붙임2 1.(1)의 시정이
그 단계를 고쳐 쓴 게 아니라 **삭제**한 것이기 때문이다. 그래서 플로우 정답표에서 이런 숫자가
바로 나온다.

| 서비스 | 가입 | 해지 (시정 전) | 해지 (시정 후) |
| --- | --- | --- | --- |
| StreamNow | 1단계 | 5단계 | 3단계 |
| OrderNow Club | 1단계 | 5단계 | 3단계 |
| SuperCart Plus | 1단계 | 4단계 | 2단계 |
| PrimeVault | 1단계 | 4단계 | 2단계 |
| CloudStudio | 1단계 | 3단계 | 2단계 |

취소·탈퇴 방해는 "해지가 불가능한 것"이 아니라 "가입보다 부당하게 어려운 것"이므로,
양쪽 다 해지는 되고 **비용이 다르다**는 것을 이 숫자로 보여준다.

구독 상태는 두 변형이 분리되어 있다. 시정 전에서 해지해도 시정 후 화면은 여전히 이용중으로
보이므로, before/after 캡처를 찍을 때 앞에서 눌러본 것이 뒤에 새지 않는다.

정답표는 페이지 단위와 플로우 단위 두 층위로 제공된다. 취소·탈퇴 방해(§21조의2①4)는 "가입보다
해지가 복잡한가", 반복간섭(§21조의2①5)은 "반복되는가"로 정의되어 한 화면의 DOM만으로는
구조적으로 판정할 수 없기 때문이다.

```
GET /:service/api/ground-truth?path=/signup   # 페이지 단위
GET /:service/api/ground-truth?flow=cancel    # 플로우 단위 (단계 수, 만류 횟수 포함)
GET /api/catalog                              # 유형 사전 (한글명/법조문/심각도)
```

## 실행 방법

```bash
npm install
npm run mock:start
# http://localhost:4000  시연용 정문 — 파라미터 없는 서비스 목록
# http://localhost:4000/lab  개발용 평가 패널 — 2x2 스위치보드, 정답표, 채점 명령어
```

입구가 두 개인 이유: `/`는 계측된 티가 안 나는 평범한 서비스 목록이라 시연·대시보드
연결에 쓰고, `/lab`은 시정 전/후·공격 모드를 켜고 끄는 조작 패널이라 우리끼리만 쓴다.
시연 중에는 `/lab`을 열지 않는다.

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
StreamNow와 ReadWell은 아직 executor가 없다 — 목업 쪽 `data-testid`는 모두 준비되어 있으니
(`mock-services/CONTRACT.md` §3 참조) 추가하려면 executor 파일만 쓰면 된다. 특히 ReadWell은
다크패턴이 없어서 두 번 클릭으로 끝나므로, "쉬운 해지 vs 어려운 해지"의 지연시간 대비를
지표로 보여줄 수 있다.
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
