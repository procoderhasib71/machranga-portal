// Pomodoro ↔ to-do sync এর আসল কাজ: Firestore (Pomodoro র টাস্ক) আর Turso (to-do, রুটিন) পড়ে-লেখা।
// নিয়ম lib/pomodoroPlan.ts এ। পোর্টাল App Hosting এ একই Firebase project এ চলে, তাই আলাদা key লাগে না।
import { createHash, timingSafeEqual } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "./firebaseAdmin";
import { db, query } from "./db";
import { DAY_ORDER } from "./bn";
import { plan, type BlockRow, type PomoTask, type TodoRow } from "./pomodoroPlan";

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

/** একজন ইউজারের sync; ফেরত দেয় কয়টা বদল হলো */
export async function syncUser(masterId: string, uid: string): Promise<number> {
  const [todos, blocks] = await Promise.all([
    query<TodoRow>(
      "SELECT id, task, due_date, priority, status, pomo_id, pomo_done FROM hermes_todos " +
      "WHERE master_id = ? AND (status IN ('open', 'deleted') OR pomo_id IS NOT NULL) ORDER BY id", [masterId]),
    query<BlockRow>("SELECT id, days, start_time, end_time, title FROM hermes_routine_blocks WHERE master_id = ? ORDER BY start_time, id", [masterId]),
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

/** Pomodoro বটে যুক্ত এমন সব ইউজার */
export async function syncAll(): Promise<{ users: number; changed: number; errors: string[] }> {
  const links = await query<{ master_id: string; site_uid: string }>(
    "SELECT master_id, site_uid FROM hermes_site_links WHERE site = 'pomodoro'");
  let changed = 0;
  const errors: string[] = [];
  for (const l of links) {
    try {
      changed += await syncUser(l.master_id, l.site_uid);
    } catch (e) {
      console.error("Pomodoro sync ব্যর্থ:", l.master_id, e);
      errors.push(e instanceof Error ? e.message.slice(0, 160) : "failed");
    }
  }
  return { users: links.length, changed, errors };
}

/** পোর্টালে কিছু বদলালে সাথে সাথে (Pomodoro যুক্ত না থাকলে কিছু করে না, ব্যর্থ হলেও পোর্টালের কাজ আটকায় না) */
export async function syncMasterQuietly(masterId: string): Promise<void> {
  try {
    const rows = await query<{ site_uid: string }>(
      "SELECT site_uid FROM hermes_site_links WHERE master_id = ? AND site = 'pomodoro'", [masterId]);
    if (rows[0]) await syncUser(masterId, rows[0].site_uid);
  } catch (e) {
    console.error("Pomodoro sync (পোর্টাল থেকে) ব্যর্থ:", e);
  }
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
