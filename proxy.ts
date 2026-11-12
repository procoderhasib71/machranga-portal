// লগইন একবারই: চালু সেশন থাকলে signin এ না গিয়ে সোজা ড্যাশবোর্ড, আর দিনে একবার কুকির মেয়াদ নতুন করে বাড়ানো
import { NextRequest, NextResponse } from "next/server";
import { REFRESH_AFTER_SEC, SESSION_COOKIE, createSession, readSession } from "@/lib/sessionToken";
import { publicUrl } from "@/lib/url";

export async function proxy(req: NextRequest) {
  const session = await readSession(req.cookies.get(SESSION_COOKIE.name)?.value);
  if (!session) return NextResponse.next();

  const res = req.nextUrl.pathname === "/signin" && !req.nextUrl.searchParams.has("out")
    ? NextResponse.redirect(publicUrl(req, "/"))
    : NextResponse.next();
  if (Date.now() / 1000 - session.iat > REFRESH_AFTER_SEC) {
    res.cookies.set(SESSION_COOKIE.name, await createSession(session.mid), SESSION_COOKIE.options);
  }
  return res;
}

export const config = {
  // পেজগুলোতেই (API, লগইন/লগআউট route আর স্থির ফাইল বাদ)
  matcher: ["/((?!api|login|logout|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|jpg|webp|txt|xml)$).*)"],
};
