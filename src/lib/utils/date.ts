/**
 * Date formatting helpers used across resource index views.
 *
 * The API returns Unix epoch seconds for `created_at` / `updated_at`.
 * These helpers accept either seconds or milliseconds and normalise.
 */

function toDate(epoch: number | string | null | undefined): Date | null {
  if (epoch == null) return null;
  const n = typeof epoch === "string" ? Number(epoch) : epoch;
  if (!Number.isFinite(n) || n <= 0) return null;
  // Heuristic: anything below 10^12 is seconds, otherwise milliseconds.
  const ms = n < 1e12 ? n * 1000 : n;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

let rtf: Intl.RelativeTimeFormat | null = null;
function getRtf(): Intl.RelativeTimeFormat {
  if (!rtf) rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return rtf;
}

export function formatRelativeTime(
  epoch: number | string | null | undefined
): string {
  const d = toDate(epoch);
  if (!d) return "—";
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const absSec = Math.abs(diffSec);
  if (absSec < 5) return "just now";
  for (const [unit, secondsInUnit] of UNITS) {
    if (absSec >= secondsInUnit || unit === "second") {
      const value = Math.round(diffSec / secondsInUnit);
      return getRtf().format(value, unit);
    }
  }
  return "—";
}

let dtf: Intl.DateTimeFormat | null = null;
function getDtf(): Intl.DateTimeFormat {
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  return dtf;
}

export function formatDateTime(
  epoch: number | string | null | undefined
): string {
  const d = toDate(epoch);
  if (!d) return "—";
  return getDtf().format(d);
}
