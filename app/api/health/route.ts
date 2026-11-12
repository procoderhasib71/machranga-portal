// ডিপ্লয় যাচাই: কোন env আছে (শুধু হ্যাঁ/না, মান নয়) আর ডাটাবেসে পৌঁছানো যায় কিনা
import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { firestoreReachable } from "@/lib/pomodoroSync";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
  };
  let db = "ok";
  try {
    await one("SELECT 1 AS x");
  } catch (e) {
    db = e instanceof Error ? e.message.slice(0, 200) : "failed";
  }
  const ok = db === "ok" && Object.values(env).every(Boolean);
  // Pomodoro sync এর জন্য Firestore (এটা না চললেও পোর্টালের বাকি সব চলে, তাই ok এর অংশ নয়)
  const pomodoroFirestore = await firestoreReachable();
  return NextResponse.json({ ok, env, db, pomodoroFirestore }, { status: ok ? 200 : 503 });
}
