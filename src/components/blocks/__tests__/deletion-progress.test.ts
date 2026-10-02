import { describe, it, expect } from "vitest";
import {
  computeOverall,
  computeStepStates,
  humanizeResourceKey,
  sortResourceKeys,
} from "../deletion-progress";
import type { ApiJob, DeletionProgress } from "@/types/api";

function jobWith(
  status: ApiJob["status"],
  progress?: Partial<DeletionProgress>
): ApiJob {
  return {
    job_id: "j",
    owner_id: "u",
    status,
    data: progress
      ? { progress: { kind: "organization", phase: "delete_resources", resources: {}, ...progress } }
      : {},
    created_at: 0,
    updated_at: 0,
  };
}

describe("computeStepStates", () => {
  it("marks earlier steps done, the current phase running, later pending (org)", () => {
    const steps = computeStepStates("organization", jobWith("in_progress", { phase: "delete_resources" }));
    expect(steps.map((s) => s.state)).toEqual(["done", "current", "pending"]);
  });

  it("marks everything done on completed", () => {
    const steps = computeStepStates("organization", jobWith("completed", { phase: "done" }));
    expect(steps.every((s) => s.state === "done")).toBe(true);
  });

  it("maps the inline org cascade phases onto the account 'orgs' step", () => {
    const steps = computeStepStates("user", jobWith("in_progress", { kind: "user", phase: "cancel_subscription" }));
    expect(steps.map((s) => s.state)).toEqual(["current", "pending"]);
  });

  it("flags the current step on error", () => {
    const steps = computeStepStates("organization", jobWith("error", { phase: "cancel_subscription" }));
    expect(steps[0].state).toBe("error");
  });

  it("has no current step while queued without progress", () => {
    const steps = computeStepStates("organization", jobWith("queued"));
    expect(steps.every((s) => s.state === "pending")).toBe(true);
  });
});

describe("computeOverall", () => {
  it("sums deleted/total, using deleted as total for done rows without a count", () => {
    expect(
      computeOverall({
        agents: { deleted: 2, total: 4, status: "in_progress" },
        tools: { deleted: 3, total: null, status: "done" },
        contexts: { deleted: 0, total: null, status: "pending" },
      })
    ).toEqual({ deleted: 5, total: 7 });
  });

  it("returns total null when nothing is counted yet", () => {
    expect(computeOverall({ agents: { deleted: 0, total: null, status: "pending" } })).toEqual({
      deleted: 0,
      total: null,
    });
    expect(computeOverall(undefined)).toEqual({ deleted: 0, total: null });
  });
});

describe("resource keys", () => {
  it("humanises known and unknown keys", () => {
    expect(humanizeResourceKey("api_keys")).toBe("API keys");
    expect(humanizeResourceKey("mcp_connections")).toBe("MCP connections");
    expect(humanizeResourceKey("brand_new_thing")).toBe("Brand new thing");
  });

  it("sorts in cascade order with unknown keys last", () => {
    expect(sortResourceKeys(["zeta", "agents", "api_keys", "alpha"])).toEqual([
      "api_keys",
      "agents",
      "alpha",
      "zeta",
    ]);
  });
});
