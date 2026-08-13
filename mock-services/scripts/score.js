#!/usr/bin/env node
// Scores a detector's output against the mock services' ground truth.
//
//   node scripts/score.js --sample                 # perfect-detector dry run
//   node scripts/score.js out.json                 # score a real detector
//   node scripts/score.js out.json --noisy         # sanity check: is the scorer
//                                                  # actually able to fail you?
//
// Boots the mock server in-process on an ephemeral port, so this runs with no
// other terminal open. Pass --base http://host:port to score against a running
// instance instead.
//
// Detector output format (see CONTRACT.md):
//   { "detector": "<name>", "detections": [
//       { "service": "streamnow", "path": "/signup", "variant": "dark",
//         "el": "signup-plan", "pattern": "preselection" },
//       { "service": "streamnow", "flow": "cancel", "variant": "dark",
//         "pattern": "cancel_obstruction" }
//   ]}
//
// Page detections are matched on (service, path, variant, el, pattern) — element
// granularity, so "there is a dark pattern somewhere on this page" does not earn
// a true positive. Flow detections are matched on (service, flow, variant,
// pattern) since they describe the path as a whole, not one element.

const fs = require("fs");
const path = require("path");
const { PATTERNS } = require("../src/darkpatterns/catalog");

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : d;
};
const outFile = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--base");

const VARIANTS = ["dark", "clean"];

async function collectTruth(base) {
  const index = await fetch(`${base}/api/ground-truth`).then((r) => r.json());
  const truth = { page: new Map(), flow: new Map(), byService: {} };
  for (const svc of index.services) {
    truth.byService[svc.service] = { pages: [], flows: [] };
    for (const variant of VARIANTS) {
      const gt = await fetch(
        `${base}/${svc.service}/api/ground-truth?variant=${variant}`
      ).then((r) => r.json());
      for (const p of gt.pages) {
        truth.byService[svc.service].pages.push({ service: svc.service, path: p.path, variant });
        for (const l of p.labels) {
          truth.page.set(`${svc.service}|${p.path}|${variant}|${l.el}|${l.pattern}`, l);
        }
      }
      for (const f of gt.flows) {
        truth.byService[svc.service].flows.push({ service: svc.service, flow: f.flow, variant });
        for (const l of f.labels) {
          truth.flow.set(`${svc.service}|${f.flow}|${variant}|${l.pattern}`, l);
        }
      }
    }
  }
  if (index.unlabelled?.length) {
    console.log(`※ 아직 라벨링되지 않은 서비스(평가셋 제외): ${index.unlabelled.join(", ")}\n`);
  }
  return truth;
}

function keyOf(d) {
  return d.flow
    ? `${d.service}|${d.flow}|${d.variant || "dark"}|${d.pattern}`
    : `${d.service}|${d.path}|${d.variant || "dark"}|${d.el}|${d.pattern}`;
}

function score(truth, detections) {
  const expected = new Map([...truth.page, ...truth.flow]);
  const reported = new Set(detections.map(keyOf));

  const tp = [...reported].filter((k) => expected.has(k));
  const fp = [...reported].filter((k) => !expected.has(k));
  const fn = [...expected.keys()].filter((k) => !reported.has(k));

  const precision = tp.length / (tp.length + fp.length || 1);
  const recall = tp.length / (tp.length + fn.length || 1);
  const f1 = (2 * precision * recall) / (precision + recall || 1);

  // False positives on compliant screens are the number that matters most: a
  // detector that answers "다크패턴입니다" to everything scores perfectly on an
  // evaluation set made only of offenders, so the control group is what makes
  // the other numbers mean anything.
  //
  // A control surface is any page or flow with zero expected labels — that
  // covers every ?variant=clean screen *and* every screen of a service marked
  // compliant (ReadWell), which has no dark version at all.
  const surfacesWithLabels = new Set(
    [...expected.keys()].map((k) => {
      const p = k.split("|");
      return p.slice(0, 3).join("|");
    })
  );
  const isControl = (k) => !surfacesWithLabels.has(k.split("|").slice(0, 3).join("|"));
  const controlFp = fp.filter(isControl);
  const controlSurfaces = Object.values(truth.byService).reduce(
    (n, s) =>
      n +
      s.pages.filter((p) => !surfacesWithLabels.has(`${p.service}|${p.path}|${p.variant}`)).length +
      s.flows.filter((f) => !surfacesWithLabels.has(`${f.service}|${f.flow}|${f.variant}`)).length,
    0
  );

  return { tp, fp, fn, precision, recall, f1, controlFp, controlSurfaces };
}

