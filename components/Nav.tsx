"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "ড্যাশবোর্ড" },
  { href: "/todo", label: "কাজ" },
  { href: "/routine", label: "রুটিন" },
  { href: "/health", label: "স্বাস্থ্য" },
  { href: "/study", label: "পড়াশোনা" },
  { href: "/settings", label: "সেটিংস" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-sm">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href}
            className="px-3 py-1.5 rounded-full whitespace-nowrap font-medium"
            style={active ? { background: "var(--teal-soft)", color: "var(--teal)" } : { color: "var(--muted)" }}>
            {l.label}
          </Link>
        );
      })}
      <a href="/logout" className="px-3 py-1.5 whitespace-nowrap" style={{ color: "var(--muted)" }}>বের হও</a>
    </nav>
  );
}
