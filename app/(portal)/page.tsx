// ড্যাশবোর্ড: এক নজরে আজকের সবকিছু
import { Bell, CalendarClock, ChevronRight, CircleCheck, HeartPulse, ListChecks, Newspaper, Sparkles } from "lucide-react";
import Link from "next/link";
import { requireMasterId } from "@/lib/session";
import { getHealthLogs, getReminders, getRoutine, getSubscription, getTodos, getUser, isOverdue, todaysBlocks } from "@/lib/data";
import { DAY_ORDER, bnDigits, fullDateBn, greeting, humanDate, humanDateTime, humanTime, nowBD, nowHHMM, todayBD } from "@/lib/bn";
import { metricBn, valueText } from "@/lib/health";
import { getNews, timeAgo, type NewsItem } from "@/lib/news";
import { CardHead, Empty } from "@/components/PageHeader";
import RoutineToday from "@/components/RoutineToday";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub, tone = "brand", delay = 0 }: { label: string; value: string; sub?: string; tone?: "brand" | "accent"; delay?: number }) {
  return (
    <div className="card card-pad rise" style={{ animationDelay: `${delay}ms` }}>
      <p className="eyebrow">{label}</p>
      <p className="num text-2xl sm:text-[28px] font-bold mt-1 leading-none" style={{ color: tone === "accent" ? "var(--accent)" : "var(--ink)" }}>{value}</p>
      {sub && <p className="text-xs muted mt-1.5 truncate">{sub}</p>}
    </div>
  );
}

