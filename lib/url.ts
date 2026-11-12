import type { NextRequest } from "next/server";

/** ইউজার যে ঠিকানায় এসেছে সেই ডোমেইনে path। Firebase/Cloud Run এর পেছনে req.url ভেতরের 0.0.0.0:8080 দেখায়। */
export function publicUrl(req: NextRequest, path: string): URL {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return new URL(path, req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return new URL(path, `${proto.split(",")[0]}://${host.split(",")[0]}`);
}
