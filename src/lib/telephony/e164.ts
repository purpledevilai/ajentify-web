/**
 * E.164 phone numbers: a leading `+`, a non-zero first digit, then 7–15
 * digits in total. Matches the API's server-side validation exactly.
 */
export const E164_RE = /^\+[1-9]\d{6,14}$/;

export function isE164(value: string): boolean {
  return E164_RE.test(value);
}

/**
 * Best-effort cleanup of what people paste from Twilio or a contacts app:
 * strips spaces, dashes, dots and parentheses and turns a leading `00` into
 * `+`. Does NOT add a country code — a number without `+` stays invalid.
 */
export function normalizePhoneInput(raw: string): string {
  let s = raw.trim().replace(/[\s\-.()]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  return s;
}
