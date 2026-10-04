import { describe, it, expect, beforeEach } from "vitest";
import {
  DELETION_JOB_STORAGE_KEY,
  clearStoredDeletionJob,
  readStoredDeletionJob,
  writeStoredDeletionJob,
} from "../deletion-job-storage";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("deletion job sessionStorage", () => {
  it("round-trips {jobId, kind, label}", () => {
    writeStoredDeletionJob({ jobId: "j1", kind: "organization", label: "Acme" });
    expect(readStoredDeletionJob()).toEqual({ jobId: "j1", kind: "organization", label: "Acme" });
    clearStoredDeletionJob();
    expect(readStoredDeletionJob()).toBeNull();
  });

  it("drops corrupt or unknown entries", () => {
    window.sessionStorage.setItem(DELETION_JOB_STORAGE_KEY, "{not json");
    expect(readStoredDeletionJob()).toBeNull();
    window.sessionStorage.setItem(
      DELETION_JOB_STORAGE_KEY,
      JSON.stringify({ jobId: "j", kind: "nope" })
    );
    expect(readStoredDeletionJob()).toBeNull();
    expect(window.sessionStorage.getItem(DELETION_JOB_STORAGE_KEY)).toBeNull();
  });
});
