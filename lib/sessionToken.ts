// সেশনের সই করা টোকেন (jose): পেজ, route আর proxy সবাই এটা ব্যবহার করে
import { SignJWT, jwtVerify } from "jose";

export const SESSION_NAME = "hermes_session";
export const SESSION_DAYS = 180;
/** এর চেয়ে পুরনো টোকেন হলে proxy নতুন করে দেয়: নিয়মিত খুললে কখনো লগআউট হয় না */
export const REFRESH_AFTER_SEC = 86400;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET সেট করা নেই");
  return new TextEncoder().encode(s);
}

export async function createSession(masterId: string): Promise<string> {
  return new SignJWT({ mid: masterId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function readSession(token: string | undefined): Promise<{ mid: string; iat: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.mid === "string" ? { mid: payload.mid, iat: Number(payload.iat ?? 0) } : null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = {
  name: SESSION_NAME,
  options: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: SESSION_DAYS * 86400 },
};
