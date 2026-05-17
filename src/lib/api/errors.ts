/**
 * Standard backend error response body. The Lambda always returns `error`
 * (human-readable); `code` is a machine-readable discriminator handlers can
 * opt-in to (e.g. "email_not_verified_resent").
 */
export interface ApiErrorBody {
  error?: string;
  code?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message?: string
  ) {
    super(message ?? `API error ${status}`);
    this.name = "ApiError";
  }
}

/** Pulls the human-readable message off an error from the API client. */
export function getErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { body?: ApiErrorBody } | null)?.body;
  return body?.error ?? fallback;
}

/** Pulls the machine-readable code off an error from the API client. */
export function getErrorCode(err: unknown): string | undefined {
  const body = (err as { body?: ApiErrorBody } | null)?.body;
  return body?.code;
}
