// সাপ্তাহিক রুটিনের তৈরি টেমপ্লেট: একটা বেছে নিয়ে নিজের মতো বদলালেই হয়। বাংলাদেশের সপ্তাহ (শুক্রবার আলাদা)।
import { DAY_CODES } from "./routineEdit.ts";

export type TemplateBlock = { title: string; days: string; start: string; end?: string };
export type Template = { id: string; name: string; emoji: string; desc: string; blocks: TemplateBlock[] };

const WORK = "SAT,SUN,MON,TUE,WED,THU";   // শনি–বৃহস্পতি
const OFFICE = "SUN,MON,TUE,WED,THU";     // রবি–বৃহস্পতি

export const TEMPLATES: Template[] = [
  {
    id: "medical", name: "মেডিকেল শিক্ষার্থী", emoji: "🩺", desc: "কলেজ-ওয়ার্ড, বিকালে লেকচার রিভিউ, রাতে ৩ ঘণ্টা পড়া, শুক্রবার রিভিশন",
    blocks: [
      { title: "ফজর ও কুরআন", days: "daily", start: "05:15", end: "05:45" },
      { title: "নাস্তা ও প্রস্তুতি", days: WORK, start: "07:00", end: "07:45" },
      { title: "কলেজ ও ওয়ার্ড", days: WORK, start: "08:00", end: "14:00" },
      { title: "খাওয়া, নামাজ ও বিশ্রাম", days: "daily", start: "14:00", end: "15:30" },
      { title: "লেকচার রিভিউ", days: WORK, start: "16:00", end: "17:30" },
      { title: "সপ্তাহের রিভিশন", days: "FRI", start: "10:00", end: "12:00" },
      { title: "রাতের পড়া", days: "daily", start: "20:00", end: "23:00" },
      { title: "ঘুম", days: "daily", start: "23:30" },
    ],
  },
  {
    id: "exam", name: "পরীক্ষার প্রস্তুতি", emoji: "📚", desc: "সকাল-বিকাল নতুন পড়া, মাঝে প্রশ্ন অনুশীলন, রাতে রিভিশন, শুক্রবার পুরো সপ্তাহ",
    blocks: [
      { title: "ফজর ও হালকা হাঁটা", days: "daily", start: "05:30", end: "06:00" },
      { title: "সকালের পড়া (নতুন টপিক)", days: "daily", start: "06:30", end: "09:30" },
      { title: "MCQ ও প্রশ্ন অনুশীলন", days: "daily", start: "10:00", end: "12:00" },
      { title: "খাওয়া ও বিশ্রাম", days: "daily", start: "13:00", end: "14:30" },
      { title: "বিকালের পড়া", days: WORK, start: "15:00", end: "18:00" },
      { title: "পুরো সপ্তাহের রিভিশন", days: "FRI", start: "15:00", end: "18:00" },
      { title: "আজকের পড়ার রিভিশন", days: "daily", start: "20:00", end: "22:00" },
      { title: "ঘুম", days: "daily", start: "23:00" },
    ],
  },
  {
    id: "job", name: "চাকরিজীবী", emoji: "💼", desc: "অফিসের আগে ব্যায়াম, রাতে এক ঘণ্টা নিজের পড়া/কাজ, শুক্র-শনি ঘরের কাজ",
    blocks: [
      { title: "ব্যায়াম বা হাঁটা", days: "daily", start: "06:00", end: "06:30" },
      { title: "অফিস", days: OFFICE, start: "09:00", end: "17:30" },
      { title: "পরিবার ও বিশ্রাম", days: OFFICE, start: "19:00", end: "20:30" },
      { title: "বাজার ও ঘরের কাজ", days: "FRI,SAT", start: "10:00", end: "12:00" },
      { title: "পড়া বা নিজের কাজ", days: "daily", start: "21:00", end: "22:00" },
      { title: "ঘুম", days: "daily", start: "23:00" },
    ],
  },
  {
    id: "light", name: "হালকা রুটিন", emoji: "🌿", desc: "শুধু ওঠা, খাওয়া আর ঘুমের সময় ঠিক রাখা",
    blocks: [
      { title: "ঘুম থেকে ওঠা", days: "daily", start: "06:30" },
      { title: "দুপুরের খাবার", days: "daily", start: "13:30" },
      { title: "রাতের খাবার", days: "daily", start: "21:00" },
      { title: "ঘুম", days: "daily", start: "23:00" },
    ],
  },
];

const norm = (t: string) => t.toLowerCase().replace(/[\s\p{P}]+/gu, "");

/** টেমপ্লেট বসানো: replace হলে আগের সাপ্তাহিক সব বাদ; add হলে একই বার+সময়+কাজ আগে থাকলে সেটা বাদ দিয়ে বাকিগুলো */
export function templateRows(t: Template, existing: { days: string; start_time: string; title: string }[], mode: "replace" | "add"): TemplateBlock[] {
  if (mode === "replace") return t.blocks;
  return t.blocks.filter((b) => !existing.some((e) => e.days === b.days && e.start_time === b.start && norm(e.title) === norm(b.title)));
}

export const validDays = (d: string) => d === "daily" || d.split(",").every((c) => DAY_CODES.includes(c));