function byPattern(truth, detections) {
  const expected = new Map([...truth.page, ...truth.flow]);
  const reported = new Set(detections.map(keyOf));
  const rows = {};
  const bump = (p, k) => {
    rows[p] = rows[p] || { tp: 0, fp: 0, fn: 0 };
    rows[p][k]++;
  };
  for (const [k] of expected) bump(k.split("|").pop(), reported.has(k) ? "tp" : "fn");
  for (const k of reported) if (!expected.has(k)) bump(k.split("|").pop(), "fp");
  return rows;
}

function pct(n) {
  return (n * 100).toFixed(1) + "%";
}

function report(result, rows) {
  const { tp, fp, fn, precision, recall, f1, controlFp, controlSurfaces } = result;
  console.log("═══ 다크패턴 탐지 정확도 ═══");
  console.log(`정답 라벨 수      ${tp.length + fn.length}`);
  console.log(`탐지 보고 수      ${tp.length + fp.length}`);
  console.log(`TP ${tp.length}  /  FP ${fp.length}  /  FN ${fn.length}`);
  console.log(`정밀도(precision) ${pct(precision)}`);
  console.log(`재현율(recall)    ${pct(recall)}`);
  console.log(`F1                ${pct(f1)}`);
  console.log(`정상 화면 오탐      ${controlFp.length}건 / 대조군 ${controlSurfaces}개 화면·플로우`);
  console.log(`                   (시정 후 화면 + 준수 서비스 ReadWell)`);

  console.log("\n─── 유형별 ───");
  const width = Math.max(...Object.keys(rows).map((p) => (PATTERNS[p]?.ko || p).length)) + 2;
  for (const [p, r] of Object.entries(rows).sort((a, b) => b[1].tp + b[1].fn - (a[1].tp + a[1].fn))) {
    const meta = PATTERNS[p];
    const rec = r.tp + r.fn ? r.tp / (r.tp + r.fn) : NaN;
    const name = (meta?.ko || p) + (meta?.newly_regulated ? " ★" : "");
    console.log(
      `${name.padEnd(width)} TP ${String(r.tp).padStart(2)}  FP ${String(r.fp).padStart(2)}  FN ${String(r.fn).padStart(2)}` +
        (Number.isNaN(rec) ? "" : `   재현율 ${pct(rec)}`) +
        (meta?.law ? `   ${meta.law}` : "")
    );
  }
  console.log("\n★ = 개정 전자상거래법이 추가로 규율하는 6개 유형");

  if (fn.length) {
    console.log("\n─── 놓친 항목(FN) 상위 10 ───");
    fn.slice(0, 10).forEach((k) => console.log("  " + k));
  }
  if (fp.length) {
    console.log("\n─── 오탐(FP) 상위 10 ───");
    fp.slice(0, 10).forEach((k) => console.log("  " + k));
  }
}

async function main() {
  let base = opt("--base");
  let server;
  if (!base) {
    const app = require("../src/server");
    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  }

  const truth = await collectTruth(base);

  let detections;
  if (flag("--sample")) {
    // A perfect detector, derived from the answer key itself. Useful to prove
    // the scoring pipeline works before the real detector exists, and to hand
    // teammate 1 a concrete example of the expected output format.
    detections = [
      ...[...truth.page.entries()].map(([k, l]) => {
        const [service, p, variant, el] = k.split("|");
        return { service, path: p, variant, el, pattern: l.pattern };
      }),
      ...[...truth.flow.entries()].map(([k, l]) => {
        const [service, f, variant] = k.split("|");
        return { service, flow: f, variant, pattern: l.pattern };
      }),
    ];
    if (flag("--noisy")) {
      // Drop a fifth of the answers and invent two false alarms, one of them on
      // a compliant page — if the numbers below stay perfect, the scorer is broken.
      detections = detections.filter((_, i) => i % 5 !== 0);
      detections.push({ service: "streamnow", path: "/signup", variant: "clean", el: "signup-plan", pattern: "preselection" });
      detections.push({ service: "streamnow", path: "/manage", variant: "dark", el: "manage-menu", pattern: "false_discount" });
    }
    const outPath = path.join(__dirname, "..", "sample-detector-output.json");
    fs.writeFileSync(outPath, JSON.stringify({ detector: "sample(oracle)", detections }, null, 2));
    console.log(`샘플 탐지 결과를 ${path.relative(process.cwd(), outPath)} 에 저장했습니다.\n`);
  } else {
    if (!outFile) {
      console.error("사용법: node scripts/score.js <detector-output.json> | --sample");
      process.exit(1);
    }
    detections = JSON.parse(fs.readFileSync(outFile, "utf8")).detections;
  }

  report(score(truth, detections), byPattern(truth, detections));
  if (server) server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
