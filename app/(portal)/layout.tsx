import Link from "next/link";
import { requireMasterId } from "@/lib/session";
import { getUser } from "@/lib/data";
import Nav from "@/components/Nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const mid = await requireMasterId();
  const user = await getUser(mid);
  const botName = user?.assistant_name || "মাছরাঙা";
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b" style={{ background: "var(--card)", borderColor: "var(--line)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg" style={{ color: "var(--teal)" }}>
            <span>🐦</span> {botName} পোর্টাল
          </Link>
          <Nav />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      <footer className="max-w-5xl mx-auto px-4 pb-8 text-sm" style={{ color: "var(--muted)" }}>
        সবকিছু বটের সাথে সাথে সাথে মিলে যায় — এখানে বদলালে বটও জানবে 🙂
      </footer>
    </div>
  );
}
