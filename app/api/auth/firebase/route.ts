// Shongi Lab অ্যাকাউন্টে লগইনের পর: Firebase টোকেন যাচাই → বটে যুক্ত থাকলে সরাসরি ঢোকা,
// না থাকলে একবার বটের সাথে যুক্ত করার কোড (এরপর থেকে শুধু লগইনেই ঢোকা যাবে)
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { masterIdForUid, pendingResponse } from "@/lib/pending";
import { createSession, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json().catch(() => ({ idToken: "" }));
  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(String(idToken || ""))).uid;
  } catch {
    return NextResponse.json({ ok: false, error: "লগইন যাচাই করা যায়নি, আবার চেষ্টা করো।" }, { status: 401 });
  }

  const mid = await masterIdForUid(uid);
  if (mid) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE.name, await createSession(mid), SESSION_COOKIE.options);
    return res;
  }
  return pendingResponse(uid, { ok: false, needLink: true });
}
