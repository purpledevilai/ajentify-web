/**
 * Pure helpers behind the "Connect your own Twilio number" instructions.
 * Everything here derives from `NEXT_PUBLIC_API_BASE_URL` so the same panel
 * is correct on staging and prod without any extra config.
 */

export const TWILIO_VOICE_WEBHOOK_PATH = "/telephony/twilio/voice";

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/** The API origin the browser is configured against, without a trailing `/`. */
export function apiBaseUrl(): string {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? "");
}

/** `https://api.<env host>/telephony/twilio/voice`. */
export function twilioVoiceWebhookUrl(base: string = apiBaseUrl()): string {
  return `${trimTrailingSlash(base)}${TWILIO_VOICE_WEBHOOK_PATH}`;
}

/** A copyable field inside a setup step. */
export interface SetupField {
  label: string;
  value: string;
  /** Monospace rendering (URLs, ids). */
  mono?: boolean;
}

export interface SetupStep {
  title: string;
  description: string;
  fields: SetupField[];
  note?: string;
}

export interface TwilioSetupInput {
  base?: string;
}

/**
 * The ordered steps shown in the instructions panel. Kept as data so the
 * renderer stays dumb and the content is unit-testable. Nothing secret goes
 * into Twilio: the webhook is a plain URL and Ajentify verifies Twilio's
 * `X-Twilio-Signature` with the auth token stored on the number.
 */
export function twilioSetupSteps({ base }: TwilioSetupInput = {}): SetupStep[] {
  const webhookUrl = twilioVoiceWebhookUrl(base);
  return [
    {
      title: "Store your Twilio Auth Token in Ajentify",
      description:
        "Done when you connected the number. Ajentify uses the token only to verify that each call really comes from your Twilio account; it is never shown again. To swap it, open the number's Edit dialog and use “Replace Twilio Auth Token”.",
      fields: [],
    },
    {
      title: "Point the number at Ajentify",
      description:
        "In the Twilio Console open Phone Numbers → Manage → Active numbers, pick your number and scroll to Voice configuration. Under “A call comes in” choose Webhook, paste the URL below and set the method to HTTP POST.",
      fields: [
        { label: "Webhook URL", value: webhookUrl, mono: true },
        { label: "HTTP method", value: "POST", mono: true },
      ],
      note:
        "No authentication to configure — Twilio signs every request and Ajentify verifies the signature with your auth token. If you rotate the token in Twilio, replace it here too or calls will be rejected.",
    },
    {
      title: "Call the number",
      description:
        "Attach a realtime agent to the number, then call it. The agent answers; if the number isn't connected you'll hear a short message and the call hangs up.",
      fields: [],
    },
  ];
}
