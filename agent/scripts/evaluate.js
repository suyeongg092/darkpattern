// Runs every (service x normal/attack) scenario N times headless and
// computes the metrics the proposal's week-5 plan calls for: attack block
// rate, legitimate-request success rate (false positive rate), and latency.
//
// Usage: node scripts/evaluate.js [reps]   (default reps=3)

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const AGENT_ENTRY = path.join(__dirname, "..", "src", "run.js");
const AGENT_DIR = path.join(__dirname, "..");
const SERVICES = ["ordernow-club", "supercart-plus", "primevault", "cloudstudio"];
const REPS = Number(process.argv[2] || process.env.EVAL_REPS || 3);

function runOnce(service, attack, i) {
  const uid = `eval-${service}-${attack ? "attack" : "normal"}-${i}-${Date.now()}`;
  const args = [AGENT_ENTRY, service, uid, "--headless"];
  if (attack) args.push("--attack");

  const startedAt = Date.now();
  let stdout = "";
  try {
    stdout = execFileSync("node", args, { encoding: "utf8", cwd: AGENT_DIR });
  } catch (err) {
    stdout = (err.stdout || "").toString();
  }
  const wallMs = Date.now() - startedAt;

  const match = stdout.match(/RESULT_JSON:(.*)/);
  if (!match) {
    return { service, attack, ok: false, error: "no RESULT_JSON in output", wallMs };
  }
  const { verdict } = JSON.parse(match[1]);
  return { ok: true, ...verdict, wallMs };
}

function avg(rows, field) {
  const vals = rows.map((r) => r[field]).filter((v) => typeof v === "number");
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function main() {
  console.log(`평가 시작: 서비스 ${SERVICES.length}개 x (정상/공격) x 반복 ${REPS}회 = 총 ${SERVICES.length * 2 * REPS}회 실행\n`);

  const rows = [];
  for (const service of SERVICES) {
    for (const attack of [false, true]) {
      for (let i = 0; i < REPS; i++) {
        const result = runOnce(service, attack, i);
        rows.push({ service, attack, ...result });
        const mark = !result.ok ? "ERROR" : result.blocked ? "BLOCKED(사전)" : result.integrityViolation ? "위반탐지(사후)" : "정상통과";
        console.log(`  ${service.padEnd(15)} ${attack ? "공격" : "정상"} #${i + 1}: ${mark} (${result.wallMs}ms)`);
      }
    }
  }

  const attackRuns = rows.filter((r) => r.attack);
  const normalRuns = rows.filter((r) => !r.attack);
  const attackCaught = attackRuns.filter((r) => r.blocked || r.integrityViolation).length;
  const normalClean = normalRuns.filter((r) => r.ok && !r.blocked && !r.integrityViolation).length;

  console.log("\n=== 평가 지표 ===");
  console.log(
    `공격 차단률 (사전 차단 + 사후 위반탐지): ${attackCaught}/${attackRuns.length} = ${((100 * attackCaught) / attackRuns.length).toFixed(1)}%`
  );
  console.log(
    `정상 업무 성공률: ${normalClean}/${normalRuns.length} = ${((100 * normalClean) / normalRuns.length).toFixed(1)}%`
  );
  console.log(
    `오탐률 (정상 요청이 잘못 차단/플래그됨): ${(100 - (100 * normalClean) / normalRuns.length).toFixed(1)}%`
  );
  console.log(`평균 지연시간 (정상 실행): ${avg(normalRuns, "wallMs")}ms`);
  console.log(`평균 지연시간 (공격 실행): ${avg(attackRuns, "wallMs")}ms`);

  console.log("\n서비스별 상세:");
  for (const service of SERVICES) {
    for (const attack of [false, true]) {
      const rs = rows.filter((r) => r.service === service && r.attack === attack);
      const caught = rs.filter((r) => r.blocked || r.integrityViolation).length;
      const label = attack ? `탐지 ${caught}/${rs.length}` : `정상통과 ${rs.length - caught}/${rs.length}`;
      console.log(`  ${service.padEnd(15)} [${attack ? "공격" : "정상"}] ${label}, 평균 ${avg(rs, "wallMs")}ms`);
    }
  }

  const outPath = path.join(__dirname, "..", "eval-results.json");
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
  console.log(`\n상세 결과 저장: ${path.relative(process.cwd(), outPath)}`);
}

main();
