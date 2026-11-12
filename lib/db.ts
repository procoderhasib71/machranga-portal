// বটের (Hermes2) Turso ডাটাবেসের সাথে সরাসরি কথা — আলাদা API লাগে না, বট আর পোর্টাল সবসময় sync এ
import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

export function db(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL সেট করা নেই");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return client;
}

export async function query<T = Record<string, unknown>>(sql: string, args: (string | number | null)[] = []): Promise<T[]> {
  const res = await db().execute({ sql, args });
  // libsql এর Row ক্লাস client component এ পাঠানো যায় না, তাই সাধারণ object বানিয়ে দিই
  return res.rows.map((row) => Object.fromEntries(res.columns.map((c, i) => [c, row[i]]))) as T[];
}

export async function one<T = Record<string, unknown>>(sql: string, args: (string | number | null)[] = []): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

export async function exec(sql: string, args: (string | number | null)[] = []): Promise<number> {
  const res = await db().execute({ sql, args });
  return res.rowsAffected;
}
