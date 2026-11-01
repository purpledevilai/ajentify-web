/**
 * Pure helpers for the agent-schedule frequency picker.
 *
 * The API stores EventBridge Scheduler expressions verbatim
 * (`rate(...)`, `cron(...)`, `at(...)`). The dialog edits a small set of
 * presets which map 1:1 onto a generated expression; anything we cannot
 * parse back is shown/edited as "custom" raw text (the server validates).
 */

export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export const WEEKDAYS: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export type RateUnit = "minutes" | "hours" | "days";

export const RATE_UNITS: RateUnit[] = ["minutes", "hours", "days"];

export type SchedulePreset =
  | { kind: "rate"; value: number; unit: RateUnit }
  | { kind: "daily"; hour: number; minute: number }
  | { kind: "weekly"; days: Weekday[]; hour: number; minute: number }
  | { kind: "custom"; expression: string };

const WEEKDAY_LABEL: Record<Weekday, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

function isWeekday(s: string): s is Weekday {
  return (WEEKDAYS as string[]).includes(s);
}

/** Dedupe + order days MON→SUN so the generated cron is deterministic. */
export function normalizeWeekdays(days: Weekday[]): Weekday[] {
  return WEEKDAYS.filter((d) => days.includes(d));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatHHMM(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** "09:30" → { hour: 9, minute: 30 }; null when malformed. */
export function parseHHMM(s: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function presetToExpression(p: SchedulePreset): string {
  switch (p.kind) {
    case "rate": {
      const value = Math.max(1, Math.floor(p.value));
      // EventBridge wants the singular unit for 1 ("1 hour"), plural otherwise.
      const unit = value === 1 ? p.unit.slice(0, -1) : p.unit;
      return `rate(${value} ${unit})`;
    }
    case "daily":
      return `cron(${p.minute} ${p.hour} * * ? *)`;
    case "weekly": {
      const days = normalizeWeekdays(p.days);
      return `cron(${p.minute} ${p.hour} ? * ${days.join(",")} *)`;
    }
    case "custom":
      return p.expression.trim();
  }
}

const RATE_RE = /^rate\(\s*(\d+)\s+(minute|minutes|hour|hours|day|days)\s*\)$/;
const DAILY_RE = /^cron\(\s*(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\?\s+\*\s*\)$/;
const WEEKLY_RE = /^cron\(\s*(\d{1,2})\s+(\d{1,2})\s+\?\s+\*\s+([A-Z]{3}(?:,[A-Z]{3})*)\s+\*\s*\)$/;
const AT_RE = /^at\(\s*(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?\s*\)$/;

function validClock(hour: number, minute: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/**
 * Parse the three generated shapes back into a preset; anything else is
 * returned as `custom` so the dialog can still edit it as raw text.
 */
export function expressionToPreset(expr: string): SchedulePreset {
  const e = expr.trim();

  const rate = RATE_RE.exec(e);
  if (rate) {
    const value = Number(rate[1]);
    const raw = rate[2];
    const unit = (raw.endsWith("s") ? raw : `${raw}s`) as RateUnit;
    if (value >= 1) return { kind: "rate", value, unit };
  }

  const daily = DAILY_RE.exec(e);
  if (daily) {
    const minute = Number(daily[1]);
    const hour = Number(daily[2]);
    if (validClock(hour, minute)) return { kind: "daily", hour, minute };
  }

  const weekly = WEEKLY_RE.exec(e);
  if (weekly) {
    const minute = Number(weekly[1]);
    const hour = Number(weekly[2]);
    const tokens = weekly[3].split(",");
    if (validClock(hour, minute) && tokens.every(isWeekday)) {
      return {
        kind: "weekly",
        days: normalizeWeekdays(tokens as Weekday[]),
        hour,
        minute,
      };
    }
  }

  return { kind: "custom", expression: e };
}

/** Human-readable summary, e.g. "Daily at 09:00 (Australia/Melbourne)". */
export function describeExpression(expr: string, timezone: string): string {
  const e = expr.trim();
  const tz = timezone || "UTC";
  const preset = expressionToPreset(e);

  switch (preset.kind) {
    case "rate": {
      const singular = preset.unit.slice(0, -1);
      return preset.value === 1
        ? `Every ${singular}`
        : `Every ${preset.value} ${preset.unit}`;
    }
    case "daily":
      return `Daily at ${formatHHMM(preset.hour, preset.minute)} (${tz})`;
    case "weekly": {
      const days = preset.days.map((d) => WEEKDAY_LABEL[d]).join(", ");
      return `Weekly on ${days} at ${formatHHMM(preset.hour, preset.minute)} (${tz})`;
    }
    case "custom": {
      const at = AT_RE.exec(e);
      if (at) return `At ${at[1]} ${at[2]} (${tz})`;
      return e;
    }
  }
}

/** Cheap client-side sanity check; the server does the real validation. */
export function isPlausibleExpression(expr: string): boolean {
  const e = expr.trim();
  if (!e.endsWith(")")) return false;
  return ["rate(", "cron(", "at("].some((p) => e.startsWith(p) && e.length > p.length + 1);
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Perth",
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];

/** IANA zone list for the picker; falls back to a short list where
 *  `Intl.supportedValuesOf` is unavailable (older runtimes, jsdom). */
export function timezoneOptions(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  try {
    if (typeof intl.supportedValuesOf === "function") {
      const zones = intl.supportedValuesOf("timeZone");
      if (Array.isArray(zones) && zones.length > 0) {
        return zones.includes("UTC") ? zones : ["UTC", ...zones];
      }
    }
  } catch {
    // fall through to the static list
  }
  return [...FALLBACK_TIMEZONES];
}
