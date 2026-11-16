// Shongi Lab অ্যাকাউন্টে লগইনের পর: Firebase টোকেন যাচাই → বটে যুক্ত থাকলে সেই অ্যাকাউন্টে,
// না থাকলে Telegram ছাড়াই নিজের পোর্টাল-অ্যাকাউন্ট (পরে সেটিংস থেকে Telegram যুক্ত করা যায়)
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { masterIdForUid } from "@/lib/pending";
import { ensurePortalAccount } from "@/lib/account";
import { createSession, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json().catch(() => ({ idToken: "" }));
  let uid: string, name: string;
  try {
    const t = await adminAuth.verifyIdToken(String(idToken || ""));
    uid = t.uid;
    name = String(t.name || "").trim().slice(0, 60);
  } catch {
    return NextResponse.json({ ok: false, error: "লগইন যাচাই করা যায়নি, আবার চেষ্টা করো।" }, { status: 401 });
  }

  const mid = (await masterIdForUid(uid)) ?? (await ensurePortalAccount(uid, name));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE.name, await createSession(mid), SESSION_COOKIE.options);
  return res;
}
