// Pomodoro ↔ to-do মেলানোর নিয়মের টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { listFor, plan, type PlanInput, type PomoTask, type TodoRow } from "../lib/pomodoroPlan.ts";

const base: Omit<PlanInput, "todos" | "tasks"> = {
  masterId: "m1", docExists: true, blocks: [], today: "2026-11-12", dayCode: "THU",
  nowIso: "2026-11-12T10:00:00.000Z", nowBd: "2026-11-12 16:00",
};
const todo = (o: Partial<TodoRow>): TodoRow => ({ id: 1, task: "বাজার করা", due_date: null, priority: 0, status: "open", pomo_id: null, pomo_done: 0, ...o });
const task = (o: Partial<PomoTask>): PomoTask => ({ id: "p1", title: "বাজার করা", completed: false, ...o });
const sqls = (ops: { sql: string }[]) => ops.map((o) => o.sql.split(" ").slice(0, 2).join(" "));

test("নতুন খোলা to-do Pomodoro তে যায় আর লিংক হয়", () => {
  const p = plan({ ...base, todos: [todo({ id: 7, priority: 1, due_date: "2026-11-13" })], tasks: [] });
  assert.equal(p.tasks.length, 1);
  assert.equal(p.tasks[0].id, "hermes-7");
  assert.equal(p.tasks[0].list, "Planned");
  assert.equal(p.tasks[0].dueDate, "Tomorrow");
  assert.equal(p.tasks[0].priority, 3);
  assert.ok(p.tasksChanged);
  assert.deepEqual(p.ops[0].args, ["hermes-7", 7, "m1"]);
});

test("আগের রানে Firestore এ গিয়েছিল কিন্তু লিংক সেভ হয়নি: দ্বিতীয় টাস্ক বানায় না", () => {
  const p = plan({ ...base, todos: [todo({ id: 7 })], tasks: [task({ id: "hermes-7" })] });
  assert.equal(p.tasks.length, 1);
  assert.equal(p.tasksChanged, false);
  assert.ok(p.ops[0].sql.startsWith("UPDATE hermes_todos SET pomo_id"));
});

test("পুরনো শেষ করা to-do পাঠায় না", () => {
  const p = plan({ ...base, todos: [todo({ status: "done" })], tasks: [] });
  assert.equal(p.tasks.length, 0);
  assert.equal(p.ops.length, 0);
});

test("Pomodoro র নতুন খোলা টাস্ক to-do তে আসে, শেষ করা আর রুটিনেরটা আসে না", () => {
  const p = plan({ ...base, todos: [], tasks: [
    task({ id: "a", title: "ফিজিক্স পড়া", dueDate: "Today", list: "Today", priority: 2 }),
    task({ id: "b", completed: true }),
    task({ id: "routine-3-20261112", title: "📅 রুটিন" }),
  ] });
  assert.equal(p.ops.length, 1);
  assert.match(p.ops[0].sql, /^INSERT INTO hermes_todos/);
  assert.deepEqual(p.ops[0].args, ["m1", "ফিজিক্স পড়া", "2026-11-12", 1, "2026-11-12 16:00", "a"]);
});

test("Pomodoro তে শেষ করলে to-do ও শেষ হয়", () => {
  const p = plan({ ...base, todos: [todo({ pomo_id: "p1", pomo_done: 0 })], tasks: [task({ completed: true })] });
  assert.deepEqual(sqls(p.ops), ["UPDATE hermes_todos", "UPDATE hermes_todos"]);
  assert.match(p.ops[0].sql, /status = 'done'/);
  assert.match(p.ops[1].sql, /pomo_done = \?/);
  assert.equal(p.ops[1].args[0], 1);
  assert.equal(p.tasksChanged, false);
});

test("বট/পোর্টালে শেষ করলে Pomodoro তেও শেষ হয়", () => {
  const p = plan({ ...base, todos: [todo({ pomo_id: "p1", pomo_done: 0, status: "done" })], tasks: [task({})] });
  assert.equal(p.tasks[0].completed, true);
  assert.equal(p.tasks[0].completedAt, base.nowIso);
  assert.ok(p.tasksChanged);
  assert.equal(p.ops.at(-1)!.args[0], 1);   // pomo_done = 1
});

