/**
 * Stage-name sanitization and validation utilities.
 *
 * Stage names follow the pattern `^[a-z][a-z0-9-]{0,62}$` — lowercase
 * letters, digits, and hyphens only, must start with a letter, max 63
 * characters. This mirrors the backend `STAGE_NAME_PATTERN`.
 *
 * Modeled after `sanitizeFunctionName` in `tool-function-decl.ts` but
 * uses hyphens instead of underscores (stages are URL-slug-like names,
 * not Python identifiers).
 */

const STAGE_NAME_REGEX = /^[a-z][a-z0-9-]{0,62}$/;

/**
 * Sanitize a free-text stage name into a valid stage identifier.
 *
 * - Lowercases.
 * - Replaces any character outside `[a-z0-9-]` with `-`.
 * - Strips leading hyphens/digits so the result starts with a letter.
 * - Truncates to 63 characters.
 * - Returns an empty string when input is empty.
 *
 * Length-preserving in the common case (each invalid char becomes one
 * hyphen) so live sanitization in a controlled input doesn't break
 * cursor position.
 */
export function sanitizeStageName(raw: string): string {
  if (!raw) return "";
  let s = raw.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  s = s.replace(/^[^a-z]+/, "");
  return s.slice(0, 63);
}

/** True when `name` is a valid stage name (non-empty, matches the regex). */
export function isValidStageName(name: string): boolean {
  return STAGE_NAME_REGEX.test(name);
}
