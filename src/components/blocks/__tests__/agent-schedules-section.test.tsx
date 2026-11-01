import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import type { ApiJob, ApiSchedule } from "@/types/api";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

// jsdom has no matchMedia; the schedule dialog only uses it for layout.
vi.mock("@/lib/hooks/use-media-query", () => ({ useIsMobile: () => false }));

// Controllable stand-in for the job poll; the hook has its own tests.
let pollState: { job: ApiJob | null; isPolling: boolean; error: string | null } = {
  job: null,
  isPolling: false,
  error: null,
};
const useJobPoll = vi.fn((jobId: string | null) =>
  jobId ? pollState : { job: null, isPolling: false, error: null }
);
vi.mock("@/lib/hooks/use-job-poll", () => ({
  useJobPoll: (id: string | null) => useJobPoll(id),
}));

// Real store (so selectors/upsert behave), mocked actions.
const setEnabled = vi.fn();
const remove = vi.fn();
const run = vi.fn();
vi.mock("@/lib/stores/schedules-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stores/schedules-store")>();
  return {
    ...actual,
    schedulesActions: {
      create: vi.fn(),
      update: vi.fn(),
      remove: (...a: unknown[]) => remove(...a),
      setEnabled: (...a: unknown[]) => setEnabled(...a),
      run: (...a: unknown[]) => run(...a),
    },
  };
});

import { useSchedulesStore } from "@/lib/stores/schedules-store";
import { AgentSchedulesSection } from "../agent-schedules-section";

/** Row title of the default (unnamed) schedule: its human-readable expression. */
const TITLE = "Daily at 09:00 (Australia/Melbourne)";

function schedule(over: Partial<ApiSchedule> = {}): ApiSchedule {
  return {
    schedule_id: "s1",
    org_id: "o1",
    agent_id: "ag1",
    name: null,
    schedule_expression: "cron(0 9 * * ? *)",
    timezone: "Australia/Melbourne",
    enabled: true,
    prompt_args: null,
    message: null,
    created_by: "u1",
    client_id: "c1",
    created_at: 1,
    updated_at: 1,
    run_count: 0,
    last_run_at: null,
    last_context_id: null,
    last_status: null,
    last_error: null,
    ...over,
  };
}

function seed(rows: ApiSchedule[]) {
  useSchedulesStore.setState({
    byAgent: { ag1: { data: rows, loaded: true, loading: false, error: null } },
  });
}

beforeEach(() => {
  setEnabled.mockReset();
  remove.mockReset();
  run.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  push.mockReset();
  useJobPoll.mockClear();
  pollState = { job: null, isPolling: true, error: null };
  useSchedulesStore.getState().reset();
});

