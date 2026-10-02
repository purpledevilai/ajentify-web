"use client";

import { useEffect, useState } from "react";
import { jobsApi } from "@/lib/api/jobs";
import { ApiError, getErrorMessage } from "@/lib/api/errors";
import type { ApiJob, JobStatus } from "@/types/api";

export const JOB_POLL_INTERVAL_MS = 2000;

export interface UseJobPollResult {
  job: ApiJob | null;
  /** True from the first fetch until the job reaches a terminal status (or a fatal fetch error). */
  isPolling: boolean;
  /** Last fetch error, if any. Cleared on the next successful poll. */
  error: string | null;
}

export function isTerminalJobStatus(status: JobStatus | undefined): boolean {
  return status === "completed" || status === "error";
}

interface PollState extends UseJobPollResult {
  /** The job id this state belongs to, so a changed `jobId` resets it during render. */
  jobId: string | null;
}

function initialState(jobId: string | null): PollState {
  return { jobId, job: null, isPolling: !!jobId, error: null };
}

/**
 * Polls `GET /job/{job_id}` every `intervalMs` until the job is `completed`
 * or `error`, or the component unmounts / `jobId` changes.
 *
 * Fetch failures: 4xx responses (401 after a failed refresh, 403, 404 for
 * someone else's job) are fatal and stop polling; anything else (network
 * blip, 5xx) is surfaced via `error` and polling continues.
 */
export function useJobPoll(
  jobId: string | null | undefined,
  intervalMs: number = JOB_POLL_INTERVAL_MS
): UseJobPollResult {
  const id = jobId ?? null;
  const [state, setState] = useState<PollState>(() => initialState(id));

  // Reset when the job changes (state adjustment during render, not in an effect).
  if (state.jobId !== id) {
    setState(initialState(id));
  }

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const update = (patch: Partial<UseJobPollResult>) => {
      if (cancelled) return;
      setState((prev) => (prev.jobId === id ? { ...prev, ...patch } : prev));
    };

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(tick, intervalMs);
    };

    const tick = async () => {
      if (cancelled) return;
      try {
        const next = await jobsApi.get(id);
        if (cancelled) return;
        const done = isTerminalJobStatus(next.status);
        update({ job: next, error: null, isPolling: !done });
        if (done) return;
      } catch (err: unknown) {
        if (cancelled) return;
        const status = err instanceof ApiError ? err.status : 0;
        const fatal = status >= 400 && status < 500;
        update({
          error: getErrorMessage(err, "Unable to check job status"),
          isPolling: !fatal,
        });
        if (fatal) return;
      }
      schedule();
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, intervalMs]);

  return { job: state.job, isPolling: state.isPolling, error: state.error };
}
