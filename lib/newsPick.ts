// বটের cron এ জমা করা পত্রিকার খবর (hermes_news_items) থেকে দেখানোর তালিকা বানানো — বটের tools/news.py এর নিয়মেরই মতো।
// খাঁটি ফাংশন (db ছাড়া), তাই টেস্ট করা যায়।
export type StoredNews = { title: string; source: string; link: string; at: string };
export type Row = { title: string; source: string; url: string; published_at: string };

const words = (t: string) => new Set((t.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 1));

/** একই ঘটনার খবর বাদ: শব্দের মিল (Jaccard) ৬০% এর বেশি হলে একটাই রাখি */
export function dedupe<T extends { title: string }>(items: T[]): T[] {
  const out: T[] = [];
  const sets: Set<string>[] = [];
  for (const i of items) {
    const w = words(i.title);
    const dup = sets.some((s) => {
      if (!w.size || !s.size) return false;
      let inter = 0;
      for (const x of w) if (s.has(x)) inter++;
      return inter / (w.size + s.size - inter) > 0.6;
    });
    if (dup) continue;
    out.push(i); sets.push(w);
  }
  return out;
}

/** rows: নতুন আগে সাজানো। topic থাকলে হেডলাইনে সেই শব্দ থাকা খবরই; প্রতি পত্রিকা থেকে সর্বোচ্চ perSource টা। */
export function pickStored(rows: Row[], topic: string, max = 24, perSource = 8): StoredNews[] {
  const t = topic.trim().toLowerCase();
  const filtered = t ? rows.filter((r) => r.title.toLowerCase().includes(t)) : rows;
  const count: Record<string, number> = {};
  const capped = dedupe(filtered).filter((r) => (count[r.source] = (count[r.source] ?? 0) + 1) <= perSource);
  // "2026-11-13 02:30:00" (UTC) → ISO, যাতে Date.parse আর timeAgo ঠিক চলে
  return capped.slice(0, max).map((r) => ({ title: r.title, source: r.source, link: r.url, at: `${r.published_at.replace(" ", "T")}Z` }));
}
