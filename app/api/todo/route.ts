// To-do বদলানো: পোর্টাল থেকে করলেও বট একই টেবিল দেখে, তাই সাথে সাথে মিলে যায়; Pomodoro যুক্ত থাকলে সেখানেও
import { NextRequest, NextResponse } from "next/server";
import { exec, one } from "@/lib/db";
import { syncMasterQuietly } from "@/lib/pomodoroSync";
import { getMasterId } from "@/lib/session";

const MAX_OPEN = 100;

function bdNow(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" }).slice(0, 16);
}

async function run(mid: string, body: Record<string, unknown>): Promise<NextResponse | null> {
  const action = String(body.action ?? "");
  const id = Number(body.id ?? 0);

  if (action === "add") {
    const task = String(body.task ?? "").trim().slice(0, 300);
    if (!task) return NextResponse.json({ ok: false, error: "কাজটা লেখো" }, { status: 400 });
    const due = /^\d{4}-\d{2}-\d{2}$/.test(String(body.due_date ?? "")) ? String(body.due_date) : null;
    const open = await one<{ n: number }>("SELECT COUNT(*) AS n FROM hermes_todos WHERE master_id = ? AND status = 'open'", [mid]);
    if ((open?.n ?? 0) >= MAX_OPEN) return NextResponse.json({ ok: false, error: `খোলা কাজ ${MAX_OPEN}টার বেশি রাখা যাবে না` }, { status: 400 });
    await exec("INSERT INTO hermes_todos (master_id, task, due_date, priority, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)",
      [mid, task, due, body.priority ? 1 : 0, bdNow()]);
    return null;
  }
  if (action === "complete" && id) {
    await exec("UPDATE hermes_todos SET status = 'done', done_at = ? WHERE id = ? AND master_id = ? AND status = 'open'", [bdNow(), id, mid]);
    return null;
  }
  if (action === "reopen" && id) {
    await exec("UPDATE hermes_todos SET status = 'open', done_at = NULL WHERE id = ? AND master_id = ? AND status = 'done'", [id, mid]);
    return null;
  }
  if (action === "delete" && id) {
    // সাথে সাথে মুছি না: Pomodoro তেও থাকলে sync সেখান থেকে মুছে তারপর সারিটা মোছে
    await exec("UPDATE hermes_todos SET status = 'deleted', done_at = ? WHERE id = ? AND master_id = ? AND status != 'deleted'", [bdNow(), id, mid]);
    return null;
  }
  return NextResponse.json({ ok: false, error: "action হবে add, complete, reopen বা delete" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const mid = await getMasterId();
  if (!mid) return NextResponse.json({ ok: false, error: "লগইন নেই" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const err = await run(mid, body);
  if (err) return err;
  await syncMasterQuietly(mid);
  return NextResponse.json({ ok: true });
}
