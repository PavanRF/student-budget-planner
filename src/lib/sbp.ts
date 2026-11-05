export const EXPENSE_CATEGORIES = [
  { name: "Food", icon: "ri-restaurant-2-line" },
  { name: "Transportation", icon: "ri-bus-2-line" },
  { name: "Education", icon: "ri-book-open-line" },
  { name: "Shopping", icon: "ri-shopping-bag-3-line" },
  { name: "Entertainment", icon: "ri-film-line" },
  { name: "Accommodation", icon: "ri-home-4-line" },
  { name: "Health", icon: "ri-heart-pulse-line" },
  { name: "Other", icon: "ri-more-2-line" },
] as const;

export const INCOME_SOURCES = [
  { name: "Pocket money", icon: "ri-wallet-3-line" },
  { name: "Scholarship", icon: "ri-award-line" },
  { name: "Part-time job", icon: "ri-briefcase-line" },
  { name: "Freelancing", icon: "ri-macbook-line" },
  { name: "Other income", icon: "ri-add-circle-line" },
] as const;

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "AED"] as const;

export function iconFor(name: string): string {
  return (
    EXPENSE_CATEGORIES.find((c) => c.name === name)?.icon ??
    INCOME_SOURCES.find((c) => c.name === name)?.icon ??
    "ri-more-2-line"
  );
}

const fmtCache = new Map<string, Intl.NumberFormat>();
export function formatMoney(value: number, currency = "INR"): string {
  let f = fmtCache.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    fmtCache.set(currency, f);
  }
  return f.format(Math.round(value || 0));
}

/** Local YYYY-MM-DD */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function todayISO() {
  return toISODate(new Date());
}
/** "YYYY-MM" key */
export function monthKey(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 7);
  return toISODate(d).slice(0, 7);
}
export function currentMonthKey() {
  return monthKey(new Date());
}
export function monthStart(key: string) {
  return `${key}-01`;
}
export function shiftMonth(key: string, delta: number): string {
  const [y = 0, m = 1] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}
export function daysInMonth(key: string) {
  const [y = 0, m = 1] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
export function monthLabel(key: string, style: "long" | "short" = "long") {
  const [y = 0, m = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: style,
    year: "numeric",
  });
}
export function lastMonths(n: number, from = currentMonthKey()): string[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(from, -i));
}
export function formatDate(iso: string) {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function greeting(h = new Date().getHours()) {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function sum<T>(rows: T[], f: (r: T) => number) {
  return rows.reduce((a, r) => a + (Number(f(r)) || 0), 0);
}

// ---------- Spending pace ----------
export type PaceInput = {
  monthKey: string;
  today: Date;
  budgetLimitsTotal: number;
  profileMonthlyBudget: number;
  monthIncome: number;
  spent: number;
};
export function computePace(i: PaceInput) {
  const days = daysInMonth(i.monthKey);
  const isCurrent = monthKey(i.today) === i.monthKey;
  const day = isCurrent ? i.today.getDate() : days;
  const plan =
    i.budgetLimitsTotal > 0
      ? i.budgetLimitsTotal
      : i.profileMonthlyBudget > 0
        ? i.profileMonthlyBudget
        : i.monthIncome;
  const planSource =
    i.budgetLimitsTotal > 0 ? "category limits" : i.profileMonthlyBudget > 0 ? "monthly target" : i.monthIncome > 0 ? "this month's income" : "none";
  const elapsed = day / days;
  const shouldBe = plan * elapsed;
  const diff = i.spent - shouldBe; // >0 ahead (overspending)
  const remainingDays = Math.max(days - day, 0);
  const left = plan - i.spent;
  const perDay = remainingDays > 0 ? left / remainingDays : left;
  const tolerance = Math.max(plan * 0.01, 1);
  const status: "under" | "ahead" | "on" = diff > tolerance ? "ahead" : diff < -tolerance ? "under" : "on";
  return { day, days, plan, planSource, elapsed, shouldBe, diff, remainingDays, left, perDay, status };
}

// ---------- CSV ----------
function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCSV(headers: string[], rows: (string | number | null | undefined)[][]) {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}
export function money2(n: number) {
  return (Number(n) || 0).toFixed(2);
}
export function downloadFile(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Recurring ----------
export type RecurringRuleLite = {
  id: string;
  is_active: boolean;
  day_of_month: number;
  last_logged_date: string | null;
};
/** Rules that should be logged now for the given date. */
export function dueRules<T extends RecurringRuleLite>(rules: T[], today: Date): T[] {
  const mk = monthKey(today);
  const dim = daysInMonth(mk);
  return rules.filter((r) => {
    if (!r.is_active) return false;
    const effectiveDay = Math.min(r.day_of_month, dim);
    if (effectiveDay > today.getDate()) return false;
    return !r.last_logged_date || monthKey(r.last_logged_date) !== mk;
  });
}
export function ruleDate(day: number, today: Date) {
  const mk = monthKey(today);
  return `${mk}-${String(Math.min(day, daysInMonth(mk))).padStart(2, "0")}`;
}
