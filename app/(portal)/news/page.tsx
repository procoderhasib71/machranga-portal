import { ArrowUpRight, Newspaper, Search } from "lucide-react";
import Link from "next/link";
import { requireMasterId } from "@/lib/session";
import { getUser } from "@/lib/data";
import { getNews, timeAgo } from "@/lib/news";
import PageHeader, { Empty } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const SUGGESTED = ["খেলা", "চাকরি", "প্রযুক্তি", "শিক্ষা", "স্বাস্থ্য", "অর্থনীতি"];

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ t?: string; q?: string }> }) {
  const mid = await requireMasterId();
  const sp = await searchParams;
  const user = await getUser(mid);
  const mine = (user?.news_topics ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const topics = [...mine, ...SUGGESTED.filter((s) => !mine.includes(s))].slice(0, 8);
  const active = (sp.q ?? sp.t ?? "").trim().slice(0, 50);
  const { items, stale, error } = await getNews(active);
  const [lead, ...rest] = items;

  const tab = (label: string, value: string) => {
    const on = active === value;
    return (
      <Link key={value || "top"} href={value ? `/news?t=${encodeURIComponent(value)}` : "/news"} aria-current={on ? "page" : undefined}
        className="chip py-1.5 px-3.5 text-sm shrink-0 transition-colors"
        style={on ? { background: "var(--brand)", color: "var(--brand-ink)" } : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--line)" }}>
        {label}{mine.includes(value) && !on ? " ★" : ""}
      </Link>
    );
  };

  return (
    <div>
      <PageHeader title="খবর" subtitle={user?.news_time ? `প্রতিদিন ${user.news_time.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)])}-এ বটেও পাঠাই` : "প্রথম আলো, ইত্তেফাক, সমকাল, জনকণ্ঠ ও ইনকিলাব থেকে"} Icon={Newspaper} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5 rise">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 flex-1" style={{ scrollbarWidth: "none" }}>
          {tab("প্রধান খবর", "")}
          {topics.map((t) => tab(t, t))}
        </div>
        <form action="/news" className="shell sm:w-64 shrink-0">
          <Search size={16} className="faint shrink-0" />
          <input name="q" defaultValue={sp.q ?? ""} placeholder="যেকোনো বিষয় খোঁজো…" aria-label="খবর খোঁজো" className="!py-2.5 text-sm" />
        </form>
      </div>

      {stale && <p className="text-xs muted mb-3">ইন্টারনেট সমস্যায় নতুন খবর আনা যায়নি, আগের খবর দেখাচ্ছি।</p>}

      {!lead ? (
        <div className="card card-pad max-w-xl"><Empty text={error ?? "কোনো খবর পাওয়া যায়নি।"} /></div>
      ) : (
        <div className="space-y-4">
          <a href={lead.link} target="_blank" rel="noopener noreferrer" className="card card-pad block rise group"
            style={{ background: "linear-gradient(120deg, var(--brand-soft), var(--surface) 75%)" }}>
            <p className="eyebrow flex items-center gap-2"><span className="chip">শীর্ষ খবর</span>{lead.source} · {timeAgo(lead.at)}</p>
            <h2 className="text-xl sm:text-2xl font-bold leading-snug mt-3 group-hover:underline decoration-2 underline-offset-4">{lead.title}</h2>
            <p className="link mt-3">পুরোটা পড়ো <ArrowUpRight size={16} /></p>
          </a>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((n, i) => (
              <a key={n.link} href={n.link} target="_blank" rel="noopener noreferrer"
                className="card card-pad flex flex-col justify-between gap-3 rise group hover:border-[var(--faint)] transition-colors"
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                <h3 className="font-semibold leading-snug group-hover:underline underline-offset-4">{n.title}</h3>
                <p className="text-xs muted flex items-center justify-between gap-2">
                  <span className="truncate">{n.source}</span>
                  <span className="shrink-0">{timeAgo(n.at)}</span>
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs muted mt-6">★ চিহ্ন দেওয়াগুলো তোমার পছন্দের বিষয় (সেটিংসে বদলানো যায়)। খবরের লেখা পত্রিকাগুলোর নিজের, এখানে শুধু শিরোনাম আর লিংক।</p>
    </div>
  );
}
