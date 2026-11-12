// লগইনের টোকেন যাচাই (verifyIdToken) আর Pomodoro র টাস্ক (Firestore)।
// App Hosting এ একই Firebase project এ চলে বলে নিজের service account দিয়েই চলে, আলাদা key লাগে না।
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export const adminApp = getApps()[0] ?? initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });

export const adminAuth = getAuth(adminApp);
