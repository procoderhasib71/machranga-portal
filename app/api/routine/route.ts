// রুটিন বদলানো: পোর্টাল থেকে যোগ/বদল/মোছা। বট একই টেবিল দেখে; কাজের লিস্ট আর Pomodoro sync মিলিয়ে নেয়
import { NextRequest, NextResponse } from "next/server";
import { exec, one, query } from "@/lib/db";
import { todayBD } from "@/lib/bn";
import { DAY_CODES, MAX_BLOCKS, cleanBlock, copyDayPlan, planName } from "@/lib/routineEdit";
import { syncMasterQuietly } from "@/lib/pomodoroSync";
import { getMasterId } from "@/lib/session";

const bdNow = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" }).slice(0, 19);
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
      await exec("INSERT INTO hermes_routine_blocks (master_id, days, date, start_time, end_time, title, note, remind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [mid, b.days, b.date, b.start_time, b.end_time, b.title, b.note, b.remind, bdNow()]);
      return null;
    }
    if (!id) return fail("কোন ব্লক?");
    const n = await exec("UPDATE hermes_routine_blocks SET days = ?, date = ?, start_time = ?, end_time = ?, title = ?, note = ?, remind = ? WHERE id = ? AND master_id = ?",
      [b.days, b.date, b.start_time, b.end_time, b.title, b.note, b.remind, id, mid]);
    return n ? null : fail("ব্লকটা পাওয়া যায়নি", 404);
  }
  if (action === "delete" && id) {
    await exec("DELETE FROM hermes_routine_blocks WHERE id = ? AND master_id = ?", [id, mid]);
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
  return fail("action হবে add, update, delete, delete_plan বা copy_day");
}

export async function POST(req: NextRequest) {
  const mid = await getMasterId();
  if (!mid) return fail("লগইন নেই", 401);
  const body = await req.json().catch(() => ({}));
  const err = await run(mid, body);
  if (err) return err;
  await syncMasterQuietly(mid);   // কাজের লিস্ট আর Pomodoro সাথে সাথে মিলে যায়
  return NextResponse.json({ ok: true });
}
