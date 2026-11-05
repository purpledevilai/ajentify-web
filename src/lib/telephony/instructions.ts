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
        "In the Twilio Console open Phone Numbers → Manage → Active numbers, pick your number and scroll to Voice configuration. Under “A call comes in” choose Webhook, paste the URL below and set the method to HTTP POST.",
      fields: [
        { label: "Webhook URL", value: webhookUrl, mono: true },
        { label: "HTTP method", value: "POST", mono: true },
      ],
    },
    {
      title: "Add HTTP Basic authentication",
      description:
        "Ajentify only answers calls that carry your organization's credentials. Set the webhook's authentication to HTTP Basic with the username and password below.",
      fields: [
        { label: "Username (organization id)", value: creds.username, mono: true },
        { label: "Password (telephony secret)", value: creds.password, secret: true, mono: true },
        { label: "Alternative: single-field URL with credentials", value: urlForm, secret: true, mono: true },
      ],
      note:
        "If your console has no separate auth field, paste the single-field URL instead — Twilio still honours https://user:pass@host/… . The Webhooks configuration API (a Setting with auth.scheme BASIC plus a Rule for this URL) keeps the secret out of the URL and is the recommended option.",
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