describe("AgentSchedulesSection", () => {
  it("titles rows by expression (legacy name + summary subtitle), with last-run link and error badge", () => {
    seed([
      schedule(),
      schedule({
        schedule_id: "s2",
        name: "Hourly",
        schedule_expression: "rate(1 hour)",
        enabled: false,
        last_run_at: Math.floor(Date.now() / 1000) - 120,
        last_context_id: "ctx9",
        last_status: "error",
        last_error: "Agent timed out",
      }),
    ]);

    render(<AgentSchedulesSection agentId="ag1" promptArgNames={[]} usesPromptArgs={false} />);

    expect(screen.getByText("Schedules")).toBeInTheDocument();
    // Unnamed schedule: the summary is the title and there is no subtitle.
    const unnamed = within(screen.getByTestId("schedule-row-s1"));
    expect(unnamed.getAllByText(TITLE)).toHaveLength(1);
    expect(screen.getByText("Never run")).toBeInTheDocument();

    // Legacy named schedule: name as title, summary as subtitle.
    expect(screen.getByText("Hourly")).toBeInTheDocument();
    expect(screen.getByText("Every hour")).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Last run 2 minutes ago/ });
    expect(link).toHaveAttribute("href", "/app/contexts/ctx9");
    expect(screen.getByText("Agent timed out")).toBeInTheDocument();
  });

  it("shows the empty state when the agent has no schedules", () => {
    seed([]);
    render(<AgentSchedulesSection agentId="ag1" promptArgNames={[]} usesPromptArgs={false} />);
    expect(screen.getByText(/No schedules yet/)).toBeInTheDocument();
  });

  it("toggling the Switch calls schedulesActions.setEnabled and toasts on failure", async () => {
    seed([schedule()]);
    setEnabled.mockResolvedValueOnce(schedule({ enabled: false }));
    render(<AgentSchedulesSection agentId="ag1" promptArgNames={[]} usesPromptArgs={false} />);

    const sw = screen.getByRole("switch", { name: `Enable ${TITLE}` });
    expect(sw).toHaveAttribute("aria-checked", "true");
    fireEvent.click(sw);
    await waitFor(() => expect(setEnabled).toHaveBeenCalledWith("s1", false));
    expect(toastError).not.toHaveBeenCalled();

    setEnabled.mockRejectedValueOnce({ status: 500, body: { error: "boom" } });
    fireEvent.click(sw);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("boom"));
  });

  it("Run now starts the 202 job, polls it, upserts the result and toasts a link to the context", async () => {
    seed([schedule()]);
    run.mockResolvedValueOnce({ job_id: "j1", status: "queued", poll_url: "/job/j1" });

    const { rerender } = render(
      <AgentSchedulesSection agentId="ag1" promptArgNames={[]} usesPromptArgs={false} />
    );

    fireEvent.click(screen.getByRole("button", { name: `Actions for ${TITLE}` }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Run now" }));

    await waitFor(() => expect(run).toHaveBeenCalledWith("s1"));
    await waitFor(() => expect(useJobPoll).toHaveBeenCalledWith("j1"));
    expect(screen.getByLabelText("Running")).toBeInTheDocument();

    // Job completes: the row picks up the fresh schedule and the toast links to the context.
    const updated = schedule({
      run_count: 1,
      last_run_at: Math.floor(Date.now() / 1000),
      last_context_id: "ctx1",
      last_status: "ok",
    });
    pollState = {
      job: {
        job_id: "j1",
        owner_id: "u1",
        status: "completed",
        data: {},
        result: { schedule: updated, context_id: "ctx1" },
        created_at: 1,
        updated_at: 2,
      },
      isPolling: false,
      error: null,
    };
    rerender(<AgentSchedulesSection agentId="ag1" promptArgNames={[]} usesPromptArgs={false} />);

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
    expect(toastSuccess.mock.calls[0][0]).toBe(`Ran ${TITLE}`);
    const opts = toastSuccess.mock.calls[0][1] as { action: { onClick: () => void } };
    opts.action.onClick();
    expect(push).toHaveBeenCalledWith("/app/contexts/ctx1");

    expect(useSchedulesStore.getState().byAgent.ag1.data[0].last_context_id).toBe("ctx1");
    await waitFor(() => expect(screen.queryByLabelText("Running")).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: /Last run/ })).toHaveAttribute(
      "href",
      "/app/contexts/ctx1"
    );
  });

  it("Run now toasts the job error when the run fails", async () => {
    seed([schedule()]);
    run.mockResolvedValueOnce({ job_id: "j2", status: "queued" });
    const { rerender } = render(
      <AgentSchedulesSection agentId="ag1" promptArgNames={[]} usesPromptArgs={false} />
    );
    fireEvent.click(screen.getByRole("button", { name: `Actions for ${TITLE}` }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Run now" }));
    await waitFor(() => expect(useJobPoll).toHaveBeenCalledWith("j2"));

    pollState = {
      job: {
        job_id: "j2",
        owner_id: "u1",
        status: "error",
        data: {},
        error: { status_code: 500, message: "Model exploded" },
        created_at: 1,
        updated_at: 2,
      },
      isPolling: false,
      error: null,
    };
    rerender(<AgentSchedulesSection agentId="ag1" promptArgNames={[]} usesPromptArgs={false} />);

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError.mock.calls[0]).toEqual([
      `${TITLE} failed`,
      { description: "Model exploded" },
    ]);
  });
});
