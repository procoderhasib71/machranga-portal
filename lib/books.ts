// নতুন পরিকল্পনায় স্তর (SSC/HSC/Medical) আর বিষয় বাছলে অধ্যায়ের তালিকা নিজে বসে (পরে যোগ-বাদ করা যায়)।
// তালিকা data/books/*.json ফাইলে; নতুন বিষয় বা অধ্যায় যোগ করতে শুধু সেই ফাইল বদলালেই হয়।
import ssc from "../data/books/ssc.json";
import hsc from "../data/books/hsc.json";
import medical from "../data/books/medical.json";

export type Level = "SSC" | "HSC" | "Medical";
type Row = { id: string; group: string; name: string; subject: string; chapters: string[] };
export type Book = Row & { level: Level };

export const LEVELS: { key: Level; label: string }[] = [
  { key: "SSC", label: "SSC" },
  { key: "HSC", label: "HSC" },
  { key: "Medical", label: "Medical" },
];
export const GROUPS = ["সাধারণ", "বিজ্ঞান", "মানবিক", "ব্যবসায় শিক্ষা", "MBBS"];

const tag = (rows: Row[], level: Level): Book[] => rows.map((r) => ({ ...r, level }));
export const BOOKS: Book[] = [...tag(ssc, "SSC"), ...tag(hsc, "HSC"), ...tag(medical, "Medical")];
