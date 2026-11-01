import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ApiSchedule } from "@/types/api";

const create = vi.fn();
const update = vi.fn();
vi.mock("@/lib/stores/schedules-store", () => ({
  schedulesActions: {
    create: (...a: unknown[]) => create(...a),
    update: (...a: unknown[]) => update(...a),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// jsdom has no matchMedia; the dialog only uses it to pick its mobile layout.
vi.mock("@/lib/hooks/use-media-query", () => ({ useIsMobile: () => false }));

import { ScheduleDialog } from "../schedule-dialog";

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

beforeEach(() => {
  create.mockReset();
  update.mockReset();
  create.mockImplementation(async (body: Record<string, unknown>) =>
    schedule({ ...(body as Partial<ApiSchedule>), schedule_id: "new" })
  );
  update.mockImplementation(async (id: string, body: Record<string, unknown>) =>
    schedule({ ...(body as Partial<ApiSchedule>), schedule_id: id })
  );
});

describe("ScheduleDialog", () => {
  it("create: defaults to Daily 09:00, submits cron(0 9 * * ? *) with prompt args and message", async () => {
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();
    render(
      <ScheduleDialog
        open
        onOpenChange={onOpenChange}
        agentId="ag1"
        promptArgNames={["topic"]}
        usesPromptArgs
        onSaved={onSaved}
      />
    );

    expect(screen.getByText("New schedule")).toBeInTheDocument();
    expect(screen.getByTestId("schedule-preview")).toHaveTextContent(/^Daily at 09:00 \(/);
    // Schedules no longer have a name.
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();

    // The default frequency is already valid, so submit is enabled from the start.
    const submit = screen.getByRole("button", { name: "Create" });
    expect(submit).toBeEnabled();

    fireEvent.change(screen.getByLabelText("topic"), { target: { value: "news" } });
    fireEvent.change(screen.getByLabelText("Kick-off message"), {
      target: { value: "  Go  " },
    });

    fireEvent.click(submit);

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const body = create.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toMatchObject({
      agent_id: "ag1",
      schedule_expression: "cron(0 9 * * ? *)",
      enabled: true,
      prompt_args: { topic: "news" },
      message: "Go",
    });
    expect("name" in body).toBe(false);
    expect(typeof body.timezone).toBe("string");
    expect((body.timezone as string).length).toBeGreaterThan(0);

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("create: a blank message becomes null and prompt_args is null when the agent has none", async () => {
    render(
      <ScheduleDialog
        open
        onOpenChange={vi.fn()}
        agentId="ag1"
        promptArgNames={[]}
        usesPromptArgs={false}
      />
    );
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "17:30" } });
    expect(screen.getByTestId("schedule-preview")).toHaveTextContent(/^Daily at 17:30/);
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toMatchObject({
      schedule_expression: "cron(30 17 * * ? *)",
      prompt_args: null,
      message: null,
    });
  });

  it("edit: pre-fills from the schedule and calls update with the stored id", async () => {
    const existing = schedule({
      name: "Weekly", // legacy name: not editable, not sent back
      schedule_expression: "cron(15 8 ? * MON,WED *)",
      timezone: "UTC",
      enabled: false,
      message: "hi",
    });
    render(
      <ScheduleDialog
        open
        onOpenChange={vi.fn()}
        agentId="ag1"
        promptArgNames={[]}
        usesPromptArgs={false}
        schedule={existing}
      />
    );
    expect(screen.getByText("Edit schedule")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect((screen.getByLabelText("Time") as HTMLInputElement).value).toBe("08:15");
    expect(screen.getByRole("button", { name: "Mon" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Tue" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("schedule-preview")).toHaveTextContent(
      "Weekly on Mon, Wed at 08:15 (UTC)"
    );

    // Add Friday, then save.
    fireEvent.click(screen.getByRole("button", { name: "Fri" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0]).toBe("s1");
    expect(update.mock.calls[0][1]).toMatchObject({
      schedule_expression: "cron(15 8 ? * MON,WED,FRI *)",
      timezone: "UTC",
      enabled: false,
      message: "hi",
    });
    expect("name" in (update.mock.calls[0][1] as object)).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("surfaces server validation errors inline", async () => {
    create.mockRejectedValueOnce({
      status: 400,
      body: { error: "Unsupported cron field", code: "invalid_schedule_expression" },
    });
    render(
      <ScheduleDialog
        open
        onOpenChange={vi.fn()}
        agentId="ag1"
        promptArgNames={[]}
        usesPromptArgs={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(
      await screen.findByText(/That schedule expression isn't valid\. Unsupported cron field/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });
});
