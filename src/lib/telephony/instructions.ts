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

/**
 * Legacy one-field form Twilio still honours for consoles without a separate
 * auth field: `https://<org_id>:<secret>@api.<host>/telephony/twilio/voice`.
 * Userinfo is percent-encoded by the URL parser so odd secret characters
 * survive the round trip.
 */
export function twilioVoiceWebhookUrlWithBasicAuth(
  orgId: string,
  secret: string,
  base: string = apiBaseUrl()
): string {
  const url = new URL(twilioVoiceWebhookUrl(base));
  url.username = orgId;
  url.password = secret;
  return url.toString();
}

export interface TwilioBasicCredentials {
  username: string;
  password: string;
}

/** Twilio must send HTTP Basic auth with the org id as the username and the
 *  org's telephony secret as the password. */
export function twilioBasicCredentials(orgId: string, secret: string): TwilioBasicCredentials {
  return { username: orgId, password: secret };
}

/** A copyable field inside a setup step. */
export interface SetupField {
  label: string;
  value: string;
  /** Render as a masked secret with a reveal toggle. */
  secret?: boolean;
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
  orgId: string;
  /** `null` while the secret is still loading; fields are rendered as pending. */
  secret: string | null;
  base?: string;
}

export const SECRET_PENDING = "…";

/**
 * The ordered steps shown in the instructions panel. Kept as data so the
 * renderer stays dumb and the content is unit-testable.
 */
export function twilioSetupSteps({ orgId, secret, base }: TwilioSetupInput): SetupStep[] {
  const webhookUrl = twilioVoiceWebhookUrl(base);
  const hasSecret = secret !== null && secret.length > 0;
  const creds = twilioBasicCredentials(orgId, hasSecret ? secret : SECRET_PENDING);
  const urlForm = hasSecret
    ? twilioVoiceWebhookUrlWithBasicAuth(orgId, secret, base)
    : SECRET_PENDING;
  return [
    {
      title: "Point the number at Ajentify",
      description:
        "In the Twilio Console open Phone Numbers → Manage → Active numbers, pick your number and scroll to Voice configuration. Under “A call comes in” choose Webhook, paste the URL below (it carries your organization's credentials) and set the method to HTTP POST.",
      fields: [
        { label: "Webhook URL (with credentials)", value: urlForm, secret: true, mono: true },
        { label: "HTTP method", value: "POST", mono: true },
      ],
      note:
        "Ajentify only answers calls that carry these credentials. Twilio's newer Webhooks configuration API (Settings + Rules) does not apply to Programmable Voice call webhooks yet, so the credentials must live in the URL. Rotate the secret from this page if it is ever exposed.",
    },
    {
      title: "Reference: the credentials in that URL",
      description:
        "HTTP Basic, username = your organization id, password = the telephony secret. Shown here in case your tooling sets Basic auth separately from the URL.",
      fields: [
        { label: "Plain webhook URL", value: webhookUrl, mono: true },
        { label: "Username (organization id)", value: creds.username, mono: true },
        { label: "Password (telephony secret)", value: creds.password, secret: true, mono: true },
      ],
    },
    {
      title: "Optional: verify Twilio's signatures",
      description:
        "Paste your Twilio Auth Token into the number's settings (Edit → Twilio auth token) so Ajentify can also check the X-Twilio-Signature header on every request. SharedKey secrets are coming soon.",
      fields: [],
    },
    {
      title: "Call the number",
      description:
        "Attach a realtime agent to the number, then call it. The agent answers; if the number isn't connected you'll hear a short message and the call hangs up.",
      fields: [],
    },
  ];
}
