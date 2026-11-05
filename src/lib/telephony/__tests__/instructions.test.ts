import { describe, it, expect, afterEach } from "vitest";
import { apiBaseUrl, twilioSetupSteps, twilioVoiceWebhookUrl } from "../instructions";

const ORIGINAL_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = ORIGINAL_BASE;
});

describe("twilioVoiceWebhookUrl", () => {
  it("derives the webhook URL from NEXT_PUBLIC_API_BASE_URL", () => {
    // vitest.setup.ts pins the base to https://api.test.invalid
    expect(apiBaseUrl()).toBe("https://api.test.invalid");
    expect(twilioVoiceWebhookUrl()).toBe("https://api.test.invalid/telephony/twilio/voice");
  });

  it("tolerates a trailing slash on the base and accepts an explicit base", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.staging.ajentify.com/";
    expect(twilioVoiceWebhookUrl()).toBe(
      "https://api.staging.ajentify.com/telephony/twilio/voice"
    );
    expect(twilioVoiceWebhookUrl("https://api.ajentify.com")).toBe(
      "https://api.ajentify.com/telephony/twilio/voice"
    );
  });
});

describe("twilioSetupSteps", () => {
  it("renders the three steps: token stored, plain webhook URL + POST, call it", () => {
    const steps = twilioSetupSteps({ base: "https://api.staging.ajentify.com" });
    expect(steps.map((s) => s.title)).toEqual([
      "Store your Twilio Auth Token in Ajentify",
      "Point the number at Ajentify",
      "Call the number",
    ]);

    expect(steps[0].fields).toEqual([]);
    expect(steps[0].description).toMatch(/never shown again/);
    expect(steps[0].description).toMatch(/Replace Twilio Auth Token/);

    expect(steps[1].fields).toEqual([
      {
        label: "Webhook URL",
        value: "https://api.staging.ajentify.com/telephony/twilio/voice",
        mono: true,
      },
      { label: "HTTP method", value: "POST", mono: true },
    ]);
    expect(steps[1].description).toMatch(/Phone Numbers → Manage → Active numbers/);
    expect(steps[1].description).toMatch(/A call comes in/);
    expect(steps[1].description).toMatch(/HTTP POST/);
    expect(steps[1].note).toMatch(/No authentication to configure/);
    expect(steps[1].note).toMatch(/replace it here too or calls will be rejected/);

    expect(steps[2].fields).toEqual([]);
    expect(steps[2].description).toMatch(/Attach a realtime agent/);
  });

  it("never puts credentials into any field", () => {
    const steps = twilioSetupSteps({ base: "https://x.test" });
    for (const step of steps) {
      for (const f of step.fields) {
        expect(f.value).not.toMatch(/@/);
        expect(f).not.toHaveProperty("secret");
      }
    }
  });

  it("defaults the base to NEXT_PUBLIC_API_BASE_URL", () => {
    expect(twilioSetupSteps()[1].fields[0].value).toBe(
      "https://api.test.invalid/telephony/twilio/voice"
    );
  });
});
