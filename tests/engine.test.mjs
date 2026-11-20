// Run with:  node --test tests/engine.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const makeEngine = require("../static/js/engine.js");
const R = require("../static/js/requirements.js");
const D = JSON.parse(readFileSync(new URL("../data/planner-data.json", import.meta.url)));
const E = makeEngine(D);

const student = {
  busy: new Set(["T8", "T9", "T10", "T11", "R8", "R9", "R10", "R11"]),
  prefs: { noEarly: true, noLate: false, compact: false, full: false, format: "prefer-in", campus: "any" },
  prof: {},
};

function overlaps(a, b) {
  for (const x of a.meets) for (const y of b.meets) {
    if (!x.days.some(d => y.days.includes(d))) continue;
    if (x.d1 < y.d0 || y.d1 < x.d0) continue;
    if (x.s < y.e && y.s < x.e) return true;
  }
  return false;
}

test("schedules have no time clashes and respect busy hours", () => {
  const offered = ["ENGL 1102", "MATH 1190", "CSE 1322", "HIST 2112"].filter(c => E.byCourse[c]);
  const out = E.solve({ courses: offered, ...student });
  assert.ok(out.results.length > 0, "found at least one schedule");
  for (const r of out.results) {
    for (let i = 0; i < r.secs.length; i++)
      for (let j = i + 1; j < r.secs.length; j++)
        assert.ok(!overlaps(r.secs[i], r.secs[j]), `${r.secs[i].crn} clashes with ${r.secs[j].crn}`);
    for (const s of r.secs) for (const m of s.meets) for (const d of m.days)
      for (let h = Math.floor(m.s / 60); h * 60 < m.e; h++) assert.ok(!student.busy.has(d + h), `${s.crn} is in a busy hour`);
  }
});

test("labs are added with their lecture", () => {
  if (!E.byCourse["CSE 1322L"]) return;
  const out = E.solve({ courses: ["CSE 1322"], ...student });
  assert.deepEqual(out.courses, ["CSE 1322", "CSE 1322L"]);
});

test("a course with no fitting section is reported, not silently dropped", () => {
  const everyHour = new Set();
  for (const d of "MTWRF") for (let h = 8; h < 22; h++) everyHour.add(d + h);
  const out = E.solve({ courses: ["MATH 1190"], ...student, busy: everyHour, prefs: { ...student.prefs, format: "in" } });
  assert.equal(out.results.length, 0);
  assert.equal(out.blocked[0].c, "MATH 1190");
});

test("requirements data is well-formed", () => {
  const code = /^[A-Z]{2,4} \d{4}$/;
  for (const [k, m] of Object.entries(R.MAJORS)) {
    assert.ok(m.name && m.src && m.groups.length, k);
    for (const g of m.groups) for (const it of g.items) {
      if (it.c) assert.match(it.c, code, `${k}: ${it.c}`);
      else {
        assert.ok(it.slot && it.pick >= 1 && it.opts.length >= it.pick, `${k}: slot ${it.label}`);
        for (const o of it.opts) assert.match(o, code, `${k}: ${o}`);
      }
    }
  }
  for (const [c, reqs] of Object.entries(R.PRE)) {
    assert.match(c, code);
    for (const req of reqs) for (const a of [].concat(req)) assert.match(a.replace("*", ""), code, `${c} needs ${a}`);
  }
});
