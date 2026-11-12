// পাসওয়ার্ডহীন সেশন: বটের কোড বা Shongi Lab লগইন → সই করা কুকি (১৮০ দিন, ব্যবহার করলে নিজে থেকে বাড়ে; proxy.ts)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_NAME, readSession } from "./sessionToken";

export { createSession, SESSION_COOKIE } from "./sessionToken";

/** লগইন থাকলে master_id, নইলে null */
export async function getMasterId(): Promise<string | null> {
  return (await readSession((await cookies()).get(SESSION_NAME)?.value))?.mid ?? null;
}

/** পেজে: লগইন না থাকলে /signin এ পাঠিয়ে দেয় */
export async function requireMasterId(): Promise<string> {
  const mid = await getMasterId();
  if (!mid) redirect("/signin");
  return mid;
}
