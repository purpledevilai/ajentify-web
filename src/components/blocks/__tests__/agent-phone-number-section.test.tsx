import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import type { ApiPhoneNumber } from "@/types/api";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

// Real store (so selectors/upsert behave), mocked actions.
const attach = vi.fn();
const detach = vi.fn();
vi.mock("@/lib/stores/phone-numbers-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stores/phone-numbers-store")>();
  return {
    ...actual,
    phoneNumbersActions: {
      ...actual.phoneNumbersActions,
      attach: (...a: unknown[]) => attach(...a),
      detach: (...a: unknown[]) => detach(...a),
    },
  };
});

import { usePhoneNumbersStore } from "@/lib/stores/phone-numbers-store";
import { AgentPhoneNumberSection } from "../agent-phone-number-section";

function number(over: Partial<ApiPhoneNumber> = {}): ApiPhoneNumber {
  return {
    phone_number_id: "pn1",
    org_id: "o1",
    phone_number: "+61400000000",
    provider: "twilio",
    ownership: "byo",
    agent_id: null,
    friendly_name: null,
    twilio_account_sid: null,
    twilio_phone_number_sid: null,
    has_twilio_auth_token: false,
    created_by: "u1",
    created_at: 1,
    updated_at: 1,
    ...over,
  };
}

function seed(rows: ApiPhoneNumber[]) {
  usePhoneNumbersStore.setState({ data: rows, loaded: true, loading: false, error: null });
}

beforeEach(() => {
  attach.mockReset();
  detach.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  usePhoneNumbersStore.getState().reset();
});

describe("AgentPhoneNumberSection", () => {
  it("lists the numbers attached to this agent and offers the unattached ones", () => {
    seed([
      number({ phone_number_id: "pn1", agent_id: "ag1", friendly_name: "Front desk" }),
      number({ phone_number_id: "pn2", phone_number: "+14155551234", agent_id: "ag2" }),
      number({ phone_number_id: "pn3", phone_number: "+61400000000", ownership: "ajentify" }),
    ]);
    render(<AgentPhoneNumberSection agentId="ag1" realtime />);

    expect(screen.getByText("Phone number")).toBeInTheDocument();
    const row = within(screen.getByTestId("phone-row-pn1"));
    expect(row.getByText("+61400000000")).toBeInTheDocument();
    expect(row.getByText("Front desk")).toBeInTheDocument();
    expect(row.getByText("Your Twilio")).toBeInTheDocument();
    // Another agent's number is neither listed nor offered.
    expect(screen.queryByText("+14155551234")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage/ })).toHaveAttribute(
      "href",
      "/app/phone-numbers"
    );
    expect(screen.getByRole("combobox", { name: "Number to attach" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Attach number/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Buy a number/ })).toBeDisabled();
    expect(screen.queryByTestId("phone-realtime-hint")).not.toBeInTheDocument();
  });

  it("shows the realtime hint and disables attaching when the model is not realtime", () => {
    seed([number()]);
    render(<AgentPhoneNumberSection agentId="ag1" realtime={false} />);
    expect(screen.getByTestId("phone-realtime-hint")).toHaveTextContent(/realtime model/);
    expect(screen.getByRole("combobox", { name: "Number to attach" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Attach number/ })).toBeDisabled();
  });

  it("links to the org page when there are no numbers at all", () => {
    seed([]);
    render(<AgentPhoneNumberSection agentId="ag1" realtime />);
    expect(screen.getByRole("link", { name: "Connect your own Twilio number" })).toHaveAttribute(
      "href",
      "/app/phone-numbers"
    );
  });

  it("attaches the picked number via phoneNumbersActions.attach", async () => {
    seed([number()]);
    attach.mockImplementation(async (id: string, agentId: string) => {
      const n = number({ phone_number_id: id, agent_id: agentId });
      usePhoneNumbersStore.getState().upsert(n);
      return n;
    });
    render(<AgentPhoneNumberSection agentId="ag1" realtime />);

    fireEvent.click(screen.getByRole("combobox", { name: "Number to attach" }));
    // base-ui only commits a click on the highlighted option; hover first.
    const option = await screen.findByRole("option", { name: "+61400000000" });
    fireEvent.mouseMove(option);
    fireEvent.click(option);
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Number to attach" })).toHaveTextContent(
        "+61400000000"
      )
    );
    fireEvent.click(screen.getByRole("button", { name: /Attach number/ }));

    await waitFor(() => expect(attach).toHaveBeenCalledWith("pn1", "ag1"));
    await waitFor(() => expect(screen.getByTestId("phone-row-pn1")).toBeInTheDocument());
    expect(toastSuccess).toHaveBeenCalledWith("Attached +61400000000");
  });

  it("detaches via phoneNumbersActions.detach and toasts on failure", async () => {
    seed([number({ agent_id: "ag1" })]);
    detach.mockRejectedValueOnce({ status: 500, body: { error: "boom" } });
    render(<AgentPhoneNumberSection agentId="ag1" realtime />);

    fireEvent.click(screen.getByRole("button", { name: /Detach/ }));
    await waitFor(() => expect(detach).toHaveBeenCalledWith("pn1"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("boom"));
    // Still attached after the failure.
    expect(screen.getByTestId("phone-row-pn1")).toBeInTheDocument();
  });
});
