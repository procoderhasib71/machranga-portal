// পড়ার অগ্রগতির হিসাবের টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { lastDays, streak } from "../lib/progressCalc.ts";

test("lastDays: বাংলাদেশের তারিখে পুরনো থেকে নতুন", () => {
  const days = lastDays(3, new Date("2026-11-12T20:00:00Z"));   // ঢাকায় ১৩ নভেম্বর রাত ২টা
  assert.deepEqual(days, ["2026-11-11", "2026-11-12", "2026-11-13"]);
});

test("streak: আজ না পড়লেও গতকাল পর্যন্ত গোনে, ফাঁক পেলে থামে", () => {
  const days = ["d1", "d2", "d3", "d4", "d5"];
  assert.equal(streak(days, (d) => ["d2", "d3", "d4", "d5"].includes(d)), 4);
  assert.equal(streak(days, (d) => ["d3", "d4"].includes(d)), 2);
  assert.equal(streak(days, (d) => ["d1", "d2", "d4"].includes(d)), 1);
  assert.equal(streak(days, () => false), 0);
});