test("বট/পোর্টালে আবার খুললে Pomodoro তেও খোলে", () => {
  const p = plan({ ...base, todos: [todo({ pomo_id: "p1", pomo_done: 1, status: "open" })], tasks: [task({ completed: true })] });
  assert.equal(p.tasks[0].completed, false);
  assert.equal(p.ops.at(-1)!.args[0], 0);
});

test("বারবারের টাস্ক Pomodoro নিজে আবার খুললে to-do ও খোলে (বট আবার বন্ধ করে না)", () => {
  const p = plan({ ...base, todos: [todo({ pomo_id: "p1", pomo_done: 1, status: "done" })], tasks: [task({ repeat: "daily", completed: false })] });
  assert.equal(p.tasks[0].completed, false);
  assert.match(p.ops[0].sql, /status = 'open'/);
});

test("কিছু না বদলালে কোনো লেখা নেই", () => {
  const p = plan({ ...base, todos: [todo({ pomo_id: "p1", pomo_done: 0 })], tasks: [task({})] });
  assert.equal(p.tasksChanged, false);
  assert.equal(p.ops.length, 0);
  assert.equal(p.changed, 0);
});

test("Pomodoro তে নাম বদলালে to-do র নামও বদলায়", () => {
  const p = plan({ ...base, todos: [todo({ pomo_id: "p1" })], tasks: [task({ title: "বাজার করা (মাছ)" })] });
  assert.deepEqual(p.ops[0].args, ["বাজার করা (মাছ)", 1, "m1"]);
});

test("to-do তে মুছলে Pomodoro থেকেও যায়, আর সারি মোছে", () => {
  const p = plan({ ...base, todos: [todo({ pomo_id: "p1", status: "deleted" })], tasks: [task({}), task({ id: "x", title: "অন্য" })] });
  assert.deepEqual(p.tasks.map((t) => t.id), ["x"]);
  assert.match(p.ops[0].sql, /^DELETE FROM hermes_todos/);
});

test("Pomodoro তে মুছলে to-do ও মোছে; কিন্তু doc ই না থাকলে মোছে না, আবার বানায়", () => {
  const gone = plan({ ...base, todos: [todo({ pomo_id: "p1" })], tasks: [] });
  assert.match(gone.ops[0].sql, /^DELETE FROM hermes_todos/);
  const noDoc = plan({ ...base, docExists: false, todos: [todo({ pomo_id: "p1" })], tasks: [] });
  assert.equal(noDoc.ops.length, 0);
  assert.equal(noDoc.tasks[0].id, "p1");
});

test("আজকের রুটিন ব্লক টাস্ক হয়; অন্য দিনের আর পুরনো দিনেরগুলো সরে যায়", () => {
  const p = plan({ ...base, todos: [],
    blocks: [
      { id: 3, days: "daily", start_time: "20:00", end_time: "22:00", title: "ফিজিক্স" },
      { id: 4, days: "SAT", start_time: "16:00", end_time: null, title: "কেমিস্ট্রি" },
    ],
    tasks: [task({ id: "routine-3-20261111", title: "📅 ফিজিক্স", completed: true }), task({ id: "routine-9-20261112", title: "📅 বাদ পড়া ব্লক" })],
  });
  assert.deepEqual(p.tasks.map((t) => t.id), ["routine-3-20261112"]);
  assert.equal(p.tasks[0].title, "📅 ফিজিক্স");
  assert.equal(p.tasks[0].estimatedPomodoros, 5);
  assert.equal(p.ops.length, 0);   // রুটিন to-do তে আসে না
});

test("listFor: তারিখ অনুযায়ী Pomodoro র তালিকা", () => {
  assert.deepEqual(listFor(null, "2026-11-12"), { list: "Today", dueDate: null });
  assert.deepEqual(listFor("2026-11-10", "2026-11-12"), { list: "Today", dueDate: "Today" });
  assert.deepEqual(listFor("2026-11-15", "2026-11-12"), { list: "This Week", dueDate: "This Week" });
  assert.deepEqual(listFor("2026-12-01", "2026-11-12"), { list: "Planned", dueDate: "Planned" });
});
