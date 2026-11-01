import { describe, it, expect } from "vitest";
import {
  browserTimezone,
  describeExpression,
  expressionToPreset,
  formatHHMM,
  isPlausibleExpression,
  normalizeWeekdays,
  parseHHMM,
  presetToExpression,
  timezoneOptions,
  type SchedulePreset,
} from "../expression";

describe("presetToExpression", () => {
  it("rate: singular unit for 1, plural otherwise", () => {
    expect(presetToExpression({ kind: "rate", value: 1, unit: "hours" })).toBe("rate(1 hour)");
    expect(presetToExpression({ kind: "rate", value: 2, unit: "hours" })).toBe("rate(2 hours)");
    expect(presetToExpression({ kind: "rate", value: 1, unit: "minutes" })).toBe(
      "rate(1 minute)"
    );
    expect(presetToExpression({ kind: "rate", value: 15, unit: "minutes" })).toBe(
      "rate(15 minutes)"
    );
    expect(presetToExpression({ kind: "rate", value: 1, unit: "days" })).toBe("rate(1 day)");
    expect(presetToExpression({ kind: "rate", value: 3, unit: "days" })).toBe("rate(3 days)");
  });

  it("rate: clamps nonsense values to at least 1", () => {
    expect(presetToExpression({ kind: "rate", value: 0, unit: "hours" })).toBe("rate(1 hour)");
    expect(presetToExpression({ kind: "rate", value: 2.7, unit: "hours" })).toBe("rate(2 hours)");
  });

  it("daily → cron(M H * * ? *)", () => {
    expect(presetToExpression({ kind: "daily", hour: 9, minute: 0 })).toBe("cron(0 9 * * ? *)");
    expect(presetToExpression({ kind: "daily", hour: 17, minute: 30 })).toBe(
      "cron(30 17 * * ? *)"
    );
  });

  it("weekly → cron(M H ? * DAYS *) with days ordered MON→SUN and deduped", () => {
    expect(
      presetToExpression({ kind: "weekly", days: ["WED", "MON", "WED"], hour: 9, minute: 0 })
    ).toBe("cron(0 9 ? * MON,WED *)");
    expect(
      presetToExpression({ kind: "weekly", days: ["SUN", "SAT"], hour: 23, minute: 59 })
    ).toBe("cron(59 23 ? * SAT,SUN *)");
  });

  it("custom passes through trimmed", () => {
    expect(presetToExpression({ kind: "custom", expression: "  cron(0 9 ? * MON-FRI *) " })).toBe(
      "cron(0 9 ? * MON-FRI *)"
    );
  });
});

