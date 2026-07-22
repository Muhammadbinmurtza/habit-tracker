import { describe, it, expect } from "vitest";
import {
  todayLocal,
  formatLocal,
  addDays,
  daysBetween,
  currentStreak,
  longestStreak,
} from "./streaks";

describe("formatLocal", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const d = new Date(2024, 0, 15);
    expect(formatLocal(d)).toBe("2024-01-15");
  });

  it("pads single-digit month and day", () => {
    const d = new Date(2024, 2, 5);
    expect(formatLocal(d)).toBe("2024-03-05");
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    expect(addDays("2024-01-01", 5)).toBe("2024-01-06");
  });

  it("adds negative days", () => {
    expect(addDays("2024-01-10", -3)).toBe("2024-01-07");
  });

  it("crosses month boundaries", () => {
    expect(addDays("2024-01-30", 3)).toBe("2024-02-02");
  });
});

describe("daysBetween", () => {
  it("returns 0 for same day", () => {
    expect(daysBetween("2024-01-01", "2024-01-01")).toBe(0);
  });

  it("returns correct difference", () => {
    expect(daysBetween("2024-01-01", "2024-01-10")).toBe(9);
  });
});

describe("currentStreak", () => {
  it("returns 0 when no dates", () => {
    expect(currentStreak(new Set(), "2024-01-05")).toBe(0);
  });

  it("counts consecutive days ending at today", () => {
    const dates = new Set(["2024-01-03", "2024-01-04", "2024-01-05"]);
    expect(currentStreak(dates, "2024-01-05")).toBe(3);
  });

  it("uses yesterday if today is missing", () => {
    const dates = new Set(["2024-01-03", "2024-01-04"]);
    expect(currentStreak(dates, "2024-01-05")).toBe(2);
  });

  it("stops at gaps", () => {
    const dates = new Set(["2024-01-03", "2024-01-05"]);
    expect(currentStreak(dates, "2024-01-05")).toBe(1);
  });
});

describe("longestStreak", () => {
  it("returns 0 for empty set", () => {
    expect(longestStreak(new Set())).toBe(0);
  });

  it("finds longest consecutive run", () => {
    const dates = new Set([
      "2024-01-01", "2024-01-02", "2024-01-03",
      "2024-01-05", "2024-01-06",
    ]);
    expect(longestStreak(dates)).toBe(3);
  });
});
