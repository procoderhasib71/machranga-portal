"use client";
// কম্পিউটারে বাঁ পাশের sidebar, ফোনে নিচের tab bar — একই লিংকগুলো
import { CalendarClock, GraduationCap, HeartPulse, LayoutDashboard, ListChecks, LogOut, Newspaper, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export const LINKS = [
  { href: "/", label: "ড্যাশবোর্ড", short: "হোম", Icon: LayoutDashboard },
  { href: "/todo", label: "কাজের লিস্ট", short: "কাজ", Icon: ListChecks },
  { href: "/routine", label: "রুটিন", short: "রুটিন", Icon: CalendarClock },
  { href: "/news", label: "খবর", short: "খবর", Icon: Newspaper },
  { href: "/health", label: "স্বাস্থ্য", short: "স্বাস্থ্য", Icon: HeartPulse },
  { href: "/study", label: "পড়াশোনা", short: "পড়া", Icon: GraduationCap },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Sidebar({ name }: { name: string }) {
  const path = usePathname();
  const item = (href: string, label: string, Icon: typeof Settings) => {
    const active = isActive(path, href);
    return (
      <Link key={href} href={href} aria-current={active ? "page" : undefined}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-colors"
        style={active ? { background: "var(--brand-soft)", color: "var(--brand)" } : { color: "var(--muted)" }}>
        <Icon size={19} strokeWidth={active ? 2.3 : 1.9} />
        {label}
      </Link>
    );
  };
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r px-4 py-5"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
      <Link href="/" className="px-2 mb-7"><Logo /></Link>
      <nav className="flex flex-col gap-1">
        {LINKS.map((l) => item(l.href, l.label, l.Icon))}
      </nav>
      <div className="mt-auto space-y-3">
        {item("/settings", "সেটিংস", Settings)}
        <ThemeToggle />
        <div className="flex items-center gap-3 px-2 pt-3 border-t" style={{ borderColor: "var(--line)" }}>
          <span className="inline-flex size-9 items-center justify-center rounded-full font-semibold text-sm"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{name.slice(0, 1)}</span>
          <span className="flex-1 min-w-0 truncate text-sm font-medium">{name}</span>
          <a href="/logout" className="btn-ghost rounded-lg" title="বের হও" aria-label="বের হও"><LogOut size={18} /></a>
        </div>
      </div>
    </aside>
  );
}

export function MobileBar() {
  return (
    <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 border-b backdrop-blur-md"
      style={{ background: "color-mix(in srgb, var(--surface) 85%, transparent)", borderColor: "var(--line)" }}>
      <Link href="/"><Logo size={32} /></Link>
      <div className="flex items-center gap-1">
        <ThemeToggle compact />
        <Link href="/settings" className="btn-ghost rounded-xl" aria-label="সেটিংস"><Settings size={20} /></Link>
      </div>
    </header>
  );
}

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 border-t backdrop-blur-md"
      style={{ background: "color-mix(in srgb, var(--surface) 90%, transparent)", borderColor: "var(--line)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid grid-cols-6 max-w-lg mx-auto">
        {LINKS.map(({ href, short, Icon }) => {
          const active = isActive(path, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-medium"
              style={{ color: active ? "var(--brand)" : "var(--faint)" }}>
              <span className="inline-flex items-center justify-center h-7 w-11 rounded-full transition-colors"
                style={active ? { background: "var(--brand-soft)" } : undefined}>
                <Icon size={20} strokeWidth={active ? 2.3 : 1.9} />
              </span>
              {short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