describe("expressionToPreset", () => {
  it("parses rate (singular and plural)", () => {
    expect(expressionToPreset("rate(1 hour)")).toEqual({ kind: "rate", value: 1, unit: "hours" });
    expect(expressionToPreset("rate(2 hours)")).toEqual({
      kind: "rate",
      value: 2,
      unit: "hours",
    });
    expect(expressionToPreset("rate(5 minutes)")).toEqual({
      kind: "rate",
      value: 5,
      unit: "minutes",
    });
    expect(expressionToPreset("rate(1 day)")).toEqual({ kind: "rate", value: 1, unit: "days" });
  });

  it("parses daily and weekly cron shapes", () => {
    expect(expressionToPreset("cron(0 9 * * ? *)")).toEqual({
      kind: "daily",
      hour: 9,
      minute: 0,
    });
    expect(expressionToPreset("cron(30 17 ? * MON,WED *)")).toEqual({
      kind: "weekly",
      days: ["MON", "WED"],
      hour: 17,
      minute: 30,
    });
    // Days come back in canonical order even if stored out of order.
    expect(expressionToPreset("cron(0 9 ? * FRI,MON *)")).toEqual({
      kind: "weekly",
      days: ["MON", "FRI"],
      hour: 9,
      minute: 0,
    });
  });

  it("falls back to custom for anything else", () => {
    for (const e of [
      "cron(0 9 ? * MON-FRI *)",
      "cron(0/15 * * * ? *)",
      "cron(0 9 ? * XYZ *)",
      "cron(0 25 * * ? *)",
      "rate(0 hours)",
      "at(2026-11-05T09:00:00)",
      "garbage",
    ]) {
      expect(expressionToPreset(e)).toEqual({ kind: "custom", expression: e });
    }
  });

  it("round-trips every generated preset shape", () => {
    const presets: SchedulePreset[] = [
      { kind: "rate", value: 1, unit: "minutes" },
      { kind: "rate", value: 10, unit: "minutes" },
      { kind: "rate", value: 1, unit: "hours" },
      { kind: "rate", value: 6, unit: "hours" },
      { kind: "rate", value: 1, unit: "days" },
      { kind: "rate", value: 7, unit: "days" },
      { kind: "daily", hour: 0, minute: 0 },
      { kind: "daily", hour: 23, minute: 59 },
      { kind: "weekly", days: ["MON"], hour: 9, minute: 0 },
      { kind: "weekly", days: ["MON", "WED", "FRI"], hour: 8, minute: 15 },
      { kind: "weekly", days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"], hour: 12, minute: 0 },
      { kind: "custom", expression: "cron(0 9 ? * MON-FRI *)" },
      { kind: "custom", expression: "at(2026-11-05T09:00:00)" },
    ];
    for (const p of presets) {
      const expr = presetToExpression(p);
      expect(expressionToPreset(expr)).toEqual(p);
      // And generating again from the parsed preset is stable.
      expect(presetToExpression(expressionToPreset(expr))).toBe(expr);
    }
  });
});

describe("describeExpression", () => {
  it("describes rates", () => {
    expect(describeExpression("rate(2 hours)", "UTC")).toBe("Every 2 hours");
    expect(describeExpression("rate(1 hour)", "UTC")).toBe("Every hour");
    expect(describeExpression("rate(1 minute)", "UTC")).toBe("Every minute");
    expect(describeExpression("rate(3 days)", "UTC")).toBe("Every 3 days");
  });

  it("describes daily / weekly with the timezone", () => {
    expect(describeExpression("cron(0 9 * * ? *)", "Australia/Melbourne")).toBe(
      "Daily at 09:00 (Australia/Melbourne)"
    );
    expect(describeExpression("cron(0 9 ? * MON,WED *)", "UTC")).toBe(
      "Weekly on Mon, Wed at 09:00 (UTC)"
    );
  });

  it("describes one-off at() expressions", () => {
    expect(describeExpression("at(2026-11-05T09:00:00)", "UTC")).toBe("At 2026-11-05 09:00 (UTC)");
  });

  it("returns the raw expression for anything else and defaults a blank tz to UTC", () => {
    expect(describeExpression("cron(0 9 ? * MON-FRI *)", "UTC")).toBe("cron(0 9 ? * MON-FRI *)");
    expect(describeExpression("cron(0 9 * * ? *)", "")).toBe("Daily at 09:00 (UTC)");
  });
});

describe("isPlausibleExpression", () => {
  it("accepts rate/cron/at wrappers and rejects the rest", () => {
    expect(isPlausibleExpression("rate(2 hours)")).toBe(true);
    expect(isPlausibleExpression("  cron(0 9 * * ? *)  ")).toBe(true);
    expect(isPlausibleExpression("at(2026-11-05T09:00:00)")).toBe(true);
    expect(isPlausibleExpression("")).toBe(false);
    expect(isPlausibleExpression("rate(")).toBe(false);
    expect(isPlausibleExpression("rate()")).toBe(false);
    expect(isPlausibleExpression("every 2 hours")).toBe(false);
    expect(isPlausibleExpression("cron(0 9 * * ? *")).toBe(false);
  });
});

describe("clock + weekday helpers", () => {
  it("parses and formats HH:MM", () => {
    expect(parseHHMM("09:05")).toEqual({ hour: 9, minute: 5 });
    expect(parseHHMM("9:05")).toEqual({ hour: 9, minute: 5 });
    expect(parseHHMM("24:00")).toBeNull();
    expect(parseHHMM("abc")).toBeNull();
    expect(formatHHMM(9, 5)).toBe("09:05");
  });

  it("normalizes weekdays", () => {
    expect(normalizeWeekdays(["SUN", "MON", "SUN"])).toEqual(["MON", "SUN"]);
  });
});

describe("timezone helpers", () => {
  it("browserTimezone returns a non-empty string", () => {
    expect(browserTimezone().length).toBeGreaterThan(0);
  });

  it("timezoneOptions always includes UTC and the browser zone", () => {
    const zones = timezoneOptions();
    expect(zones.length).toBeGreaterThan(0);
    expect(zones).toContain("UTC");
  });
});
