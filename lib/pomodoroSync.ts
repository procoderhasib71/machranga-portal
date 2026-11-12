// Pomodoro ↔ to-do sync এর আসল কাজ: Firestore (Pomodoro র টাস্ক) আর Turso (to-do, রুটিন) পড়ে-লেখা।
// নিয়ম lib/pomodoroPlan.ts এ। পোর্টাল App Hosting এ একই Firebase project এ চলে, তাই আলাদা key লাগে না।
import { createHash, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "./firebaseAdmin";
import { db, query } from "./db";
import { DAY_ORDER } from "./bn";
import { plan, type BlockRow, type PomoTask, type TodoRow } from "./pomodoroPlan";
import { planRoutineTodos, type RBlock, type RTodo } from "./routineTodos";

const firestore = () => getFirestore(adminApp);

/** বটের scheduler এর চাবি: TURSO_AUTH_TOKEN থেকে বানানো hash (বট আর পোর্টাল দুজনের কাছেই আছে) */
export function validSyncToken(header: string | null): boolean {
  const secret = process.env.TURSO_AUTH_TOKEN;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const want = Buffer.from(createHash("sha256").update(`pomodoro-sync:${secret}`).digest("hex"));
  const got = Buffer.from(header.slice(7));
  return want.length === got.length && timingSafeEqual(want, got);
}

function bdNow() {
  const stamp = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" });   // 'YYYY-MM-DD HH:MM:SS'
  const local = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  return { today: stamp.slice(0, 10), nowBd: stamp.slice(0, 16), dayCode: DAY_ORDER[(local.getDay() + 1) % 7] };
}

/** রুটিনের ব্লক থেকে কাজের লিস্টে কাজ বানানো/মেলানো (Pomodoro যুক্ত থাকুক বা না থাকুক); ফেরত দেয় কয়টা লেখা হলো */
export async function syncRoutineTodos(masterId: string): Promise<number> {
  const { today, nowBd, dayCode } = bdNow();
  const [blocks, todos, off] = await Promise.all([
    query<RBlock>("SELECT id, days, date, start_time, end_time, title FROM hermes_routine_blocks WHERE master_id = ?", [masterId]),
    query<RTodo>(
      "SELECT id, task, due_date, status, routine_id, routine_date FROM hermes_todos " +
      "WHERE master_id = ? AND routine_id IS NOT NULL AND (status = 'open' OR routine_date >= ?)", [masterId, today]),
    query("SELECT 1 AS x FROM hermes_day_off WHERE master_id = ? AND date = ?", [masterId, today]),
  ]);
  const ops = planRoutineTodos({ masterId, blocks, todos, today, dayCode, nowBd, dayOff: off.length > 0 });
  if (ops.length) await db().batch(ops, "write");
  return ops.length;
}

/** একজন ইউজারের sync; ফেরত দেয় কয়টা বদল হলো */
export async function syncUser(masterId: string, uid: string): Promise<number> {
  await syncRoutineTodos(masterId);
  const [todos, blocks] = await Promise.all([
    query<TodoRow>(
      "SELECT id, task, due_date, priority, status, pomo_id, pomo_done, routine_id, routine_date FROM hermes_todos " +
      "WHERE master_id = ? AND (status IN ('open', 'deleted') OR pomo_id IS NOT NULL) ORDER BY id", [masterId]),
    query<BlockRow>("SELECT id, days, date, start_time, end_time, title, focus FROM hermes_routine_blocks WHERE master_id = ? ORDER BY start_time, id", [masterId]),
  ]);
  const { today, nowBd, dayCode } = bdNow();
  const ref = firestore().doc(`users/${uid}/taskData/allTasks`);

  const result = await firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const tasks = (snap.exists ? (snap.data()?.tasks as PomoTask[] | undefined) : undefined) ?? [];
    const p = plan({ masterId, todos, tasks, docExists: snap.exists, blocks, today, dayCode, nowIso: new Date().toISOString(), nowBd });
    if (p.tasksChanged) tx.set(ref, { tasks: JSON.parse(JSON.stringify(p.tasks)) }, { merge: true });
    return p;
  });
  if (result.ops.length) await db().batch(result.ops, "write");
  return result.changed;
}

/** Pomodoro বটে যুক্ত সবাই, আর রুটিন আছে এমন বাকিদের শুধু রুটিন → কাজ */
export async function syncAll(): Promise<{ users: number; changed: number; errors: string[] }> {
  const [links, routineUsers] = await Promise.all([
    query<{ master_id: string; site_uid: string }>("SELECT master_id, site_uid FROM hermes_site_links WHERE site = 'pomodoro'"),
    query<{ master_id: string }>(   // ব্লক সব মুছে ফেললেও খোলা রুটিন-কাজ সরাতে হবে
      "SELECT master_id FROM hermes_routine_blocks UNION SELECT master_id FROM hermes_todos WHERE routine_id IS NOT NULL AND status = 'open'"),
  ]);
  const linked = new Set(links.map((l) => l.master_id));
  let changed = 0;
  const errors: string[] = [];
  const attempt = async (mid: string, work: () => Promise<number>) => {
    try {
      changed += await work();
    } catch (e) {
      console.error("sync ব্যর্থ:", mid, e);
      errors.push(e instanceof Error ? e.message.slice(0, 160) : "failed");
    }
  };
  for (const l of links) await attempt(l.master_id, () => syncUser(l.master_id, l.site_uid));
  for (const u of routineUsers) if (!linked.has(u.master_id)) await attempt(u.master_id, () => syncRoutineTodos(u.master_id));
  return { users: links.length, changed, errors };
}

/** পোর্টালে কিছু বদলালে সাথে সাথে: রুটিন → কাজ, আর Pomodoro যুক্ত থাকলে সেটাও (ব্যর্থ হলেও পোর্টালের কাজ আটকায় না) */
export async function syncMasterQuietly(masterId: string): Promise<void> {
  try {
    const rows = await query<{ site_uid: string }>(
      "SELECT site_uid FROM hermes_site_links WHERE master_id = ? AND site = 'pomodoro'", [masterId]);
    if (rows[0]) await syncUser(masterId, rows[0].site_uid);
    else await syncRoutineTodos(masterId);
  } catch (e) {
    console.error("Pomodoro sync (পোর্টাল থেকে) ব্যর্থ:", e);
  }
}

/** পেজ খোলা বা পোর্টালে বদলের সময়: রুটিন → কাজ (শুধু Turso, দ্রুত) এখনই, যাতে নতুন ব্লকের টিক সাথে সাথে চলে;
 *  Pomodoro (Firestore, ধীর) উত্তর পাঠানোর পরে। scheduler প্রতি মিনিটে পুরো sync করেই, তাই দেরিতেও মিলে যায়। */
export async function syncForRequest(masterId: string): Promise<void> {
  try {
    await syncRoutineTodos(masterId);
  } catch (e) {
    console.error("রুটিন → কাজ sync ব্যর্থ:", e);
  }
  after(() => syncMasterQuietly(masterId));
}

/** /api/health এর জন্য: Firestore এ পড়ার অনুমতি আছে কিনা */
export async function firestoreReachable(): Promise<string> {
  try {
    await firestore().doc("users/_health_/taskData/allTasks").get();
    return "ok";
  } catch (e) {
    return e instanceof Error ? e.message.slice(0, 160) : "failed";
  }
}
