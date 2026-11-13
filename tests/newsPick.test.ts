import assert from "node:assert/strict";
import { test } from "node:test";
import { dedupe, pickStored, type Row } from "../lib/newsPick.ts";

const row = (title: string, source: string, n: number): Row => ({ title, source, url: `https://x.example/${n}`, published_at: "2026-11-13 02:30:00" });

test("একই ঘটনার খবর একটাই", () => {
  const d = dedupe([{ title: "প্রধানমন্ত্রী আজ ঢাকায় পৌঁছেছেন" }, { title: "প্রধানমন্ত্রী আজ ঢাকায় পৌঁছেছেন বিকেলে" }, { title: "সম্পূর্ণ আলাদা খবর এটা" }]);
  assert.equal(d.length, 2);
});

test("প্রতি পত্রিকা থেকে সীমিত, টপিক ফিল্টার, সময় ISO", () => {
  const rows = Array.from({ length: 6 }, (_, k) => row(`আলাদা শিরোনাম নম্বর${k} বিষয়${k}`, "প্রথম আলো", k)).concat([row("খেলার বড় খবর আজ", "সমকাল", 9)]);
  assert.equal(pickStored(rows, "", 24, 3).filter((r) => r.source === "প্রথম আলো").length, 3);
  const sports = pickStored(rows, "খেলা");
  assert.equal(sports.length, 1);
  assert.equal(sports[0].at, "2026-11-13T02:30:00Z");
  assert.ok(Date.parse(sports[0].at) > 0);
});
