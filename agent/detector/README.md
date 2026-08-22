# team-agent — 팀 저장소(darkpattern)용 다크패턴 탐지+우회 에이전트

`suyeongg092/darkpattern` 팀 저장소의 `mock-services`(다크패턴 목업, 정답 라벨 90개/20유형)를
대상으로, **다크패턴을 탐지하고 우회해서 실제 해지까지 완료하는 LLM+RAG 기반 에이전트**입니다.
팀 저장소의 `agent/`(무결성 검증, ADI 방어 전용)와는 다른 문제를 풉니다 — 이쪽은 CONTRACT.md가
"대시보드·탐지" 역할로 비워둔, 실제 다크패턴을 판단하는 탐지기 자리를 채웁니다.

## 왜 이렇게 나눴는가

- `agent/`(팀원 기존 코드): 정해진 서비스별 `executors/*.js`가 고정된 순서로 클릭하고,
  실행 전/후 서버 상태가 미리 정해둔 정책과 일치하는지만 검증합니다. 다크패턴 판단이
  없습니다 (`policy.js` 주석: "Deliberately not an LLM call").
- `team-agent`(이 코드): 매 페이지마다 `[data-el]` 블록이 다크패턴인지, `[data-testid]`
  후보 중 어떤 게 사용자의 진짜 목표(해지)에 부합하는지를 **그때그때 판단**해서 클릭합니다.
  서비스별 하드코딩된 셀렉터가 전혀 없습니다.

## 실행 전 준비

```bash
# 1) 팀 저장소를 옆에 클론하고 mock-services를 띄워둔다 (한 번만)
git clone https://github.com/suyeongg092/darkpattern.git ../teammate-darkpattern
cd ../teammate-darkpattern && npm install && npm run mock:start &
# http://localhost:4000 에서 확인

# 2) 이 폴더에서 파이썬 패키지 설치
cd ../team-agent
pip install -r requirements.txt --break-system-packages
playwright install chromium   # 브라우저가 없다면

# 3) (선택) llm_rag 모드가 실제 GPT 판단을 쓰게 하려면
export OPENAI_API_KEY=sk-...
```

## 실행

```bash
# 한 모드만
python3 -m team_agent.run ordernow-club --mode llm_rag

# naive(대조군) vs rules(규칙기반) vs llm_rag(LLM+RAG) 세 모드 한 번에 비교 + 자동 채점 + 리포트
python3 -m team_agent.run ordernow-club --mode all

# 쉼표로 원하는 모드만 골라서 (예: 네트워크가 막힌 곳에서 느린 llm_rag를 건너뛰고 싶을 때)
python3 -m team_agent.run ordernow-club --mode naive,rules

# 화면으로 천천히 보면서 (데모용)
python3 -m team_agent.run ordernow-club --mode llm_rag --demo

# ADI 공격 모드까지 같이 보고 싶으면
python3 -m team_agent.run ordernow-club --mode llm_rag --attack
```

실행이 끝나면:

- `detections_<service>_<mode>.json` — CONTRACT.md 5절 형식의 탐지 결과. 팀 채점기로 바로 채점됨:
  `cd ../teammate-darkpattern/mock-services && node scripts/score.js <경로>`
- `report_<service>.html` — 각 모드가 어떤 요소를 다크패턴으로 판단했는지, 어떤 후보를
  왜 선택해서 클릭했는지, 서버 상태 재조회로 실제 해지가 확인됐는지를 스크린샷과 함께 보여줌.
  (빨간 테두리 = 이번에 클릭한 요소, 파란 점선 = 검토했지만 고르지 않은 다른 후보)
- `logs/run_<service>_<timestamp>.json` — 전체 원본 로그.

## 세 모드

| 모드 | 다크패턴 판단 | 클릭 대상 선택 |
| --- | --- | --- |
| `naive` | 안 함 | 화면에서 시각적으로 가장 큰 버튼 (일반 자동화가 어떻게 걸려드는지 보여주는 대조군) |
| `rules` | 키워드/명암비/면적비 휴리스틱 | 같은 휴리스틱 |
| `llm_rag` | GPT + RAG(팀 `/api/catalog` 법조문 설명 + 학술 지식베이스) | 같은 방식 |

