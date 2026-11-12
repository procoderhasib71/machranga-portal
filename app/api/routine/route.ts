// রুটিন বদলানো: পোর্টাল থেকে যোগ/বদল/মোছা। বট একই টেবিল দেখে; কাজের লিস্ট আর Pomodoro sync মিলিয়ে নেয়
import { NextRequest, NextResponse } from "next/server";
import { exec, one, query } from "@/lib/db";
import { todayBD } from "@/lib/bn";
import { DAY_CODES, MAX_BLOCKS, cleanBlock, copyDayPlan, planName } from "@/lib/routineEdit";
import { syncForRequest } from "@/lib/pomodoroSync";
import { getMasterId } from "@/lib/session";
import { TEMPLATES, templateRows } from "@/lib/templates";
import { buildExamPlan } from "@/lib/examPlan";
import { topicOf } from "@/lib/plans";

const bdNow = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" }).slice(0, 19);
// ছুটি বাতিল হলে সেদিনের সাপ্তাহিক ব্লকের সরানো কাজ আবার খোলা (নইলে sync ভাবে ইউজার মুছেছে, আর বানায় না)
const REVIVE_SQL = "UPDATE hermes_todos SET status = 'open', done_at = NULL WHERE master_id = ? AND routine_date = ? AND status = 'deleted' " +
  "AND routine_id IN (SELECT id FROM hermes_routine_blocks WHERE master_id = ? AND date IS NULL)";