export default async function Dashboard() {
  const mid = await requireMasterId();
  const [user, todos, routine, reminders, sub, health] = await Promise.all([
    getUser(mid), getTodos(mid), getRoutine(mid), getReminders(mid), getSubscription(mid), getHealthLogs(mid, 14),
  ]);
  const firstTopic = (user?.news_topics ?? "").split(",")[0]?.trim() ?? "";
  const news = (await getNews(firstTopic).catch(() => ({ items: [] as NewsItem[] }))).items.slice(0, 4);
  const now = nowBD();
  const today = todayBD();
  const hhmm = nowHHMM(now);
  const dayCode = DAY_ORDER[(now.getDay() + 1) % 7];   // JS: রবি=0 → আমাদের ক্রমে
  const blocks = todaysBlocks(routine, dayCode);
  const current = blocks.find((b) => b.start_time <= hhmm && (b.end_time ? hhmm < b.end_time : false));
  const nextBlock = blocks.find((b) => b.start_time > hhmm);
  // রুটিনের কাজ "আজকের রুটিন" এ টিকসহ দেখাই, তাই "আজকের কাজ" এ শুধু সাধারণ কাজ
  const doneToday = todos.done.filter((t) => !t.routine_id && (t.done_at ?? "").startsWith(today)).length;
  const openNow = todos.open.filter((t) => !t.routine_id);
  const total = doneToday + openNow.length;
  const routineTodo = new Map([...todos.open, ...todos.done]
    .filter((t) => t.routine_id && t.due_date === today).map((t) => [t.routine_id!, t]));
  const todayBlocks = blocks.map((b) => {
    const t = routineTodo.get(b.id);
    return { id: b.id, start_time: b.start_time, end_time: b.end_time, title: b.title, note: b.note,
      todoId: t?.id ?? null, done: t?.status === "done", live: b === current, past: (b.end_time ?? b.start_time) <= hhmm };
  });
  const routineDone = todayBlocks.filter((b) => b.done).length;
  const pct = total ? Math.round((doneToday / total) * 100) : 0;
  const lastBp = health.filter((h) => h.metric === "bp").at(-1);
  const lastHealth = health.filter((h) => h.metric !== "symptom").at(-1);
  const nextReminder = reminders[0];
  const name = user?.call_me || user?.name || "বন্ধু";

  return (
    <div className="space-y-6">
      <div className="rise">
        <p className="eyebrow">{fullDateBn(now)}</p>
        <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight mt-1">{greeting(now)}, {name} 👋</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="আজকের কাজ" value={total ? `${bnDigits(doneToday)}/${bnDigits(total)}` : "০"} sub={total ? `${bnDigits(pct)}% শেষ` : "লিস্ট ফাঁকা"} delay={40} />
        <Stat label="আজকের রুটিন" value={blocks.length ? `${bnDigits(routineDone)}/${bnDigits(blocks.length)}` : "০"} sub={nextBlock ? `পরেরটা ${humanTime(nextBlock.start_time)}` : blocks.length ? "আজকের সব শেষ" : "কোনো ব্লক নেই"} delay={80} />
        <Stat label="পরের রিমাইন্ডার" value={nextReminder ? humanTime(nextReminder.trigger_time.slice(11, 16)).split(" ").at(-1)! : "—"}
          sub={nextReminder ? `${humanDate(nextReminder.trigger_time.slice(0, 10))} ${humanTime(nextReminder.trigger_time.slice(11, 16)).split(" ")[0]} · ${nextReminder.task}` : "কিছু নেই"}
          tone="accent" delay={120} />
        <Stat label="শেষ প্রেশার" value={lastBp ? valueText("bp", lastBp.value_json, null) : "—"} sub={lastBp ? humanDateTime(lastBp.logged_at) : "মাপ নেই"} delay={160} />
      </div>

      {current && (
        <div className="card card-pad rise flex items-center gap-4" style={{ background: "linear-gradient(120deg, var(--brand-soft), var(--surface) 70%)", animationDelay: "180ms" }}>
          <span className="icon-badge size-11 rounded-2xl"><Sparkles size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow" style={{ color: "var(--brand)" }}>এখন চলছে · {humanTime(current.start_time)}–{humanTime(current.end_time!)}</p>
            <p className="font-semibold text-lg truncate">{current.title}</p>
            {current.note && <p className="text-sm muted truncate">💡 {current.note}</p>}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card card-pad lg:col-span-3 rise" style={{ animationDelay: "200ms" }}>
          <CardHead title="আজকের কাজ" Icon={ListChecks} action={<Link href="/todo" className="link">সব <ChevronRight size={16} /></Link>} />
          {total > 0 && (
            <div className="mb-4">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--brand)" }} />
              </div>
            </div>
          )}
          {openNow.length === 0 ? (
            <Empty text={doneToday ? "আজকের সব কাজ শেষ! 🎉" : "লিস্ট ফাঁকা। বটকে বলো:"} example={doneToday ? undefined : "লিস্টে রাখো: বাজার করা"} />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {openNow.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="size-4 rounded-full border-2 shrink-0" style={{ borderColor: t.priority ? "var(--accent)" : "var(--faint)" }} />
                  <span className="flex-1 min-w-0 truncate">{t.task}</span>
                  {t.priority ? <span className="chip chip-accent">জরুরি</span> : null}
                  {t.due_date && <span className={`chip ${isOverdue(t.due_date) ? "chip-danger" : "chip-muted"}`}>{humanDate(t.due_date)}</span>}
                </li>
              ))}
            </ul>
          )}
          {openNow.length > 6 && <p className="text-sm muted mt-2">…আরও {bnDigits(openNow.length - 6)}টা</p>}
        </section>

        <section className="card card-pad lg:col-span-2 rise" style={{ animationDelay: "240ms" }}>
          <CardHead title="আজকের রুটিন" Icon={CalendarClock} action={<Link href="/routine" className="link">পুরোটা <ChevronRight size={16} /></Link>} />
          {blocks.length === 0 ? (
            <Empty text="আজকের জন্য কোনো ব্লক নেই। বটকে বলো:" example="আমার একটা পড়ার রুটিন বানাও" />
          ) : (
            <RoutineToday blocks={todayBlocks} />
          )}
        </section>

        <section className="card card-pad lg:col-span-3 rise" style={{ animationDelay: "280ms" }}>
          <CardHead title="সামনের রিমাইন্ডার" Icon={Bell} accent />
          {reminders.length === 0 ? (
            <Empty text="কোনো রিমাইন্ডার নেই। বটকে বলো:" example="কাল সকাল ৭টায় পড়তে বসার কথা মনে করাস" />
          ) : (
            <ul className="space-y-2.5">
              {reminders.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <span className="chip chip-accent num shrink-0">{humanDateTime(r.trigger_time)}</span>
                  <span className="flex-1 min-w-0 truncate">{r.task}</span>
                  {r.repeat_rule ? <span className="text-xs faint shrink-0">🔁</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card card-pad lg:col-span-2 rise" style={{ animationDelay: "320ms" }}>
          <CardHead title="স্বাস্থ্য" Icon={HeartPulse} action={<Link href="/health" className="link">চার্ট <ChevronRight size={16} /></Link>} />
          {lastHealth ? (
            <div>
              <p className="eyebrow">শেষ মাপ · {metricBn(lastHealth.metric)}</p>
              <p className="num text-3xl font-bold mt-1">{valueText(lastHealth.metric, lastHealth.value_json, lastHealth.unit)}</p>
              <p className="text-xs muted mt-1">{humanDateTime(lastHealth.logged_at)}</p>
            </div>
          ) : (
            <Empty text="গত ২ সপ্তাহে কোনো মাপ নেই। বটকে বলো:" example="আজ প্রেশার ১৩০/৮৫" />
          )}
          {sub && (
            <div className="flex items-center gap-2 mt-5 pt-4 border-t text-sm" style={{ borderColor: "var(--line)" }}>
              <CircleCheck size={16} style={{ color: "var(--ok)" }} />
              <span className="muted">{sub.plan === "trial" ? "ফ্রি ট্রায়াল" : "প্ল্যান চালু"} · {humanDate(sub.expires_at.slice(0, 10))} পর্যন্ত</span>
            </div>
          )}
        </section>

        {news.length > 0 && (
          <section className="card card-pad lg:col-span-5 rise" style={{ animationDelay: "360ms" }}>
            <CardHead title={firstTopic ? `আজকের খবর · ${firstTopic}` : "আজকের খবর"} Icon={Newspaper}
              action={<Link href={firstTopic ? `/news?t=${encodeURIComponent(firstTopic)}` : "/news"} className="link">আরও <ChevronRight size={16} /></Link>} />
            <ul className="grid gap-x-6 sm:grid-cols-2">
              {news.map((n) => (
                <li key={n.link} className="border-t first:border-t-0 sm:[&:nth-child(2)]:border-t-0 py-3" style={{ borderColor: "var(--line)" }}>
                  <a href={n.link} target="_blank" rel="noopener noreferrer" className="block group">
                    <p className="font-medium leading-snug group-hover:underline underline-offset-4">{n.title}</p>
                    <p className="text-xs muted mt-1">{n.source} · {timeAgo(n.at)}</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
