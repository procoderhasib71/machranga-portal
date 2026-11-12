"use client";
// আলো / অন্ধকার / অটো (ফোন বা কম্পিউটারের সেটিং) — পছন্দটা এই ব্রাউজারে মনে থাকে
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
const OPTIONS: { mode: Mode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "আলো", Icon: Sun },
  { mode: "dark", label: "অন্ধকার", Icon: Moon },
  { mode: "system", label: "অটো", Icon: Monitor },
];

function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === "system") delete root.dataset.theme;
  else root.dataset.theme = mode;
  try {
    if (mode === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", mode);
  } catch { /* প্রাইভেট মোডে সেভ না হলেও এই পেজে কাজ করবে */ }
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setMode(t === "light" || t === "dark" ? t : "system");
  }, []);

  const choose = (m: Mode) => { setMode(m); apply(m); };

  if (compact) {
    // ফোনের উপরের বারে: এক বোতাম, চাপলে পরেরটায় যায়
    const i = OPTIONS.findIndex((o) => o.mode === mode);
    const { Icon, label } = OPTIONS[i];
    const next = OPTIONS[(i + 1) % OPTIONS.length];
    return (
      <button className="btn-ghost rounded-xl" onClick={() => choose(next.mode)} aria-label={`theme: ${label} (চাপলে ${next.label})`} title={`theme: ${label}`}>
        <Icon size={20} />
      </button>
    );
  }

  return (
    <div role="radiogroup" aria-label="theme" className="grid grid-cols-3 gap-1 p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
      {OPTIONS.map(({ mode: m, label, Icon }) => (
        <button key={m} role="radio" aria-checked={mode === m} onClick={() => choose(m)}
          className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
          style={mode === m ? { background: "var(--surface)", color: "var(--brand)", boxShadow: "var(--shadow)" } : { color: "var(--muted)" }}>
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}