// পরিকল্পনা: এই নামের চালু plan থাকলে তার id, নইলে নতুন (বটের routine.ensure_plan এর মতো)
async function ensurePlan(mid: string, name: string, f: { book?: string | null; exam_date?: string | null; start_time?: string | null; end_time?: string | null } = {}) {
  const row = await one<{ id: number }>("SELECT id FROM hermes_plans WHERE master_id = ? AND name = ? AND (end_date IS NULL OR end_date >= ?) ORDER BY id DESC LIMIT 1",
    [mid, name, todayBD()]);
  if (row) return row.id;
  await exec("INSERT INTO hermes_plans (master_id, name, book, exam_date, start_time, end_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [mid, name, f.book ?? null, f.exam_date ?? null, f.start_time ?? null, f.end_time ?? null, bdNow()]);
  return (await one<{ id: number }>("SELECT MAX(id) AS id FROM hermes_plans WHERE master_id = ?", [mid]))!.id;
}
const refreshPlanDates = (mid: string) => exec(
  "UPDATE hermes_plans SET start_date = (SELECT MIN(date) FROM hermes_routine_blocks b WHERE b.plan_id = hermes_plans.id), " +
  "end_date = (SELECT MAX(date) FROM hermes_routine_blocks b WHERE b.plan_id = hermes_plans.id) WHERE master_id = ?", [mid]);

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

async function run(mid: string, body: Record<string, unknown>): Promise<NextResponse | null> {
  const action = String(body.action ?? "");
  const id = Number(body.id ?? 0);

  if (action === "add" || action === "update") {
    const c = cleanBlock(body, todayBD());
    if (!c.ok) return fail(c.error);
    const b = c.value;
    if (action === "add") {
      const n = await one<{ n: number }>("SELECT COUNT(*) AS n FROM hermes_routine_blocks WHERE master_id = ?", [mid]);
      if ((n?.n ?? 0) >= MAX_BLOCKS) return fail(`রুটিনে ${MAX_BLOCKS}টার বেশি ব্লক রাখা যাবে না`);
      const planId = body.plan_id ? Number(body.plan_id) : b.date && b.title.includes(":") ? await ensurePlan(mid, planName(b.title)) : null;
      await exec("INSERT INTO hermes_routine_blocks (master_id, days, date, start_time, end_time, title, note, remind, focus, plan_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [mid, b.days, b.date, b.start_time, b.end_time, b.title, b.note, b.remind, b.focus, planId, bdNow()]);
      if (planId) await refreshPlanDates(mid);
      return null;
    }
    if (!id) return fail("কোন ব্লক?");
    const n = await exec("UPDATE hermes_routine_blocks SET days = ?, date = ?, start_time = ?, end_time = ?, title = ?, note = ?, remind = ?, focus = ? WHERE id = ? AND master_id = ?",
      [b.days, b.date, b.start_time, b.end_time, b.title, b.note, b.remind, b.focus, id, mid]);
    if (!n) return fail("ব্লকটা পাওয়া যায়নি", 404);
    if (b.date) await refreshPlanDates(mid);
    return null;
  }
  if (action === "delete" && id) {
    await exec("DELETE FROM hermes_routine_blocks WHERE id = ? AND master_id = ?", [id, mid]);
    return null;
  }
  if (action === "delete_plan" && body.plan_id) {
    // পুরো পরিকল্পনা: তার সব দিন আর plan নিজে
    const pid = Number(body.plan_id);
    await exec("DELETE FROM hermes_routine_blocks WHERE master_id = ? AND plan_id = ?", [mid, pid]);
    await exec("DELETE FROM hermes_plans WHERE master_id = ? AND id = ?", [mid, pid]);
    return null;
  }
  if (action === "shift_plan") {
    // আজ থেকে বাকি সব দিন N দিন পেছানো (যেমন আজ পড়তে পারিনি)
    const pid = Number(body.plan_id ?? 0);
    const n = Math.max(1, Math.min(Number(body.days) || 1, 30));
    if (!pid) return fail("কোন পরিকল্পনা?");
    await exec("UPDATE hermes_routine_blocks SET date = date(date, ?) WHERE master_id = ? AND plan_id = ? AND date >= ?", [`+${n} days`, mid, pid, todayBD()]);
    await refreshPlanDates(mid);
    return null;
  }
  if (action === "swap_days") {
    // দুই দিনের অধ্যায় অদলবদল ("দিন N" নম্বর ঠিক থাকে, শুধু অধ্যায়)
    const [a, b2] = [Number(body.a ?? 0), Number(body.b ?? 0)];
    const rows = await query<{ id: number; title: string }>("SELECT id, title FROM hermes_routine_blocks WHERE master_id = ? AND id IN (?, ?)", [mid, a, b2]);
    if (rows.length !== 2) return fail("দিন দুটো পাওয়া যায়নি", 404);
    const retitle = (title: string, topic: string) => (title.includes(" — ") ? `${title.slice(0, title.indexOf(" — "))} — ${topic}` : topic);
    const [ra, rb] = [rows.find((r) => r.id === a)!, rows.find((r) => r.id === b2)!];
    await exec("UPDATE hermes_routine_blocks SET title = ? WHERE id = ? AND master_id = ?", [retitle(ra.title, topicOf(rb.title)), a, mid]);
    await exec("UPDATE hermes_routine_blocks SET title = ? WHERE id = ? AND master_id = ?", [retitle(rb.title, topicOf(ra.title)), b2, mid]);
    return null;
  }
  if (action === "create_plan") {
    // আগে plan, তার অধীনে দিন ধরে পড়ার ব্লক (বটের make_exam_plan এর মতো)
    const name = String(body.name ?? "").trim().slice(0, 80);
    const topics = String(body.topics ?? "").split(/\n|,|;/);
    const start = String(body.start_date ?? ""), exam = String(body.exam_date ?? "");
    const st = String(body.start_time ?? ""), et = String(body.end_time ?? "") || null;
    if (!name) return fail("পরিকল্পনার নাম দাও");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(st)) return fail("পড়ার সময় দাও");
    if (start < todayBD()) return fail("শুরুর তারিখ পেরিয়ে গেছে");
    const r = buildExamPlan(name, topics, exam, start, Number(body.revision_days ?? 1));
    if (!r.ok) return fail(r.error);
    const total = await one<{ n: number }>("SELECT COUNT(*) AS n FROM hermes_routine_blocks WHERE master_id = ?", [mid]);
    if ((total?.n ?? 0) + r.days.length > MAX_BLOCKS) return fail(`রুটিনে ${MAX_BLOCKS}টার বেশি ব্লক রাখা যাবে না; পুরনো কিছু পরিকল্পনা মুছে নাও`);
    await exec("INSERT INTO hermes_plans (master_id, name, book, exam_date, start_time, end_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [mid, name, String(body.book ?? "") || null, body.is_exam ? exam : null, st, et, bdNow()]);   // "কত দিনে" হলে পরীক্ষার তারিখ নেই
    const pid = (await one<{ id: number }>("SELECT MAX(id) AS id FROM hermes_plans WHERE master_id = ?", [mid]))!.id;
    for (const d of r.days) {
      await exec("INSERT INTO hermes_routine_blocks (master_id, days, date, start_time, end_time, title, note, remind, focus, plan_id, created_at) VALUES (?, 'once', ?, ?, ?, ?, NULL, 1, NULL, ?, ?)",
        [mid, d.date, st, et, d.title, pid, bdNow()]);
    }
    await refreshPlanDates(mid);
    return null;
  }
  if (action === "delete_plan") {
    // একই নামের পরিকল্পনার আজ আর সামনের দিনের ব্লক (পেরোনোগুলো ইতিহাসে থাকে)
    const name = String(body.plan ?? "").trim();
    if (!name) return fail("কোন পরিকল্পনা?");
    const rows = await query<{ id: number; title: string }>(
      "SELECT id, title FROM hermes_routine_blocks WHERE master_id = ? AND date IS NOT NULL AND date >= ?", [mid, todayBD()]);
    const ids = rows.filter((r) => planName(r.title) === name).map((r) => r.id);
    if (!ids.length) return fail("পরিকল্পনাটা পাওয়া যায়নি", 404);
    await exec(`DELETE FROM hermes_routine_blocks WHERE master_id = ? AND id IN (${ids.map(() => "?").join(",")})`, [mid, ...ids]);
    return null;
  }
  if (action === "copy_day") {
    const from = String(body.from ?? "");
    const to = Array.isArray(body.to) ? body.to.map(String) : [];
    if (!DAY_CODES.includes(from) || !to.length) return fail("কোন বার থেকে কোন বারে, বেছে নাও");
    const blocks = await query<{ id: number; days: string; title: string; start_time: string }>(
      "SELECT id, days, title, start_time FROM hermes_routine_blocks WHERE master_id = ? AND date IS NULL", [mid]);
    const changes = copyDayPlan(blocks, from, to);
    for (const c of changes) await exec("UPDATE hermes_routine_blocks SET days = ? WHERE id = ? AND master_id = ?", [c.days, c.id, mid]);
    return null;
  }
  if (action === "apply_template") {
    // replace: আগের সাপ্তাহিক রুটিন সরিয়ে টেমপ্লেট; add: পাশে যোগ (একই ব্লক আবার না)। তারিখের পড়ার পরিকল্পনা ছোঁয় না।
    const t = TEMPLATES.find((x) => x.id === String(body.id ?? ""));
    if (!t) return fail("টেমপ্লেটটা পাওয়া যায়নি", 404);
    const mode = body.mode === "replace" ? "replace" : "add";
    const existing = await query<{ days: string; start_time: string; title: string }>(
      "SELECT days, start_time, title FROM hermes_routine_blocks WHERE master_id = ? AND date IS NULL", [mid]);
    const rows = templateRows(t, existing, mode);
    const total = await one<{ n: number }>("SELECT COUNT(*) AS n FROM hermes_routine_blocks WHERE master_id = ?", [mid]);
    const after = (total?.n ?? 0) - (mode === "replace" ? existing.length : 0) + rows.length;
    if (after > MAX_BLOCKS) return fail(`রুটিনে ${MAX_BLOCKS}টার বেশি ব্লক রাখা যাবে না`);
    if (mode === "replace") await exec("DELETE FROM hermes_routine_blocks WHERE master_id = ? AND date IS NULL", [mid]);
    for (const b of rows) {
      await exec("INSERT INTO hermes_routine_blocks (master_id, days, date, start_time, end_time, title, note, remind, focus, created_at) VALUES (?, ?, NULL, ?, ?, ?, NULL, 1, ?, ?)",
        [mid, b.days, b.start, b.end ?? null, b.title, b.focus === undefined ? null : b.focus ? 1 : 0, bdNow()]);
    }
    return null;
  }
  if (action === "day_off") {
    // "আজ ছুটি" (বা সামনের কোনো দিন): সাপ্তাহিক রুটিন সেদিন বন্ধ, off=false দিলে আবার চালু
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date ?? "")) ? String(body.date) : todayBD();
    if (date < todayBD()) return fail("পেরোনো দিনে ছুটি দেওয়া যায় না");
    if (body.off === false) {
      await exec("DELETE FROM hermes_day_off WHERE master_id = ? AND date = ?", [mid, date]);
      await exec(REVIVE_SQL, [mid, date, mid]);
    }
    else await exec("INSERT OR IGNORE INTO hermes_day_off (master_id, date, created_at) VALUES (?, ?, ?)", [mid, date, bdNow()]);
    return null;
  }
  return fail("action হবে add, update, delete, delete_plan, shift_plan, swap_days, create_plan, copy_day, day_off বা apply_template");
}

export async function POST(req: NextRequest) {
  const mid = await getMasterId();
  if (!mid) return fail("লগইন নেই", 401);
  const body = await req.json().catch(() => ({}));
  const err = await run(mid, body);
  if (err) return err;
  await syncForRequest(mid);   // রুটিন → কাজ এখনই, Pomodoro উত্তর পাঠানোর পরে
  return NextResponse.json({ ok: true });
}
