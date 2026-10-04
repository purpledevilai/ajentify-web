import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useJobPoll } from "../use-job-poll";
import { ApiError } from "@/lib/api/errors";
import type { ApiJob } from "@/types/api";

const getMock = vi.fn();
vi.mock("@/lib/api/jobs", () => ({
  jobsApi: { get: (...args: unknown[]) => getMock(...args) },
}));

function job(status: ApiJob["status"], extra: Partial<ApiJob> = {}): ApiJob {
  return {
    job_id: "j1",
    owner_id: "u1",
    status,
    data: {},
    created_at: 1,
    updated_at: 1,
    ...extra,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  getMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useJobPoll", () => {
  it("polls every 2s and stops once the job is completed", async () => {
    getMock
      .mockResolvedValueOnce(job("queued"))
      .mockResolvedValueOnce(job("in_progress"))
      .mockResolvedValueOnce(job("completed"));

    const { result } = renderHook(() => useJobPoll("j1"));
    expect(result.current.isPolling).toBe(true);

    await flush(0); // first fetch
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(result.current.job?.status).toBe("queued");

    await flush(2000);
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(result.current.job?.status).toBe("in_progress");

    await flush(2000);
    expect(getMock).toHaveBeenCalledTimes(3);
    expect(result.current.job?.status).toBe("completed");
    expect(result.current.isPolling).toBe(false);

    // No further polls after terminal status.
    await flush(10_000);
    expect(getMock).toHaveBeenCalledTimes(3);
  });

  it("stops on error status and exposes the job", async () => {
    getMock.mockResolvedValueOnce(
      job("error", { error: { status_code: 502, message: "stripe failed", code: "stripe_cancel_failed" } })
    );
    const { result } = renderHook(() => useJobPoll("j1"));
    await flush(0);
    expect(result.current.job?.status).toBe("error");
    expect(result.current.job?.error?.message).toBe("stripe failed");
    expect(result.current.isPolling).toBe(false);
    await flush(10_000);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it("stops polling on unmount", async () => {
    getMock.mockResolvedValue(job("in_progress"));
    const { unmount } = renderHook(() => useJobPoll("j1"));
    await flush(0);
    await flush(2000);
    expect(getMock).toHaveBeenCalledTimes(2);
    unmount();
    await flush(10_000);
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it("does nothing for a null jobId", async () => {
    const { result } = renderHook(() => useJobPoll(null));
    await flush(5000);
    expect(getMock).not.toHaveBeenCalled();
    expect(result.current.isPolling).toBe(false);
    expect(result.current.job).toBeNull();
  });

  it("keeps polling through a transient (non-4xx) error, stops on 404", async () => {
    getMock
      .mockRejectedValueOnce(new ApiError(503, { error: "unavailable" }))
      .mockResolvedValueOnce(job("in_progress"))
      .mockRejectedValueOnce(new ApiError(404, { error: "Job not found" }));

    const { result } = renderHook(() => useJobPoll("j1"));
    await flush(0);
    expect(result.current.error).toBe("unavailable");
    expect(result.current.isPolling).toBe(true);

    await flush(2000);
    expect(result.current.error).toBeNull();
    expect(result.current.job?.status).toBe("in_progress");

    await flush(2000);
    expect(result.current.error).toBe("Job not found");
    expect(result.current.isPolling).toBe(false);
    await flush(10_000);
    expect(getMock).toHaveBeenCalledTimes(3);
  });

  it("resets and re-polls when jobId changes", async () => {
    getMock.mockImplementation(async (id: string) => job("in_progress", { job_id: id }));
    const { result, rerender } = renderHook(({ id }) => useJobPoll(id), {
      initialProps: { id: "j1" },
    });
    await flush(0);
    expect(result.current.job?.job_id).toBe("j1");

    rerender({ id: "j2" });
    expect(result.current.job).toBeNull();
    await flush(0);
    expect(result.current.job?.job_id).toBe("j2");
    expect(getMock).toHaveBeenLastCalledWith("j2");
  });
});
