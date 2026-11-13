// খবর: আগে বটের cron এ জমা করা পত্রিকার খবর (hermes_news_items — প্রথম আলো, ইত্তেফাক, সমকাল, জনকণ্ঠ, ইনকিলাব),
// না পেলে (বা বিষয় মেলাতে না পারলে) Google News এর বাংলা RSS। ব্যাকআপ hermes_news_cache এ ৩ ঘণ্টা রাখি ('web:' আলাদা key)।
import { exec, one, query } from "./db";
import { pickStored } from "./newsPick";

const FEED_TOP = "https://news.google.com/rss?hl=bn&gl=BD&ceid=BD:bn";
const FEED_SEARCH = (q: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=bn&gl=BD&ceid=BD:bn`;
const MAX_ITEMS = 24;
const CACHE_MS = 3 * 3600 * 1000;

export type NewsItem = { title: string; source: string; link: string; at: string };

const decode = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .trim();
const tag = (xml: string, name: string) => decode((new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml)?.[1]) ?? "");

function parse(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const raw = m[1];
    const source = tag(raw, "source");
    let title = tag(raw, "title");
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim();   // শেষে জুড়ে দেওয়া সোর্স বাদ
    const link = tag(raw, "link");
    if (title && link.startsWith("https://")) items.push({ title: title.slice(0, 220), source: source.slice(0, 60), link, at: tag(raw, "pubDate") });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

/** বটের জমানো খবর, নতুন আগে; টেবিল না থাকলে বা খালি হলে খালি তালিকা */
async function getStored(topic: string): Promise<NewsItem[]> {
  try {
    const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
    const rows = await query<{ title: string; source: string; url: string; published_at: string }>(
      "SELECT title, source, url, published_at FROM hermes_news_items WHERE published_at >= ? ORDER BY published_at DESC LIMIT 300", [since]);
    return pickStored(rows, topic, MAX_ITEMS);
  } catch (e) {
    console.error("জমা খবর পড়া গেল না:", e);
    return [];
  }
}

export async function getNews(topic = ""): Promise<{ items: NewsItem[]; stale?: boolean; error?: string }> {
  const t = topic.trim().slice(0, 50);
  const stored = await getStored(t);
  if (stored.length >= (t ? 3 : 1)) return { items: stored };   // বিষয়ে ৩টার কম মিললে Google এও খুঁজি
  const key = t ? `web:t:${t.toLowerCase()}` : "web:top";
  const row = await one<{ items: string; fetched_at: string }>("SELECT items, fetched_at FROM hermes_news_cache WHERE key = ?", [key]);
  if (row && Date.now() - Date.parse(row.fetched_at) < CACHE_MS) return { items: JSON.parse(row.items) };
  try {
    const res = await fetch(t ? FEED_SEARCH(t) : FEED_TOP, { headers: { "User-Agent": "machranga-portal/1.0" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const items = parse(await res.text());
    if (!items.length) return { items: [], error: t ? `"${t}" নিয়ে এখন কোনো খবর পেলাম না।` : "এখন খবর পাওয়া গেল না।" };
    const now = new Date();
    await exec("INSERT INTO hermes_news_cache (key, day, items, fetched_at) VALUES (?, ?, ?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET day = excluded.day, items = excluded.items, fetched_at = excluded.fetched_at",
      [key, now.toISOString().slice(0, 10), JSON.stringify(items), now.toISOString()]);
    return { items };
  } catch (e) {
    console.error("খবরের ফিড আনা গেল না:", key, e);
    if (row) return { items: JSON.parse(row.items), stale: true };   // পুরনো ক্যাশই দিই
    return { items: [], error: "এখন খবর আনা যাচ্ছে না, একটু পরে আবার দেখো।" };
  }
}

/** 'Tue, 11 Nov 2026 09:00:00 GMT' → '৩ ঘণ্টা আগে' */
export function timeAgo(rfc: string): string {
  const t = Date.parse(rfc);
  if (!t) return "";
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  const bn = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
  if (min < 1) return "এইমাত্র";
  if (min < 60) return `${bn(min)} মিনিট আগে`;
  if (min < 24 * 60) return `${bn(Math.round(min / 60))} ঘণ্টা আগে`;
  return `${bn(Math.round(min / 1440))} দিন আগে`;
}
