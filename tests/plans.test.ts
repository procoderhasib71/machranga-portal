// পরিকল্পনার টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPlans, daysLeft, topicOf, type PlanBlockRow } from "../lib/plans.ts";
import { buildExamPlan, groupDays } from "../lib/examPlan.ts";

const blk = (o: Partial<PlanBlockRow>): PlanBlockRow => ({ id: 1, date: "2026-11-12", title: "x", plan_id: null, days: "once", start_time: "21:00", end_time: null, note: null, remind: 1, focus: null, ...o });

test("plan এর অধীনের দিন: অবস্থা, অগ্রগতি, পরের দিন; plan_id ছাড়া পুরনো ব্লক নামে মেলে", () => {
  const plans = [{ id: 7, name: "মেডিসিন", book: "Davidson", exam_date: "2026-12-15", start_time: "21:00", end_time: null }];
  const blocks = [
    blk({ id: 1, date: "2026-11-11", title: "মেডিসিন: দিন ১ — Cardiology", plan_id: 7 }),
    blk({ id: 2, date: "2026-11-12", title: "মেডিসিন: দিন ২ — Respiratory", plan_id: 7 }),
    blk({ id: 3, date: "2026-11-13", title: "মেডিসিন: দিন ৩ — GIT", plan_id: 7 }),
    blk({ id: 8, date: "2026-11-01", title: "পুরনো: দিন ১" }), blk({ id: 9, date: "2026-11-02", title: "পুরনো: দিন ২" }),
    blk({ id: 10, date: "2026-11-20", title: "ডাক্তার দেখানো" }),
  ];
  const ps = buildPlans(plans, blocks, new Map([["1|2026-11-11", "done"]]), "2026-11-12");
  assert.deepEqual(ps.map((p) => [p.name, p.finished]), [["মেডিসিন", false], ["পুরনো", true]]);
  assert.deepEqual(ps[0].days.map((d) => [d.topic, d.status]), [["Cardiology", "done"], ["Respiratory", "today"], ["GIT", "upcoming"]]);
  assert.equal(ps[0].next, "2026-11-12");
  assert.equal(daysLeft("2026-12-15", "2026-11-12"), 33);
  assert.equal(topicOf("কার্ডিওলজি: দিন ১"), "দিন ১");
});

test("পরীক্ষার পরিকল্পনা বটের নিয়মে, দেখানোর জন্য পরপর অধ্যায় এক সারিতে", () => {
  const r = buildExamPlan("মেডিসিন", ["Cardiology", "Respiratory"], "2026-11-20", "2026-11-13", 2);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.days[0].title, "মেডিসিন: দিন ১ — Cardiology (১/৩)");
  assert.equal(r.days.at(-1)!.title, "মেডিসিন: রিভিশন ২");
  assert.deepEqual(groupDays(r.days).map((g) => [g.from, g.to, g.topic]),
    [["2026-11-13", "2026-11-15", "Cardiology"], ["2026-11-16", "2026-11-17", "Respiratory"], ["2026-11-18", "2026-11-19", "রিভিশন"]]);
  assert.equal(buildExamPlan("x", [], "2026-11-20", "2026-11-13").ok, false);
});
