import { describe, expect, it } from "vitest";
import { computePace, dueRules, money2 } from "./sbp";

describe("spending pace", () => {
  it("uses category limits first, then monthly target, then income", () => {
    const base = { monthKey: "2026-11", today: new Date(2026, 10, 15), spent: 0 };
    expect(computePace({ ...base, budgetLimitsTotal: 9000, profileMonthlyBudget: 5000, monthIncome: 1000 }).plan).toBe(9000);
    expect(computePace({ ...base, budgetLimitsTotal: 0, profileMonthlyBudget: 5000, monthIncome: 1000 }).plan).toBe(5000);
    expect(computePace({ ...base, budgetLimitsTotal: 0, profileMonthlyBudget: 0, monthIncome: 1000 }).plan).toBe(1000);
  });
  it("should-be = plan × day / days_in_month and flags ahead of pace", () => {
    const p = computePace({ monthKey: "2026-11", today: new Date(2026, 10, 15), budgetLimitsTotal: 3000, profileMonthlyBudget: 0, monthIncome: 0, spent: 2000 });
    expect(p.shouldBe).toBe(1500);
    expect(p.status).toBe("ahead");
  });
});

describe("recurring engine", () => {
  const today = new Date(2026, 10, 10);
  it("logs active rules whose day has passed and not logged this month", () => {
    const rules = [
      { id: "a", is_active: true, day_of_month: 5, last_logged_date: null },
      { id: "b", is_active: true, day_of_month: 15, last_logged_date: null },
      { id: "c", is_active: true, day_of_month: 1, last_logged_date: "2026-11-01" },
      { id: "d", is_active: false, day_of_month: 1, last_logged_date: null },
      { id: "e", is_active: true, day_of_month: 1, last_logged_date: "2026-10-01" },
    ];
    expect(dueRules(rules, today).map((r) => r.id)).toEqual(["a", "e"]);
  });
});

describe("csv", () => {
  it("exports two decimals", () => expect(money2(12)).toBe("12.00"));
});
