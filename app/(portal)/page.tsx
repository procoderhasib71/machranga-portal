// ড্যাশবোর্ড: এক নজরে আজকের সবকিছু
import { Bell, CalendarClock, ChevronRight, CircleCheck, HeartPulse, Newspaper, Sparkles } from "lucide-react";
import Link from "next/link";
import { requireMasterId } from "@/lib/session";
import { getDaysOff, getHealthLogs, getReminders, getRoutine, getSubscription, getTodos, getUser, todaysBlocks } from "@/lib/data";
import { DAY_ORDER, bnDigits, fullDateBn, greeting, humanDate, humanDateTime, humanTime, nowBD, nowHHMM, todayBD } from "@/lib/bn";
import { metricBn, valueText } from "@/lib/health";
import { getNews, timeAgo, type NewsItem } from "@/lib/news";
import { CardHead, Empty } from "@/components/PageHeader";
import TodayPlan from "@/components/TodayPlan";
import { buildToday } from "@/lib/todayPlan";
import { syncMasterQuietly } from "@/lib/pomodoroSync";
import InstallApp from "@/components/InstallApp";
import Reminders, { AddReminderButton } from "@/components/Reminders";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub, tone = "brand", delay = 0, className = "" }: { label: string; value: string; sub?: string; tone?: "brand" | "accent"; delay?: number; className?: string }) {
  return (
    <div className={`card card-pad rise ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <p className="eyebrow">{label}</p>
      <p className="num text-2xl sm:text-[28px] font-bold mt-1 leading-none" style={{ color: tone === "accent" ? "var(--accent)" : "var(--ink)" }}>{value}</p>
      {sub && <p className="text-xs muted mt-1.5 truncate">{sub}</p>}
    </div>
  );
}

export default async function Dashboard() {
  const mid = await requireMasterId();
  await syncMasterQuietly(mid);   // Pomodoro তে যোগ করা কাজও আজকের তালিকায় আসুক
  const [user, todos, routine, reminders, sub, health] = await Promise.all([
    getUser(mid), getTodos(mid), getRoutine(mid), getReminders(mid), getSubscription(mid), getHealthLogs(mid, 14),
  ]);
  const firstTopic = (user?.news_topics ?? "").split(",")[0]?.trim() ?? "";
  const news = (await getNews(firstTopic).catch(() => ({ items: [] as NewsItem[] }))).items.slice(0, 4);
  const now = nowBD();
  const today = todayBD();
  const hhmm = nowHHMM(now);
  const dayCode = DAY_ORDER[(now.getDay() + 1) % 7];   // JS: রবি=0 → আমাদের ক্রমে
  const off = (await getDaysOff(mid, today, today)).has(today);
  const blocks = todaysBlocks(routine, dayCode).filter((b) => b.date || !off);   // ছুটির দিনে সাপ্তাহিক বাদ
  // রুটিনের ব্লক আর সময় ছাড়া কাজ এক তালিকায় (কাজের আলাদা পেজ নেই)
  const plan = buildToday(blocks, [...todos.open, ...todos.done], today, hhmm);
  const current = plan.current;
  const nextBlock = plan.next;
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

      <InstallApp />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Stat className="col-span-2 lg:col-span-1" label="আজকের রুটিন" value={plan.total ? `${bnDigits(plan.done)}/${bnDigits(plan.total)}` : "০"} sub={!plan.total ? "আজ কিছু নেই" : plan.done === plan.total ? "আজকের সব শেষ 🎉"
          : current ? `এখন: ${current.title}` : nextBlock ? `পরেরটা ${humanTime(nextBlock.start_time)}` : `${bnDigits(plan.total - plan.done)}টা বাকি`} delay={80} />
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="card card-pad lg:col-span-3 rise" style={{ animationDelay: "200ms" }}>
          <CardHead title="আজকের রুটিন" Icon={CalendarClock} action={<Link href="/routine" className="link">পুরোটা <ChevronRight size={16} /></Link>} />
          {off && <p className="text-sm rounded-xl px-3 py-2 mb-3" style={{ background: "var(--accent-soft)" }}>🌴 আজ ছুটি: সাপ্তাহিক রুটিন বন্ধ</p>}
          {plan.total === 0 ? (
            <Empty text="আজ রুটিনে কিছু নেই। রুটিন পেজে কাজ লেখো, অথবা বটকে বলো:" example="আমার একটা পড়ার রুটিন বানাও" />
          ) : (
            <TodayPlan blocks={plan.blocks} tasks={plan.tasks} today={today} />
          )}
        </section>

        <section className="card card-pad lg:col-span-2 rise" style={{ animationDelay: "240ms" }}>
          <CardHead title="সামনের রিমাইন্ডার" Icon={Bell} accent action={<AddReminderButton />} />
          {reminders.length === 0 ? (
            <Empty text="কোনো রিমাইন্ডার নেই। উপরের “নতুন” চাপো, অথবা বটকে বলো:" example="কাল সকাল ৭টায় পড়তে বসার কথা মনে করাস" />
          ) : (
            <>
              <Reminders rows={reminders.slice(0, 8)} />
              {reminders.length > 8 && <p className="text-xs muted mt-2">…আরও {bnDigits(reminders.length - 8)}টা</p>}
            </>
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
          <section className="card card-pad lg:col-span-3 rise" style={{ animationDelay: "320ms" }}>
            <CardHead title={firstTopic ? `আজকের খবর · ${firstTopic}` : "আজকের খবর"} Icon={Newspaper}
              action={<Link href={firstTopic ? `/news?t=${encodeURIComponent(firstTopic)}` : "/news"} className="link">আরও <ChevronRight size={16} /></Link>} />
            <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
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
