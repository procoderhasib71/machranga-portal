"use client";
// app হিসেবে রাখা: Android/Chrome এ সরাসরি install, iPhone/iPad এ Safari এর Share → "Add to Home Screen" দেখিয়ে দিই।
// install করা থাকলে (standalone) বা আগে "পরে" বললে কিছু দেখায় না।
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const HIDE_KEY = "install-hidden-until";

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

function hiddenNow(): boolean {
  try { return Number(localStorage.getItem(HIDE_KEY) || 0) > Date.now(); } catch { return false; }
}

export default function InstallApp({ variant = "card" }: { variant?: "card" | "row" }) {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);
  const [howTo, setHowTo] = useState(false);

  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone || (variant === "card" && hiddenNow())) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as PromptEvent); setShow(true); };
    const onInstalled = () => setShow(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (isIos) { setIos(true); setShow(true); }
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, [variant]);

  if (!show) return null;

  const install = async () => {
    if (ios) return setHowTo(true);
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setPrompt(null);
  };
  const later = () => {
    try { localStorage.setItem(HIDE_KEY, String(Date.now() + 14 * 86400000)); } catch {}
    setShow(false);
  };

  const steps = howTo && (
    <p className="text-sm mt-3 rounded-xl p-3 leading-relaxed" style={{ background: "var(--surface-2)" }}>
      Safari তে নিচের (iPad এ উপরের) <Share size={14} className="inline -mt-1" /> <b>Share</b> বোতাম চাপো →
      নিচে নেমে <b>&ldquo;Add to Home Screen&rdquo;</b> → <b>Add</b>। এরপর হোম স্ক্রিনের মাছরাঙা আইকন থেকে খুলবে।
    </p>
  );

  if (variant === "row") {
    return (
      <div className="pt-3.5 mt-4 border-t" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-medium text-[15px]">ফোনে app হিসেবে রাখো</div>
            <div className="text-xs muted mt-0.5">হোম স্ক্রিনের আইকন থেকে আলাদা app এর মতো খুলবে</div>
          </div>
          <button type="button" onClick={install} className="btn-outline py-2 shrink-0"><Download size={16} /> রাখো</button>
        </div>
        {steps}
      </div>
    );
  }
  return (
    <div className="card card-pad rise flex gap-4 items-start" style={{ background: "linear-gradient(120deg, var(--brand-soft), var(--surface) 75%)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" className="size-12 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">মাছরাঙা ফোনে app হিসেবে রাখো</p>
        <p className="text-sm muted mt-0.5">হোম স্ক্রিন থেকে এক চাপে খুলবে, আর লগইন করা থাকবে।</p>
        <div className="flex items-center gap-2 mt-3">
          <button type="button" onClick={install} className="btn-primary py-2"><Download size={16} /> {ios ? "কীভাবে রাখব" : "app হিসেবে রাখো"}</button>
          <button type="button" onClick={later} className="btn-ghost text-sm rounded-lg px-3">পরে</button>
        </div>
        {steps}
      </div>
      <button type="button" onClick={later} className="btn-ghost rounded-full -mt-1 -mr-1" aria-label="বন্ধ করো"><X size={18} /></button>
    </div>
  );
}
