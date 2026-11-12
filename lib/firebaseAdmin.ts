// শুধু লগইনের টোকেন যাচাই (verifyIdToken): projectId ই যথেষ্ট, কোনো service account key লাগে না
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const app = getApps()[0] ?? initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });

export const adminAuth = getAuth(app);