`llm_rag`는 OpenAI API에 도달하지 못하면(키 없음/네트워크 차단) 그 판단만 자동으로 `rules`로
대체되고 로그에 `llm-fallback`이라고 남습니다 — 파이프라인 전체가 죽지 않습니다.

## 지금까지 확인된 것 (6개 서비스 전부, 이 샌드박스에서 실행, `--mode naive,rules`)

`navigator.py`/`extractor.py`/`llm_judge.py`는 서비스에 종속된 코드가 하나도 없습니다
(`[data-el]`/`[data-testid]` 계약만 봅니다) — 서비스별로 다른 건 시작 경로(`START_PATHS`)와
회원가입이 필요한지(`NEEDS_SIGNUP_BOOTSTRAP`, StreamNow만 해당) 뿐이고, 판단/클릭 로직 자체는
6개 서비스 모두 동일한 코드가 그대로 동작합니다.

| 서비스 | naive(대조군) | rules(규칙기반) | 비고 |
| --- | --- | --- | --- |
| OrderNow Club | dark 2단계에서 리텐션 버튼에 걸려 실패 / clean 4단계 성공 | dark 6단계·clean 4단계 모두 성공(`cancelled`) | |
| SuperCart Plus | dark·clean 모두 5단계에서 막힘(`active`) — 6자리 인증번호 필수입력을 못 채워서 | dark 5단계·clean 3단계 모두 성공(`cancelled`) | 인증번호 자동 채움 필요했던 서비스 |
| PrimeVault | dark 2단계에서 실패 / clean 3단계 성공 | dark 5단계·clean 3단계 모두 성공(`cancelled`) | |
| CloudStudio | dark 2단계에서 실패 / clean 3단계 성공 | dark 4단계·clean 3단계 모두 성공(`cancelled`) | |
| StreamNow | dark 3단계에서 실패 / clean 4단계 성공 | dark 6단계·clean 4단계 모두 성공(`cancelled`) | 미가입 상태로 시작 → 가입부터 자동 진행 |
| ReadWell | dark·clean 모두 성공(`scheduled`, 정기결제 해지) | 동일, 3단계 | 팀 계약상 다크패턴이 없는 준수(대조군) 서비스 — 탐지 0건이 정답 |

- `naive`(화면에서 제일 큰 버튼만 누르는 대조군)는 절반의 서비스에서 리텐션 미끼나 필수입력
  누락으로 실패합니다 — "탐지 없이 그냥 자동화만 하면 이렇게 걸려든다"를 보여주는 비교 기준입니다.
- `rules`는 6개 서비스 전부 dark/clean 두 변형 모두 실제 해지 성공(서버 `/api/status` 재조회로
  확인, 화면 문구를 신뢰하지 않음)했고, **clean(시정 후)·ReadWell(준수 서비스) 등 대조군 화면
  86개 전체에서 오탐 0건**입니다.
- 6개 서비스의 `rules` 탐지 결과를 하나로 합쳐(`detections_ALL_rules.json`) 팀 `score.js`로
  채점: 정답 라벨 90개 중 탐지 25건 보고, **TP 18 / FP 7 / FN 72 → 정밀도 72.0%, 재현율 20.0%,
  F1 31.3%**, 대조군 오탐 0건. 재현율이 낮은 건 `rules.py`가 키워드/명암비/면적비 같은 얕은
  휴리스틱만 쓰는 폴백이기 때문입니다 — 애초에 요청받은 방향("단순 단어 개수 분석 대신
  LLM 기반")이 바로 이 지점을 개선하려는 것이었습니다.
- `llm_rag`는 이 샌드박스가 `api.openai.com`에 접속할 수 없어 매 판단마다 `llm-fallback`으로
  자동 대체되어 `rules`와 동일하게 동작했습니다 — 실제 GPT+RAG 판단/정확도는 네트워크가 열린
  환경(로컬 맥, `OPENAI_API_KEY` 설정)에서 `--mode llm_rag` 또는 `--mode all`로 다시 확인해야
  진짜 수치가 나옵니다. 재현율이 rules 대비 크게 오를 것으로 예상되는 지점입니다(사전선택,
  숨은갱신, 순차공개 가격책정처럼 키워드만으로는 못 잡는 유형들).
