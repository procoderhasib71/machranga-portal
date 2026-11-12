import { Bell, LogOut, Palette, Settings } from "lucide-react";
import { requireMasterId } from "@/lib/session";
import { getUser } from "@/lib/data";
import { one } from "@/lib/db";
import PageHeader, { CardHead } from "@/components/PageHeader";
import SettingsForm from "@/components/SettingsForm";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const mid = await requireMasterId();
  const user = await getUser(mid);
  const moneyLink = await one("SELECT 1 AS x FROM hermes_site_links WHERE master_id = ? AND site = 'money'", [mid]);
  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="সেটিংস" subtitle="এখানে বদলালে বটও সাথে সাথে সেভাবে চলে" Icon={Settings} />

      <section className="card card-pad rise">
        <CardHead title="দেখার ধরন" Icon={Palette} />
        <ThemeToggle />
        <p className="text-xs muted mt-2">অটো মানে তোমার ফোন বা কম্পিউটার যেটা ব্যবহার করে।</p>
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

      <p className="text-sm muted">নামাজের রিমাইন্ডার, বটের নাম বদলানো এসব বটেই বলো — &ldquo;নামাজের রিমাইন্ডার দিও&rdquo;, &ldquo;তোমার নাম ময়না&rdquo; 🙂</p>
      <a href="/logout" className="btn-outline lg:hidden w-full"><LogOut size={18} /> বের হও</a>
    </div>
  );
}
