/**
 * Pure helpers for the `/app/chat` page. Kept free of React so they can be
 * unit-tested directly.
 */

/** Longest `?add_message=` payload we will auto-send. */
export const ADD_MESSAGE_MAX_CHARS = 2000;

export const ADD_MESSAGE_PARAM = "add_message";

export interface AddMessageParam {
  /** The decoded message, when present and within the size cap. */
  text?: string;
  /** True when a message was present but exceeded {@link ADD_MESSAGE_MAX_CHARS}. */
  tooLong?: boolean;
  /** `pathname` + the remaining query with `add_message` removed. */
  strippedUrl: string;
}

/**
 * Read (and conceptually consume) the `?add_message=<text>` deep-link param.
 * `URLSearchParams` already percent-decodes the value, so no extra
 * `decodeURIComponent` pass is applied (it would corrupt literal `%`).
 */
export function consumeAddMessageParam(
  pathname: string,
  search: string
): AddMessageParam {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const raw = params.get(ADD_MESSAGE_PARAM);
  params.delete(ADD_MESSAGE_PARAM);
  const rest = params.toString();
  const strippedUrl = rest ? `${pathname}?${rest}` : pathname;

  if (raw === null) return { strippedUrl };
  const text = raw.trim();
  if (!text) return { strippedUrl };
  if (text.length > ADD_MESSAGE_MAX_CHARS) return { strippedUrl, tooLong: true };
  return { text, strippedUrl };
}

// ---------------------------------------------------------------------------
// History grouping
// ---------------------------------------------------------------------------

export type HistoryGroupLabel = "Today" | "Yesterday" | "Previous 7 days" | "Older";

export const HISTORY_GROUP_ORDER: HistoryGroupLabel[] = [
  "Today",
  "Yesterday",
  "Previous 7 days",
  "Older",
];

export interface HistoryGroup<T> {
  label: HistoryGroupLabel;
  items: T[];
}

/** Accepts unix seconds or milliseconds (same heuristic as `lib/utils/date`). */
export function epochToMs(epoch: number): number {
  return epoch < 1e12 ? epoch * 1000 : epoch;
}

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function historyGroupFor(updatedAt: number, now: number): HistoryGroupLabel {
  const today = startOfLocalDay(now);
  const ts = epochToMs(updatedAt);
  if (ts >= today) return "Today";
  if (ts >= today - DAY_MS) return "Yesterday";
  if (ts >= today - 7 * DAY_MS) return "Previous 7 days";
  return "Older";
}

/**
 * Bucket history rows by `updated_at`, newest first inside each bucket.
 * Empty buckets are omitted; bucket order is fixed (Today → Older).
 */
export function groupHistoryByDate<T extends { updated_at: number }>(
  items: readonly T[],
  now: number = Date.now()
): HistoryGroup<T>[] {
  const buckets = new Map<HistoryGroupLabel, T[]>();
  for (const item of items) {
    const label = historyGroupFor(item.updated_at, now);
    const list = buckets.get(label);
    if (list) list.push(item);
    else buckets.set(label, [item]);
  }
  return HISTORY_GROUP_ORDER.flatMap((label) => {
    const list = buckets.get(label);
    if (!list) return [];
    list.sort((a, b) => epochToMs(b.updated_at) - epochToMs(a.updated_at));
    return [{ label, items: list }];
  });
}

// ---------------------------------------------------------------------------
// Agent preference
// ---------------------------------------------------------------------------

/** localStorage key remembering the last agent used on the chat page, per org. */
export function lastAgentStorageKey(orgId: string): string {
  return `ajentify.chat-page.agent:${orgId}`;
}

export function readLastAgentId(orgId: string | null): string | null {
  if (!orgId || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(lastAgentStorageKey(orgId));
  } catch {
    return null;
  }
}

export function writeLastAgentId(orgId: string | null, agentId: string): void {
  if (!orgId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(lastAgentStorageKey(orgId), agentId);
  } catch {
    /* storage disabled — remembering is best-effort */
  }
}

/**
 * Pick the agent to preselect: the remembered one if it is still available,
 * else the first in the list.
 */
export function resolveInitialAgentId<T extends { agent_id: string }>(
  agents: readonly T[],
  remembered: string | null
): string | null {
  if (agents.length === 0) return null;
  if (remembered && agents.some((a) => a.agent_id === remembered)) return remembered;
  return agents[0].agent_id;
}
