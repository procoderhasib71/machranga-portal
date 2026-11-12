// কোন রুটিন ব্লক Pomodoro তে যাবে, তার টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { autoFocus, isFocus } from "../lib/focus.ts";

test("পড়ার ব্লক হ্যাঁ, দৈনন্দিন কাজ না (আসল রুটিনের নাম দিয়ে)", () => {
  for (const t of ["রাতের পড়া", "লেকচার রিভিউ", "ফিজিক্স: ভেক্টর", "কেমিস্ট্রি: জৈব যৌগ", "ইংরেজি শব্দ মুখস্থ", "MCQ ও প্রশ্ন অনুশীলন",
    "বায়োলজি টিচিং ও লেকচার প্রস্তুতি (অথবা ট্রাভেল)", "Anatomy study", "Cardiovascular: Heart Failure"]) assert.equal(autoFocus(t), true, t);
  for (const t of ["ঘুম", "ফজর ও কুরআন", "দুপুরের খাবার, নামাজ ও পাওয়ার ন্যাপ", "মেডিকেল কলেজ ও ওয়ার্ড ডিউটি",
    "ফ্রেশ হওয়া, নাস্তা ও দিনের টপ ৩টি কাজ ঠিক করা", "নামাজ, নাস্তা ও বিশ্রাম", "অফিস", "ব্যায়াম বা হাঁটা"]) assert.equal(autoFocus(t), false, t);
});

test("তারিখের পরিকল্পনা সবসময় হ্যাঁ; ইউজারের বাছাই সবার আগে", () => {
  assert.equal(isFocus({ title: "দিন ৩", date: "2026-11-14" }), true);
  assert.equal(isFocus({ title: "ঘুম", focus: 1 }), true);
  assert.equal(isFocus({ title: "রাতের পড়া", focus: 0 }), false);
  assert.equal(isFocus({ title: "রাতের পড়া", focus: null }), true);
});
