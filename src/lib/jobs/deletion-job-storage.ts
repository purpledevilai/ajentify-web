import type { DeletionProgress } from "@/types/api";

export type DeletionKind = DeletionProgress["kind"];

export interface StoredDeletionJob {
  jobId: string;
  kind: DeletionKind;
  /** Display name (org name or account email) for the progress header. */
  label?: string;
}

export const DELETION_JOB_STORAGE_KEY = "ajentify.deletion-job";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Reads the in-flight deletion job so a reload can resume polling. */
export function readStoredDeletionJob(): StoredDeletionJob | null {
  const s = storage();
  if (!s) return null;
  const raw = s.getItem(DELETION_JOB_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDeletionJob>;
    if (
      typeof parsed.jobId === "string" &&
      (parsed.kind === "organization" || parsed.kind === "user")
    ) {
      return {
        jobId: parsed.jobId,
        kind: parsed.kind,
        label: typeof parsed.label === "string" ? parsed.label : undefined,
      };
    }
  } catch {
    // corrupt entry — drop it
  }
  s.removeItem(DELETION_JOB_STORAGE_KEY);
  return null;
}

export function writeStoredDeletionJob(job: StoredDeletionJob): void {
  storage()?.setItem(DELETION_JOB_STORAGE_KEY, JSON.stringify(job));
}

export function clearStoredDeletionJob(): void {
  storage()?.removeItem(DELETION_JOB_STORAGE_KEY);
}
