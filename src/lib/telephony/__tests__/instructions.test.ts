import { describe, it, expect, afterEach } from "vitest";
import {
  SECRET_PENDING,
  apiBaseUrl,
  twilioBasicCredentials,
  twilioSetupSteps,
  twilioVoiceWebhookUrl,
  twilioVoiceWebhookUrlWithBasicAuth,
} from "../instructions";

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

describe("twilioBasicCredentials", () => {
  it("uses the org id as username and the telephony secret as password", () => {
    expect(twilioBasicCredentials("org-1", "s3cret")).toEqual({
      username: "org-1",
      password: "s3cret",
    });
  });
});

describe("twilioVoiceWebhookUrlWithBasicAuth", () => {
  it("builds the legacy https://user:pass@host/… form", () => {
    expect(
      twilioVoiceWebhookUrlWithBasicAuth("org-1", "s3cret", "https://api.ajentify.com")
    ).toBe("https://org-1:s3cret@api.ajentify.com/telephony/twilio/voice");
  });

  it("percent-encodes characters that would break the userinfo", () => {
    const url = twilioVoiceWebhookUrlWithBasicAuth("org-1", "p@ss/w:rd", "https://api.ajentify.com");
    expect(url).toBe("https://org-1:p%40ss%2Fw%3Ard@api.ajentify.com/telephony/twilio/voice");
    const parsed = new URL(url);
    expect(decodeURIComponent(parsed.password)).toBe("p@ss/w:rd");
    expect(parsed.username).toBe("org-1");
  });
});

describe("twilioSetupSteps", () => {
  it("renders the four steps with the webhook URL, Basic creds and URL form", () => {
    const steps = twilioSetupSteps({
      orgId: "org-1",
      secret: "s3cret",
      base: "https://api.staging.ajentify.com",
    });
    expect(steps.map((s) => s.title)).toEqual([
      "Point the number at Ajentify",
      "Add HTTP Basic authentication",
      "Optional: verify Twilio's signatures",
      "Call the number",
    ]);

    expect(steps[0].fields).toEqual([
      {
        label: "Webhook URL",
        value: "https://api.staging.ajentify.com/telephony/twilio/voice",
        mono: true,
      },
      { label: "HTTP method", value: "POST", mono: true },
    ]);
    expect(steps[0].description).toMatch(/A call comes in/);
    expect(steps[0].description).toMatch(/HTTP POST/);

    const [user, pass, urlForm] = steps[1].fields;
    expect(user).toMatchObject({ value: "org-1", mono: true });
    expect(user.secret).toBeUndefined();
    expect(pass).toMatchObject({ value: "s3cret", secret: true });
    expect(urlForm).toMatchObject({
      value: "https://org-1:s3cret@api.staging.ajentify.com/telephony/twilio/voice",
      secret: true,
    });
    expect(steps[1].note).toMatch(/auth\.scheme BASIC/);
    expect(steps[1].note).toMatch(/Rule/);

    expect(steps[2].description).toMatch(/Twilio Auth Token/);
    expect(steps[2].description).toMatch(/SharedKey/);
    expect(steps[2].fields).toEqual([]);
    expect(steps[3].fields).toEqual([]);
  });

  it("marks secret-dependent fields as pending while the secret loads", () => {
    const steps = twilioSetupSteps({ orgId: "org-1", secret: null, base: "https://x.test" });
    expect(steps[0].fields[0].value).toBe("https://x.test/telephony/twilio/voice");
    expect(steps[1].fields[0].value).toBe("org-1");
    expect(steps[1].fields[1].value).toBe(SECRET_PENDING);
    expect(steps[1].fields[2].value).toBe(SECRET_PENDING);
  });
});
