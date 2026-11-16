import { Bell, LogOut, Palette, Send, Settings, UserRound } from "lucide-react";
import { requireMasterId } from "@/lib/session";
import { getUser } from "@/lib/data";
import { one } from "@/lib/db";
import PageHeader, { CardHead } from "@/components/PageHeader";
import SettingsForm from "@/components/SettingsForm";
import ThemeToggle from "@/components/ThemeToggle";
import InstallApp from "@/components/InstallApp";
import ProfileForm from "@/components/ProfileForm";
import TelegramConnect from "@/components/TelegramConnect";
import { platformsOf } from "@/lib/account";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const mid = await requireMasterId();
  const user = await getUser(mid);
  const [moneyLink, platforms] = await Promise.all([
    one("SELECT 1 AS x FROM hermes_site_links WHERE master_id = ? AND site = 'money'", [mid]),
    platformsOf(mid),
  ]);
  let prayer: { prayers: string[]; before: number } | null = null;
  try {
    const pa = user?.prayer_alerts ? JSON.parse(user.prayer_alerts) : null;
    if (pa && Array.isArray(pa.prayers)) prayer = { prayers: pa.prayers, before: Number(pa.before) || 0 };
  } catch { /* পুরনো ভুল মান থাকলে বন্ধ ধরি */ }
  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="সেটিংস" subtitle="এখানে বদলালে বটও সাথে সাথে সেভাবে চলে" Icon={Settings} />

      <section className="card card-pad rise">
        <CardHead title="দেখার ধরন" Icon={Palette} />
        <ThemeToggle />
        <p className="text-xs muted mt-2">অটো মানে তোমার ফোন বা কম্পিউটার যেটা ব্যবহার করে।</p>
        <InstallApp variant="row" />
      </section>

      <section className="card card-pad rise" style={{ animationDelay: "30ms" }}>
        <CardHead title="প্রোফাইল" Icon={UserRound} />
        <ProfileForm name={user?.name ?? ""} callMe={user?.call_me ?? ""} city={user?.city ?? ""}
          assistantName={user?.assistant_name ?? ""} prayer={prayer} />
      </section>

      <section className="card card-pad rise" style={{ animationDelay: "45ms" }}>
        <CardHead title="Telegram" Icon={Send} />
        <TelegramConnect linked={platforms.includes("telegram")} />
      </section>

      <section className="card card-pad rise" style={{ animationDelay: "60ms" }}>
        <CardHead title="বটের মেসেজ" Icon={Bell} accent />
        <SettingsForm
          todoDigest={user?.todo_digest ?? ""}
          newsTime={user?.news_time ?? ""}
          newsTopics={user?.news_topics ?? ""}
          moodCheckin={user?.mood_checkin ?? ""}
          weeklyReport={(user?.weekly_report ?? 1) === 1}
          moneyDigest={(user?.money_digest ?? 1) === 1}
          moneyLinked={!!moneyLink}
        />
      </section>

      <a href="/logout" className="btn-outline lg:hidden w-full"><LogOut size={18} /> বের হও</a>
    </div>
  );
}
