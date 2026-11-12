import { bnDigits } from "./bn";

export function metricBn(metric: string): string {
  return ({ bp: "প্রেশার", sugar: "সুগার", weight: "ওজন", sleep: "ঘুম", water: "পানি", symptom: "উপসর্গ" } as Record<string, string>)[metric] ?? metric;
}

export function valueText(metric: string, valueJson: string, unit: string | null): string {
  try {
    const v = JSON.parse(valueJson);
    if (metric === "bp") return bnDigits(`${v.sys}/${v.dia}`);
    if (metric === "symptom") return v.text ?? "";
    return bnDigits(`${v.value}${unit ? ` ${unit}` : ""}`);
  } catch {
    return valueJson;
  }
}

/** চার্টের জন্য: value_json → সংখ্যা (bp হলে sys আর dia আলাদা) */
export function numericValue(valueJson: string, key: "value" | "sys" | "dia" = "value"): number | null {
  try {
    const v = JSON.parse(valueJson);
    const n = Number(v[key]);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
