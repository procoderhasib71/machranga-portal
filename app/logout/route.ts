import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { publicUrl } from "@/lib/url";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(publicUrl(req, "/signin?out=1"));
  res.cookies.delete(SESSION_COOKIE.name);
  return res;
}
