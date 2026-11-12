// বাংলা সংখ্যা, দিন আর সময় দেখানোর ছোট সাহায্যকারী — বটের core/timeutil.py এর ভাই
const BN = "০১২৩৪৫৬৭৮৯";

export function bnDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => BN[Number(d)]);
}

export const DAY_ORDER = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"] as const;
export const DAY_BN: Record<string, string> = {
  SAT: "শনি", SUN: "রবি", MON: "সোম", TUE: "মঙ্গল", WED: "বুধ", THU: "বৃহস্পতি", FRI: "শুক্র",
};
const MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

export function daysBn(days: string): string {
  if (days === "daily") return "প্রতিদিন";
  return days.split(",").map((c) => DAY_BN[c] ?? c).join(", ");
}

function period(hour: number): string {
  if (hour >= 4 && hour < 6) return "ভোর";
  if (hour < 12) return "সকাল";
  if (hour < 15) return "দুপুর";
  if (hour < 18) return "বিকাল";
  if (hour < 20) return "সন্ধ্যা";
  return "রাত";
}

export function humanTime(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  if (!m) return bnDigits(hhmm ?? "");
  const h = Number(m[1]);
  return bnDigits(`${period(h)} ${h % 12 || 12}:${m[2]}`);
}

/** বাংলাদেশ সময়ের "এখন" (সার্ভার যেখানেই থাকুক) */
export function nowBD(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
}

export function todayBD(): string {
  const d = nowBD();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** '2026-11-15' → 'আজ' / 'কাল' / '১৫ নভেম্বর' */
export function humanDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return bnDigits(iso ?? "");
  const today = nowBD();
  today.setHours(0, 0, 0, 0);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "আজ";
  if (diff === 1) return "কাল";
  if (diff === 2) return "পরশু";
  if (diff === -1) return "গতকাল";
  return bnDigits(`${d.getDate()} ${MONTHS[d.getMonth()]}`);
}

const WEEKDAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];   // JS: রবি = 0

/** 'বৃহস্পতিবার, ১২ নভেম্বর' */
export function fullDateBn(d: Date = nowBD()): string {
  return `${WEEKDAYS[d.getDay()]}, ${bnDigits(d.getDate())} ${MONTHS[d.getMonth()]}`;
}

/** সময় অনুযায়ী শুভেচ্ছা */
export function greeting(d: Date = nowBD()): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "সুপ্রভাত";
  if (h >= 12 && h < 16) return "শুভ দুপুর";
  if (h >= 16 && h < 18) return "শুভ বিকেল";
  if (h >= 18 && h < 21) return "শুভ সন্ধ্যা";
  return "শুভ রাত্রি";
}

/** এখনকার 'HH:MM' (বাংলাদেশ সময়) */
export function nowHHMM(d: Date = nowBD()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** '2026-11-10 21:30' → '১০ নভেম্বর রাত ৯:৩০' */
export function humanDateTime(stamp: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(stamp ?? "");
  if (!m) return bnDigits(stamp ?? "");
  const day = humanDate(`${m[1]}-${m[2]}-${m[3]}`);
  const h = Number(m[4]);
  return `${day} ${bnDigits(`${period(h)} ${h % 12 || 12}:${m[5]}`)}`;
}
