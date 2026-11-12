// পোর্টালের রিমাইন্ডার যাচাইয়ের টেস্ট।  চালাতে:  node --test tests/
import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanReminder, ruleOf } from "../lib/reminderEdit.ts";

const NOW = "2026-11-12 21:30";   // বৃহস্পতিবার

test("একবারের: আজকের সামনের সময় ঠিক, পেরোনো সময় না", () => {
  assert.deepEqual(cleanReminder({ task: "ওষুধ খাও", time: "22:00" }, NOW), { ok: true, value: { task: "ওষুধ খাও", trigger_time: "2026-11-12 22:00", rule: "" } });
  assert.equal(cleanReminder({ task: "ওষুধ খাও", time: "20:00" }, NOW).ok, false);
  assert.equal(cleanReminder({ task: "", time: "22:00" }, NOW).ok, false);
});

test("প্রতিদিন: আজকের সময় পেরোলে কাল থেকে", () => {
  const r = cleanReminder({ task: "ঘুম থেকে ওঠো", time: "07:00", repeat: "daily" }, NOW);
  assert.ok(r.ok && r.value.trigger_time === "2026-11-13 07:00" && r.value.rule === "daily");
});

test("নির্দিষ্ট বার: পরের মিলে যাওয়া দিনে, বটের ক্রমে", () => {
  assert.equal(ruleOf("days", ["MON", "SAT"]), "days:SAT,MON");
  assert.equal(ruleOf("days", []), null);
  assert.equal(ruleOf("days", ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"]), "daily");
  const r = cleanReminder({ task: "জিম", time: "18:00", repeat: "days", days: ["SAT", "MON"] }, NOW);
  assert.ok(r.ok && r.value.trigger_time === "2026-11-14 18:00");   // পরের শনিবার
});
