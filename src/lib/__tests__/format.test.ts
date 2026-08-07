import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats whole rupees with Indian grouping", () => {
    expect(formatCurrency(5000)).toBe("₹5,000");
    expect(formatCurrency(1234567)).toBe("₹12,34,567");
  });

  it("rounds to whole units (no decimals)", () => {
    expect(formatCurrency(99.5)).toBe("₹100");
    expect(formatCurrency(99.4)).toBe("₹99");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("₹0");
  });

  it("honors a currency override", () => {
    expect(formatCurrency(100, "USD")).toBe("$100");
  });
});

describe("formatDate", () => {
  it("formats a Date as en-IN medium", () => {
    expect(formatDate(new Date("2026-08-06T12:00:00"))).toBe("6 Aug 2026");
  });

  it("accepts an ISO string", () => {
    expect(formatDate("2026-08-06T12:00:00")).toBe("6 Aug 2026");
  });
});

describe("daysUntil", () => {
  const midday = (offsetDays: number) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    return d;
  };

  it("returns 0 for today", () => {
    expect(daysUntil(midday(0))).toBe(0);
  });

  it("returns a positive count for future dates", () => {
    expect(daysUntil(midday(3))).toBe(3);
  });

  it("returns a negative count for past dates", () => {
    expect(daysUntil(midday(-2))).toBe(-2);
  });
});
