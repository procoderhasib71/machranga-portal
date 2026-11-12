"use client";
// Shongi Lab অ্যাকাউন্ট (AdMCQ, Money, Pomodoro এর একই Firebase Auth): শুধু লগইনের জন্য, ডাটা সব Turso তে
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const app = getApps().length ? getApp() : initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

export const auth = getAuth(app);

/** ফোন নম্বরের অ্যাকাউন্টের লুকানো ইমেইল (AdMCQ এর মতোই): পাসওয়ার্ড দিয়ে লগইনের জন্য */
export const phoneEmail = (e164: string) => `${e164.replace(/\D/g, "")}@phone.admcq.com`;

/** '01712345678', '+8801712345678', বাংলা অঙ্ক সব চলে; ভুল হলে '' */
export function toE164(raw: string): string {
  const d = raw.replace(/[০-৯]/g, (x) => String("০১২৩৪৫৬৭৮৯".indexOf(x))).replace(/\D/g, "");
  const local = d.startsWith("880") ? d.slice(2) : d;
  return /^01[3-9]\d{8}$/.test(local) ? `+88${local}` : "";
}
