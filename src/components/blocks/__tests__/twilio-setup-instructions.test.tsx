import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import type { ApiPhoneNumber } from "@/types/api";

vi.mock("@/lib/hooks/use-media-query", () => ({ useIsMobile: () => false }));

import {
  TwilioSetupInstructions,
  TwilioSetupInstructionsDialog,
} from "../twilio-setup-instructions";

// vitest.setup.ts pins NEXT_PUBLIC_API_BASE_URL to https://api.test.invalid
const WEBHOOK = "https://api.test.invalid/telephony/twilio/voice";

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
    has_twilio_auth_token: true,
    created_by: "u1",
    created_at: 1,
    updated_at: 1,
    ...over,
  };
}

beforeEach(() => {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe("TwilioSetupInstructions", () => {
  it("renders three steps with a plain, copyable webhook URL and no secrets or network calls", async () => {
    render(<TwilioSetupInstructions phoneNumber={number()} />);

    expect(screen.getByText("+61400000000")).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();

    // Step 1: token already stored.
    const step1 = within(screen.getByTestId("setup-step-1"));
    expect(step1.getByText("Store your Twilio Auth Token in Ajentify")).toBeInTheDocument();
    expect(step1.getByText(/never shown again/)).toBeInTheDocument();
    expect(step1.queryByRole("button", { name: "Replace token" })).not.toBeInTheDocument();

    // Step 2: plain webhook URL + POST, copy button, signature note.
    const step2 = within(screen.getByTestId("setup-step-2"));
    expect(step2.getByText("Point the number at Ajentify")).toBeInTheDocument();
    expect(step2.getByTestId("setup-field-Webhook URL")).toHaveTextContent(WEBHOOK);
    expect(step2.getByText("POST")).toBeInTheDocument();
    expect(step2.getByText(/No authentication to configure/)).toBeInTheDocument();
    fireEvent.click(step2.getByRole("button", { name: "Copy Webhook URL" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(WEBHOOK));

    // Step 3, and nothing beyond it.
    expect(screen.getByTestId("setup-step-3")).toHaveTextContent(/Call the number/);
    expect(screen.queryByTestId("setup-step-4")).not.toBeInTheDocument();

    // No reveal / rotate affordances remain.
    expect(screen.queryByRole("button", { name: /Reveal/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rotate/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/telephony secret/i)).not.toBeInTheDocument();
  });

  it("offers 'Replace token' for a specific number when a handler is given", () => {
    const onReplaceToken = vi.fn();
    const n = number();
    render(<TwilioSetupInstructions phoneNumber={n} onReplaceToken={onReplaceToken} />);
    fireEvent.click(screen.getByRole("button", { name: "Replace token" }));
    expect(onReplaceToken).toHaveBeenCalledWith(n);
  });

  it("hides 'Replace token' when no number is in context", () => {
    render(<TwilioSetupInstructions onReplaceToken={vi.fn()} />);
    expect(screen.getByText("Configure your Twilio number so calls reach Ajentify.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Replace token" })).not.toBeInTheDocument();
  });
});

describe("TwilioSetupInstructionsDialog", () => {
  it("wraps the steps in a dialog and only renders them while open", async () => {
    const { rerender } = render(
      <TwilioSetupInstructionsDialog open={false} onOpenChange={vi.fn()} />
    );
    expect(screen.queryByTestId("twilio-setup-instructions")).not.toBeInTheDocument();
    rerender(<TwilioSetupInstructionsDialog open onOpenChange={vi.fn()} />);
    expect(await screen.findByText("Twilio setup instructions")).toBeInTheDocument();
    expect(screen.getByText(/Three steps/)).toBeInTheDocument();
    expect(screen.getByText(WEBHOOK)).toBeInTheDocument();
  });
});
