import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ApiAgent, ApiPhoneNumber } from "@/types/api";

const create = vi.fn();
const update = vi.fn();
vi.mock("@/lib/stores/phone-numbers-store", () => ({
  phoneNumbersActions: {
    create: (...a: unknown[]) => create(...a),
    update: (...a: unknown[]) => update(...a),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/hooks/use-media-query", () => ({ useIsMobile: () => false }));

// Agents + models come from the real list stores, seeded below.
import { useAgentsStore } from "@/lib/stores/agents-store";
import { useModelsStore } from "@/lib/stores/models-store";
import { PhoneNumberDialog, realtimeAgents } from "../phone-number-dialog";

function agent(over: Partial<ApiAgent> = {}): ApiAgent {
  return {
    agent_id: "ag1",
    agent_name: "Ariel",
    agent_description: "",
    prompt: "",
    org_id: "o1",
    is_public: false,
    is_default_agent: false,
    model_id: "gpt-realtime",
    created_at: 1,
    updated_at: 1,
    ...over,
  };
}

function number(over: Partial<ApiPhoneNumber> = {}): ApiPhoneNumber {
  return {
    phone_number_id: "pn1",
    org_id: "o1",
    phone_number: "+61400000000",
    provider: "twilio",
    ownership: "byo",
    agent_id: null,
    friendly_name: "Front desk",
    twilio_account_sid: null,
    twilio_phone_number_sid: null,
    has_twilio_auth_token: true,
    created_by: "u1",
    created_at: 1,
    updated_at: 1,
    ...over,
  };
}

beforeEach(() => {
  create.mockReset();
  update.mockReset();
  create.mockImplementation(async (body: Record<string, unknown>) =>
    number({ ...(body as Partial<ApiPhoneNumber>), phone_number_id: "new" })
  );
  update.mockImplementation(async (id: string, body: Record<string, unknown>) =>
    number({ ...(body as Partial<ApiPhoneNumber>), phone_number_id: id })
  );
  useModelsStore.setState({
    data: [
      { model: "gpt-realtime", model_provider: "openai", input_token_cost: 0, output_token_cost: 0, context_window_size: 1, is_realtime: true },
      { model: "gpt-4o", model_provider: "openai", input_token_cost: 0, output_token_cost: 0, context_window_size: 1 },
    ],
    loaded: true,
  });
  useAgentsStore.setState({
    data: [agent(), agent({ agent_id: "ag2", agent_name: "Texty", model_id: "gpt-4o" })],
    loaded: true,
  });
});

describe("realtimeAgents", () => {
  it("keeps only agents whose model is realtime", () => {
    const out = realtimeAgents(useAgentsStore.getState().data, useModelsStore.getState().data);
    expect(out.map((a) => a.agent_id)).toEqual(["ag1"]);
  });
});

describe("PhoneNumberDialog", () => {
  it("create: validates E.164 client-side and posts the normalized number", async () => {
    const onSaved = vi.fn();
    render(<PhoneNumberDialog open onOpenChange={vi.fn()} onSaved={onSaved} />);

    expect(screen.getByText("Connect your own Twilio number")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Connect" });
    expect(submit).toBeDisabled();

    const input = screen.getByLabelText("Phone number");
    fireEvent.change(input, { target: { value: "0481 613 228" } });
    expect(screen.getByText(/Use E\.164 format/)).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(submit).toBeDisabled();

    fireEvent.change(input, { target: { value: "+61 481 613 228" } });
    expect(screen.queryByText(/Use E\.164 format/)).not.toBeInTheDocument();
    expect(submit).toBeEnabled();

    fireEvent.change(screen.getByLabelText("Friendly name"), { target: { value: "  Front desk " } });
    fireEvent.change(screen.getByLabelText("Twilio auth token"), { target: { value: "tok" } });
    fireEvent.click(submit);

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toEqual({
      phone_number: "+61400000000",
      friendly_name: "Front desk",
      twilio_auth_token: "tok",
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onSaved.mock.calls[0][1]).toBe("created");
  });

  it("create: only realtime agents are offered and the pick is sent as agent_id", async () => {
    render(<PhoneNumberDialog open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+61400000000" } });

    const trigger = screen.getByRole("combobox", { name: "Answering agent" });
    expect(trigger).toHaveTextContent("No agent yet");
    fireEvent.click(trigger);
    expect(await screen.findByRole("option", { name: "Ariel" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Texty" })).not.toBeInTheDocument();
    // base-ui only commits a click on the highlighted option; hover first.
    const option = screen.getByRole("option", { name: "Ariel" });
    fireEvent.mouseMove(option);
    fireEvent.click(option);
    await waitFor(() => expect(trigger).toHaveTextContent("Ariel"));

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toMatchObject({ agent_id: "ag1", friendly_name: null });
    expect("twilio_auth_token" in (create.mock.calls[0][0] as object)).toBe(false);
  });

  it("create: surfaces a 409 as 'already registered'", async () => {
    create.mockRejectedValueOnce({ status: 409, body: { error: "already registered" } });
    render(<PhoneNumberDialog open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+61400000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(await screen.findByText("already registered")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeEnabled();
  });

  it("edit: keeps the token when blank, replaces it when typed, clears it via the switch", async () => {
    const existing = number();
    const { rerender } = render(
      <PhoneNumberDialog open onOpenChange={vi.fn()} phoneNumber={existing} />
    );
    expect(screen.getByText("Edit number")).toBeInTheDocument();
    expect(screen.getByText("+61400000000")).toBeInTheDocument();
    expect(screen.queryByLabelText("Answering agent")).not.toBeInTheDocument();
    expect((screen.getByLabelText("Friendly name") as HTMLInputElement).value).toBe("Front desk");

    // Blank token → omitted (kept).
    fireEvent.change(screen.getByLabelText("Friendly name"), { target: { value: "Reception" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]).toEqual(["pn1", { friendly_name: "Reception" }]);

    // Typed token → replaced.
    rerender(<PhoneNumberDialog open onOpenChange={vi.fn()} phoneNumber={{ ...existing }} />);
    fireEvent.change(screen.getByLabelText("Twilio auth token"), { target: { value: "new-tok" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update.mock.calls[1][1]).toEqual({ friendly_name: "Front desk", twilio_auth_token: "new-tok" });

    // Clear switch → null.
    fireEvent.click(screen.getByRole("switch", { name: "Clear the stored token" }));
    expect(screen.getByLabelText("Twilio auth token")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(3));
    expect(update.mock.calls[2][1]).toEqual({ friendly_name: "Front desk", twilio_auth_token: null });
    expect(create).not.toHaveBeenCalled();
  });
});
