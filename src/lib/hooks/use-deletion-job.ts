"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearStoredDeletionJob,
  readStoredDeletionJob,
  writeStoredDeletionJob,
  type StoredDeletionJob,
} from "@/lib/jobs/deletion-job-storage";

/**
 * Tracks the in-flight org/account deletion job for a page. Persists
 * `{jobId, kind, label}` in sessionStorage so a reload resumes polling
 * (read on mount in an effect to avoid SSR/hydration mismatches).
 */
export function useDeletionJob() {
  const [job, setJob] = useState<StoredDeletionJob | null>(null);

  useEffect(() => {
    const stored = readStoredDeletionJob();
    // Defer the state update out of the effect body (react-hooks lint).
    if (stored) queueMicrotask(() => setJob(stored));
  }, []);

  const start = useCallback((next: StoredDeletionJob) => {
    writeStoredDeletionJob(next);
    setJob(next);
  }, []);

  const clear = useCallback(() => {
    clearStoredDeletionJob();
    setJob(null);
  }, []);

  return { job, start, clear };
}
