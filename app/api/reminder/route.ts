// পোর্টাল থেকে রিমাইন্ডার রাখা/বদলানো/বাদ: বটের একই টেবিল, তাই বট নিজের সময়ে পাঠায় (যুক্ত সব অ্যাকাউন্টে)
import { NextRequest, NextResponse } from "next/server";
import { exec, one } from "@/lib/db";
import { MAX_PENDING, cleanReminder } from "@/lib/reminderEdit";
import { getMasterId } from "@/lib/session";

const bdNow = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" }).slice(0, 16);
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  const mid = await getMasterId();
  if (!mid) return fail("লগইন নেই", 401);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const id = Number(body.id ?? 0);

  if (action === "delete" && id) {
    await exec("UPDATE hermes_reminders SET status = 'cancelled' WHERE id = ? AND master_id = ? AND status = 'pending'", [id, mid]);
    return NextResponse.json({ ok: true });
  }
  if (action !== "add" && action !== "update") return fail("action হবে add, update বা delete");

  const c = cleanReminder(body, bdNow());
  if (!c.ok) return fail(c.error);
  const r = c.value;
  if (action === "add") {
    const n = await one<{ n: number }>("SELECT COUNT(*) AS n FROM hermes_reminders WHERE master_id = ? AND status = 'pending'", [mid]);
    if ((n?.n ?? 0) >= MAX_PENDING) return fail(`চালু রিমাইন্ডার ${MAX_PENDING}টার বেশি রাখা যাবে না`);
    await exec("INSERT INTO hermes_reminders (master_id, platform, channel_id, task, trigger_time, repeat_rule, status, created_at, style) " +
      "VALUES (?, NULL, NULL, ?, ?, ?, 'pending', ?, '')", [mid, r.task, r.trigger_time, r.rule, `${bdNow()}:00`]);
  } else {
    if (!id) return fail("কোন রিমাইন্ডার?");
    const n = await exec("UPDATE hermes_reminders SET task = ?, trigger_time = ?, repeat_rule = ? WHERE id = ? AND master_id = ? AND status = 'pending'",
      [r.task, r.trigger_time, r.rule, id, mid]);
    if (!n) return fail("রিমাইন্ডারটা পাওয়া যায়নি", 404);
  }
  return NextResponse.json({ ok: true, trigger_time: r.trigger_time });
}
