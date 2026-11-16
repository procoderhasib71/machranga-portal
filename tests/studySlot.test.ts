// রুটিনের "পড়ার সময়" আর তার সাথে যুক্ত পড়ার পরিকল্পনার টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildExamPlan, dayCodeOf, shiftOnDays, studyDates, weekdaysOf } from "../lib/examPlan.ts";
import { coveredSlots, mergeSlots } from "../lib/studySlot.ts";
import { planRoutineTodos, routineTitle, taskName, type RBlock } from "../lib/routineTodos.ts";
import { cleanBlock } from "../lib/routineEdit.ts";

test("তারিখ থেকে বার", () => {
  assert.equal(dayCodeOf("2026-11-13"), "FRI");
  assert.equal(dayCodeOf("2026-11-14"), "SAT");
  assert.deepEqual(weekdaysOf("daily"), null);
  assert.deepEqual(weekdaysOf("SAT,SUN"), ["SAT", "SUN"]);
});

test("পড়ার সময় শনি–বৃহস্পতি: শুক্রবারে কোনো অধ্যায় পড়ে না", () => {
  const wd = ["SAT", "SUN", "MON", "TUE", "WED", "THU"];
  const dates = studyDates("2026-11-12", "2026-11-19", wd);   // বৃহঃ থেকে পরের বৃহঃ এর আগ পর্যন্ত
  assert.ok(!dates.includes("2026-11-13"));                    // শুক্র বাদ
  assert.equal(dates.length, 6);
  const r = buildExamPlan("ফিজিক্স", ["ভেক্টর", "বল", "কাজ", "তরঙ্গ", "আলো"], "2026-11-19", "2026-11-12", 1, wd);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.studyDays, 5);
  assert.ok(r.days.every((d) => dayCodeOf(d.date) !== "FRI"));
  assert.equal(r.days[1].date, "2026-11-14");                  // বৃহঃ এর পরে শুক্র না, শনি
  assert.equal(r.days.at(-1)!.topic, "রিভিশন");
});

test("পড়ার কোনো দিন না পড়লে ভুল জানায়", () => {
  const r = buildExamPlan("x", ["a"], "2026-11-14", "2026-11-13", 0, ["MON"]);   // শুধু শুক্রবার আছে
  assert.equal(r.ok, false);
});

test("পিছিয়ে দেওয়া পরের পড়ার দিনে", () => {
  assert.deepEqual(shiftOnDays(["2026-11-12"], 1, ["SAT", "SUN", "MON", "TUE", "WED", "THU"]), ["2026-11-14"]);   // বৃহঃ → শনি
  assert.deepEqual(shiftOnDays(["2026-11-12"], 1, null), ["2026-11-13"]);
});

const slot = { id: 5, date: null, start_time: "20:00", end_time: "22:00", title: "পড়া", study_slot: 1 };
const ch = (id: number, slotId: number | null, date = "2026-11-12") =>
  ({ id, date, start_time: "20:00", end_time: "22:00", title: `ফিজিক্স: দিন ${id} — অধ্যায় ${id}`, study_slot: 0, slot_id: slotId });

test("অধ্যায় থাকলে সাধারণ পড়ার ব্লক বাদ, অধ্যায়গুলো সেই পড়ার সময়ের নিচে", () => {
  const out = mergeSlots([slot, ch(1, 5), ch(2, 5), { id: 9, date: null, start_time: "07:00", end_time: null, title: "হাঁটা" }], "2026-11-12");
  assert.deepEqual(out.map((b) => b.id), [1, 2, 9]);
  assert.equal(out[0].group?.title, "পড়া");
  assert.equal(out[2].group, undefined);
});

test("অধ্যায় না থাকলে পড়ার সময় যেমন আছে; নিজের সময়ের পরিকল্পনা পড়ার সময় ঢাকে না", () => {
  assert.deepEqual(mergeSlots([slot], "2026-11-12").map((b) => b.id), [5]);
  assert.deepEqual(mergeSlots([slot, ch(1, null)], "2026-11-12").map((b) => b.id), [5, 1]);
  assert.equal(coveredSlots([ch(1, 5, "2026-11-13")], "2026-11-12").size, 0);
});

test("কাজের লিস্ট/Pomodoro: অধ্যায়ের দিনে সাধারণ 'পড়া' কাজ হয় না, অধ্যায়ের নাম আগে", () => {
  const blocks: RBlock[] = [
    { ...slot, days: "daily" },
    { ...ch(1, 5), days: "once" },
  ];
  const ops = planRoutineTodos({ masterId: "m1", today: "2026-11-12", dayCode: "THU", nowBd: "2026-11-12 16:00", blocks, todos: [] });
  assert.equal(ops.length, 1);
  assert.equal(ops[0].args[1], "অধ্যায় 1 (ফিজিক্স) · রাত ৮টা");
  // আগে বানানো "পড়া" কাজ থাকলে সরে যায়
  const ops2 = planRoutineTodos({ masterId: "m1", today: "2026-11-12", dayCode: "THU", nowBd: "2026-11-12 16:00", blocks,
    todos: [{ id: 70, task: "পড়া · রাত ৮টা", due_date: "2026-11-12", status: "open", routine_id: 5, routine_date: "2026-11-12" }] });
  assert.ok(ops2.some((o) => /status = 'deleted'/.test(o.sql) && o.args[1] === 70));
});

test("অধ্যায়ের নাম সাজানো", () => {
  assert.equal(taskName("মেডিসিন: দিন ৩ — Cardiology (২/৩)"), "Cardiology (২/৩) (মেডিসিন)");
  assert.equal(taskName("মেডিসিন: রিভিশন"), "মেডিসিন: রিভিশন");
  assert.equal(routineTitle({ id: 1, days: "daily", date: null, start_time: "20:00", end_time: null, title: "পড়া — ঘরে" }), "পড়া — ঘরে · রাত ৮টা");   // সাপ্তাহিক বদলায় না
});

test("পড়ার সময় শুধু সাপ্তাহিক ব্লকে", () => {
  const w = cleanBlock({ title: "পড়া", kind: "weekly", days: ["SAT"], start_time: "20:00", study_slot: true }, "2026-11-12");
  assert.ok(w.ok && w.value.study_slot === 1);
  const d = cleanBlock({ title: "পড়া", kind: "date", date: "2026-11-12", start_time: "20:00", study_slot: true }, "2026-11-12");
  assert.ok(d.ok && d.value.study_slot === 0);
});
