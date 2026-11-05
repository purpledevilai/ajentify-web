import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import type { ApiPhoneNumber } from "@/types/api";

const getSecret = vi.fn();
const rotateSecret = vi.fn();
vi.mock("@/lib/api/phone-numbers", () => ({
  telephonySecretApi: {
    get: (...a: unknown[]) => getSecret(...a),
    rotate: (...a: unknown[]) => rotateSecret(...a),
  },
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

vi.mock("@/lib/hooks/use-media-query", () => ({ useIsMobile: () => false }));

import {
  TwilioSetupInstructions,
  TwilioSetupInstructionsDialog,
} from "../twilio-setup-instructions";

const MASK = "••••••••••••••••";
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
    has_twilio_auth_token: false,
    created_by: "u1",
    created_at: 1,
    updated_at: 1,
    ...over,
  };
}

beforeEach(() => {
  getSecret.mockReset();
  rotateSecret.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  getSecret.mockResolvedValue({ org_id: "o1", api_key_id: "k1", secret: "s3cret", created_at: 1 });
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe("TwilioSetupInstructions", () => {
  it("renders the credentials-in-URL webhook (masked) then the reference creds, with copy buttons", async () => {
    render(<TwilioSetupInstructions orgId="o1" phoneNumber={number()} />);

    expect(getSecret).toHaveBeenCalledWith("o1");
    expect(screen.getByText("+61400000000")).toBeInTheDocument();

    // Step 1: credentials-in-URL webhook (masked until revealed) + method.
    const step1 = within(screen.getByTestId("setup-step-1"));
    expect(step1.getByText("POST")).toBeInTheDocument();
    await waitFor(() =>
      expect(step1.getByTestId("setup-field-Webhook URL (with credentials)")).toHaveTextContent(MASK)
    );
    fireEvent.click(step1.getByRole("button", { name: "Reveal Webhook URL (with credentials)" }));
    expect(
      step1.getByText("https://o1:s3cret@api.test.invalid/telephony/twilio/voice")
    ).toBeInTheDocument();
    expect(step1.getByText(/does not apply to Programmable Voice/)).toBeInTheDocument();
    expect(step1.getByRole("button", { name: "Copy Webhook URL (with credentials)" })).toBeInTheDocument();

    // Step 2: reference creds — plain URL + username visible, password masked until revealed.
    const step2 = within(screen.getByTestId("setup-step-2"));
    expect(step2.getByText(WEBHOOK)).toBeInTheDocument();
    expect(step2.getByText("o1")).toBeInTheDocument();
    expect(step2.getByTestId("setup-field-Password (telephony secret)")).toHaveTextContent(MASK);
    expect(step2.queryByText("s3cret")).not.toBeInTheDocument();
    fireEvent.click(step2.getByRole("button", { name: "Reveal Password (telephony secret)" }));
    expect(step2.getByText("s3cret")).toBeInTheDocument();

    // Copy copies the real secret even while masked.
    fireEvent.click(step2.getByRole("button", { name: "Hide Password (telephony secret)" }));
    fireEvent.click(step2.getByRole("button", { name: "Copy Password (telephony secret)" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("s3cret"));

    // Steps 3 and 4.
    expect(screen.getByTestId("setup-step-3")).toHaveTextContent(/Twilio Auth Token/);
    expect(screen.getByTestId("setup-step-4")).toHaveTextContent(/Call the number/);
  });

  it("rotates the secret after confirmation and swaps the displayed values", async () => {
    rotateSecret.mockResolvedValueOnce({
      org_id: "o1",
      api_key_id: "k2",
      secret: "n3w-secret",
      created_at: 2,
    });
    render(<TwilioSetupInstructions orgId="o1" />);
    const step2 = within(screen.getByTestId("setup-step-2"));
    await waitFor(() => expect(step2.getByRole("button", { name: "Rotate" })).toBeEnabled());

    fireEvent.click(step2.getByRole("button", { name: "Rotate" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/Every Twilio number you have connected must be updated/);
    fireEvent.click(within(dialog).getByRole("button", { name: "Rotate" }));

    await waitFor(() => expect(rotateSecret).toHaveBeenCalledWith("o1"));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    fireEvent.click(step2.getByRole("button", { name: "Reveal Password (telephony secret)" }));
    expect(step2.getByText("n3w-secret")).toBeInTheDocument();
  });

  it("shows the load error with a retry", async () => {
    getSecret.mockRejectedValueOnce({ status: 500, body: { error: "nope" } });
    render(<TwilioSetupInstructions orgId="o1" />);
    expect(await screen.findByText("nope")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(getSecret).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("nope")).not.toBeInTheDocument());
  });
});

describe("TwilioSetupInstructionsDialog", () => {
  it("wraps the steps in a dialog and only fetches while open", async () => {
    const { rerender } = render(
      <TwilioSetupInstructionsDialog open={false} onOpenChange={vi.fn()} orgId="o1" />
    );
    expect(getSecret).not.toHaveBeenCalled();
    rerender(<TwilioSetupInstructionsDialog open onOpenChange={vi.fn()} orgId="o1" />);
    expect(await screen.findByText("Twilio setup instructions")).toBeInTheDocument();
    expect(getSecret).toHaveBeenCalledTimes(1);
    expect(screen.getByText(WEBHOOK)).toBeInTheDocument();
  });
});
