// পাসওয়ার্ডহীন সেশন: বটের দেওয়া এক-বারের কোড → সই করা কুকি (৩০ দিন)
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "hermes_session";
const DAYS = 30;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET সেট করা নেই");
  return new TextEncoder().encode(s);
}

export async function createSession(masterId: string): Promise<string> {
  return new SignJWT({ mid: masterId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DAYS}d`)
    .sign(secret());
}

export const SESSION_COOKIE = {
  name: COOKIE,
  options: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: DAYS * 86400 },
};

/** লগইন থাকলে master_id, নইলে null */
export async function getMasterId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.mid === "string" ? payload.mid : null;
  } catch {
    return null;
  }
}

/** পেজে: লগইন না থাকলে /signin এ পাঠিয়ে দেয় */
export async function requireMasterId(): Promise<string> {
  const mid = await getMasterId();
  if (!mid) redirect("/signin");
  return mid;
}
