// Telegram ছাড়া পোর্টাল: Shongi Lab অ্যাকাউন্টে লগইন করলে বটে যুক্ত না থাকলেও নিজের একটা master_id পায়।
// বটের core/identity.py র মতোই: hermes_users + hermes_identities (platform 'shongilab')। পরে Telegram যুক্ত করতে
// পোর্টাল একটা link কোড দেয় (hermes_link_codes), বটে `/link কোড` লিখলে বট নিজেই Telegram কে এই অ্যাকাউন্টে আনে।
import { randomBytes, randomInt } from "node:crypto";
import { db, one } from "./db";

const bdNow = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" });   // 'YYYY-MM-DD HH:MM:SS'
const LINK_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";                              // বটের LINK_ALPHABET

/** uid এর আগের পোর্টাল-অ্যাকাউন্ট থাকলে সেটা, নইলে নতুন বানিয়ে master_id ফেরত */
export async function ensurePortalAccount(uid: string, name: string): Promise<string> {
  const key = `shongilab_${uid}`;
  const found = await one<{ master_id: string }>("SELECT master_id FROM hermes_identities WHERE platform_key = ?", [key]);
  if (found) return found.master_id;
  const mid = "u_" + randomBytes(6).toString("hex");
  const now = bdNow();
  await db().batch([
    { sql: "INSERT OR IGNORE INTO hermes_users (master_id, name, voice, voice_replies, created_at) VALUES (?, ?, 'Kore', 0, ?)", args: [mid, name || null, now] },
    { sql: "INSERT OR IGNORE INTO hermes_identities (platform_key, master_id, platform, platform_user_id, display_name, created_at) VALUES (?, ?, 'shongilab', ?, ?, ?)", args: [key, mid, uid, name, now] },
    { sql: "INSERT OR REPLACE INTO hermes_site_links (master_id, site, site_uid, linked_at) VALUES (?, 'portal', ?, ?)", args: [mid, uid, now] },
  ], "write");
  // একসাথে দুবার এলে যেটা আগে ঢুকেছে সেটাই
  return (await one<{ master_id: string }>("SELECT master_id FROM hermes_identities WHERE platform_key = ?", [key]))!.master_id;
}

/** এই অ্যাকাউন্টে কোন কোন জায়গা যুক্ত (telegram, discord, shongilab) */
export async function platformsOf(mid: string): Promise<string[]> {
  const rows = await db().execute({ sql: "SELECT DISTINCT platform FROM hermes_identities WHERE master_id = ?", args: [mid] });
  return rows.rows.map((r) => String(r[0]));
}

/** বটের `/link` কোড (১০ মিনিট): Telegram এ `/link কোড` লিখলে Telegram এই অ্যাকাউন্টে যুক্ত হয় */
export async function createLinkCode(mid: string): Promise<string> {
  const code = Array.from({ length: 8 }, () => LINK_ALPHABET[randomInt(LINK_ALPHABET.length)]).join("");
  const exp = new Date(Date.now() + 10 * 60000).toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" });
  await db().batch([
    { sql: "DELETE FROM hermes_link_codes WHERE master_id = ? OR expires_at < ?", args: [mid, bdNow()] },
    { sql: "INSERT OR REPLACE INTO hermes_link_codes (code, master_id, expires_at) VALUES (?, ?, ?)", args: [code, mid, exp] },
  ], "write");
  return code;
}
