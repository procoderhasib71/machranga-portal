// রুটিন → কাজের লিস্টের নিয়মের টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { planRoutineTodos, routineTitle, shortTime, type RBlock, type RTodo } from "../lib/routineTodos.ts";

const base = { masterId: "m1", today: "2026-11-12", dayCode: "THU", nowBd: "2026-11-12 16:00" };
const block = (o: Partial<RBlock>): RBlock => ({ id: 1, days: "daily", date: null, start_time: "20:00", end_time: "22:00", title: "ফিজিক্স", ...o });
const rtodo = (o: Partial<RTodo>): RTodo => ({ id: 50, task: "ফিজিক্স · রাত ৮টা", due_date: "2026-11-12", status: "open", routine_id: 1, routine_date: "2026-11-12", ...o });
const kinds = (ops: { sql: string }[]) => ops.map((o) => (o.sql.startsWith("INSERT") ? "insert" : /status = 'deleted'/.test(o.sql) ? "drop" : "update"));

test("সময়ের লেখা", () => {
  assert.equal(shortTime("20:00"), "রাত ৮টা");
  assert.equal(shortTime("19:30"), "সন্ধ্যা ৭:৩০");
  assert.equal(shortTime("06:00"), "সকাল ৬টা");
  assert.equal(shortTime("01:00"), "রাত ১টা");
  assert.equal(routineTitle(block({})), "ফিজিক্স · রাত ৮টা");
});

test("১০ দিনের পরিকল্পনা: আজ আর সামনের প্রতিটা দিন নিজের তারিখের কাজ, পেরোনো দিন না", () => {
  const blocks = Array.from({ length: 4 }, (_, i) => block({ id: 10 + i, days: "once", date: `2026-11-${11 + i}`, title: `দিন ${i + 1}` }));
  const ops = planRoutineTodos({ ...base, blocks, todos: [] });
  assert.deepEqual(ops.map((o) => o.args[2]), ["2026-11-12", "2026-11-13", "2026-11-14"]);
  assert.equal(ops[0].args[1], "দিন 2 · রাত ৮টা");
});

test("সাপ্তাহিক ব্লক: শুধু আজকের দিন হলে আজকের কাজ", () => {
  const ops = planRoutineTodos({ ...base, todos: [], blocks: [block({ id: 1, days: "daily" }), block({ id: 2, days: "SAT,SUN" }), block({ id: 3, days: "THU" })] });
  assert.deepEqual(ops.map((o) => o.args[4]), [1, 3]);
});

test("আগে থেকেই আছে (মুছে ফেলা হলেও) তাহলে আবার বানায় না", () => {
  assert.equal(planRoutineTodos({ ...base, blocks: [block({})], todos: [rtodo({})] }).length, 0);
  assert.equal(planRoutineTodos({ ...base, blocks: [block({})], todos: [rtodo({ status: "deleted" })] }).length, 0);
  assert.equal(planRoutineTodos({ ...base, blocks: [block({})], todos: [rtodo({ status: "done" })] }).length, 0);
});

test("ব্লকের নাম বা সময় বদলালে খোলা কাজের নামও বদলায়", () => {
  const ops = planRoutineTodos({ ...base, blocks: [block({ title: "কেমিস্ট্রি", start_time: "21:00" })], todos: [rtodo({})] });
  assert.deepEqual(kinds(ops), ["update"]);
  assert.equal(ops[0].args[0], "কেমিস্ট্রি · রাত ৯টা");
});

test("তারিখের ব্লক অন্য দিনে সরালে কাজটাও সরে যায়, নতুন বানায় না", () => {
  const ops = planRoutineTodos({ ...base, blocks: [block({ days: "once", date: "2026-11-15" })], todos: [rtodo({})] });
  assert.deepEqual(kinds(ops), ["update"]);
  assert.deepEqual(ops[0].args.slice(1, 3), ["2026-11-15", "2026-11-15"]);
});

test("ব্লক মুছলে খোলা কাজ সরে যায়, শেষ করাটা থাকে", () => {
  const ops = planRoutineTodos({ ...base, blocks: [], todos: [rtodo({}), rtodo({ id: 51, status: "done" })] });
  assert.deepEqual(kinds(ops), ["drop"]);
  assert.equal(ops[0].args[1], 50);
});

test("সাপ্তাহিক ব্লকের আগের দিনের না-করা কাজ সরে, আজকেরটা আসে; দিন বদলালে আজকেরটাও সরে", () => {
  const ops = planRoutineTodos({ ...base, blocks: [block({})], todos: [rtodo({ routine_date: "2026-11-11", due_date: "2026-11-11" })] });
  assert.deepEqual(kinds(ops), ["drop", "insert"]);
  const off = planRoutineTodos({ ...base, blocks: [block({ days: "SAT" })], todos: [rtodo({})] });
  assert.deepEqual(kinds(off), ["drop"]);
});

test("তারিখের পরিকল্পনার পেরোনো দিনের না-করা কাজ থেকে যায় (পরে করে নেওয়ার জন্য)", () => {
  const ops = planRoutineTodos({ ...base, blocks: [block({ days: "once", date: "2026-11-11" })], todos: [rtodo({ routine_date: "2026-11-11", due_date: "2026-11-11" })] });
  assert.equal(ops.length, 0);
});

test("ছুটির দিনে সাপ্তাহিক ব্লকের আজকের কাজ হয় না (থাকলে সরে যায়), তারিখের পরিকল্পনা থাকে", () => {
  const blocks = [block({ id: 1, days: "daily" }), block({ id: 2, days: "once", date: "2026-11-12", title: "দিন ১" })];
  const ops = planRoutineTodos({ ...base, dayOff: true, blocks, todos: [rtodo({ id: 50, routine_id: 1 })] });
  assert.deepEqual(kinds(ops), ["drop", "insert"]);
  assert.equal(ops[1].args[4], 2);
});
