// রুটিন → কাজের লিস্ট (pure: শুধু বলে কী লিখতে হবে)।
//
// - তারিখের ব্লক (দিন ১, দিন ২ ...): আজ বা সামনের তারিখ হলে সেই তারিখের একটা কাজ
// - সাপ্তাহিক/প্রতিদিনের ব্লক: শুধু আজকের কাজটা (আগে থেকে বানালে অসীম কাজ জমত); আগের দিনের না-করা কাজ সরে যায়
// - ব্লকের নাম/সময়/তারিখ বদলালে খোলা কাজটাও বদলায়, ব্লক মুছলে খোলা কাজ মোছে (শেষ করাগুলো ইতিহাসে থাকে)
// - কাজ মোছা হয় status 'deleted' দিয়ে, সারি থাকে: (routine_id, routine_date) জোড়া থাকলে আবার বানানো হয় না
import type { DbOp } from "./pomodoroPlan";

export type RBlock = { id: number; days: string; date: string | null; start_time: string; end_time: string | null; title: string };
export type RTodo = { id: number; task: string; due_date: string | null; status: string; routine_id: number; routine_date: string };

const PERIODS: [number, string][] = [[4, "ভোর"], [6, "সকাল"], [12, "দুপুর"], [15, "বিকাল"], [18, "সন্ধ্যা"], [20, "রাত"]];
const BN = "০১২৩৪৫৬৭৮৯";
const bn = (s: string) => s.replace(/\d/g, (d) => BN[Number(d)]);

/** '20:00' → 'রাত ৮টা', '19:30' → 'সন্ধ্যা ৭:৩০' */
export function shortTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const p = h < 4 ? "রাত" : [...PERIODS].reverse().find(([from]) => h >= from)![1];
  return bn(`${p} ${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : "টা"}`);
}

// 📅 রাখি না: Android এ ওটা "JUL 17" লেখা ক্যালেন্ডার হয়ে দেখায়, তারিখ মনে হয়
export const routineTitle = (b: RBlock) => `${b.title} · ${shortTime(b.start_time)}`;

export const appliesOn = (b: RBlock, day: string, dayCode: string) =>
  b.date ? b.date === day : b.days === "daily" || b.days.split(",").includes(dayCode);

export function planRoutineTodos(input: {
  masterId: string; blocks: RBlock[]; todos: RTodo[]; today: string; dayCode: string; nowBd: string; dayOff?: boolean;
}): DbOp[] {
  const { masterId, blocks, todos, today, dayCode, nowBd, dayOff = false } = input;
  const ops: DbOp[] = [];
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const taken = new Set(todos.map((t) => `${t.routine_id}|${t.routine_date}`));
  const drop = (t: RTodo) => ops.push({
    sql: "UPDATE hermes_todos SET status = 'deleted', done_at = ? WHERE id = ? AND master_id = ? AND status = 'open'", args: [nowBd, t.id, masterId] });

  for (const t of todos) {
    if (t.status !== "open") continue;
    const b = byId.get(t.routine_id);
    if (!b) { drop(t); continue; }                       // ব্লকটা মোছা হয়েছে
    const title = routineTitle(b);
    if (b.date) {
      if (t.routine_date === b.date) {
        if (t.task !== title) ops.push({ sql: "UPDATE hermes_todos SET task = ? WHERE id = ? AND master_id = ?", args: [title, t.id, masterId] });
      } else if (b.date >= today && !taken.has(`${b.id}|${b.date}`)) {   // তারিখ বদলেছে: কাজটাও নতুন দিনে
        taken.add(`${b.id}|${b.date}`);
        ops.push({ sql: "UPDATE hermes_todos SET task = ?, due_date = ?, routine_date = ? WHERE id = ? AND master_id = ?",
          args: [title, b.date, b.date, t.id, masterId] });
      } else {
        drop(t);
      }
      continue;
    }
    // সাপ্তাহিক: আগের দিনের না-করা কাজ, বা আজ আর এই ব্লকের দিন না হলে সরাই
    if (t.routine_date < today || (t.routine_date === today && (dayOff || !appliesOn(b, today, dayCode)))) { drop(t); continue; }
    if (t.task !== title) ops.push({ sql: "UPDATE hermes_todos SET task = ? WHERE id = ? AND master_id = ?", args: [title, t.id, masterId] });
  }

  for (const b of blocks) {
    const day = b.date ? (b.date >= today ? b.date : null) : !dayOff && appliesOn(b, today, dayCode) ? today : null;   // ছুটির দিনে সাপ্তাহিক না
    if (!day || taken.has(`${b.id}|${day}`)) continue;
    taken.add(`${b.id}|${day}`);
    ops.push({
      sql: "INSERT OR IGNORE INTO hermes_todos (master_id, task, due_date, priority, status, created_at, routine_id, routine_date) " +
        "VALUES (?, ?, ?, 0, 'open', ?, ?, ?)",
      args: [masterId, routineTitle(b), day, nowBd, b.id, day],
    });
  }
  return ops;
}
