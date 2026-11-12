// "আজ" এর তালিকার টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildToday, laterTasks, type PlanTodo } from "../lib/todayPlan.ts";

const t = (o: Partial<PlanTodo>): PlanTodo => ({ id: 1, task: "কাজ", due_date: null, priority: 0, status: "open", done_at: null, routine_id: null, ...o });
const blocks = [{ id: 7, start_time: "20:00", end_time: "22:00", title: "Anatomy", note: null }];

test("আজ: ব্লক টিকসহ, Pomodoro/বটের কাজ সময় ছাড়া অংশে, ব্লকের নিজের কাজ আলাদা না", () => {
  const p = buildToday(blocks, [
    t({ id: 1, task: "Anatomy · রাত ৮টা", routine_id: 7, due_date: "2026-11-12" }),
    t({ id: 2, task: "Anatomy study" }),
    t({ id: 3, task: "বাজার", due_date: "2026-11-15" }),
    t({ id: 4, task: "বই ফেরত", due_date: "2026-11-10", priority: 1 }),
    t({ id: 5, task: "ফর্ম", status: "done", done_at: "2026-11-12 10:00" }),
    t({ id: 6, task: "পুরনো", status: "done", done_at: "2026-11-11 10:00" }),
  ], "2026-11-12", "21:00");
  assert.equal(p.blocks[0].todoId, 1);
  assert.equal(p.blocks[0].live, true);
  assert.deepEqual(p.tasks.map((x) => x.task), ["বই ফেরত", "Anatomy study", "ফর্ম"]);
  assert.equal(p.tasks[0].overdue, true);
  assert.deepEqual([p.done, p.total], [1, 4]);
});

test("সামনের দিনের কাজ তারিখ ধরে, রুটিনের কাজ বাদ", () => {
  const m = laterTasks([t({ id: 3, due_date: "2026-11-15" }), t({ id: 8, routine_id: 7, due_date: "2026-11-15" }), t({ id: 9, due_date: "2026-11-12" })], "2026-11-12");
  assert.deepEqual([...m.keys()], ["2026-11-15"]);
  assert.equal(m.get("2026-11-15")!.length, 1);
});
