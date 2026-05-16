import { ApiError } from "./errors";

type Method = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOpts {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

const BASE_URL = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// --- Auth token hook (injected from authStore on app boot; avoids circular imports). ---
let accessTokenGetter: () => string | null = () => null;
let setAccessToken: (t: string | null) => void = () => {};
let onAuthFailure: () => void = () => {};

export function configureApiClient(opts: {
  getAccessToken: () => string | null;
  setAccessToken: (t: string | null) => void;
  onAuthFailure: () => void;
}) {
  accessTokenGetter = opts.getAccessToken;
  setAccessToken = opts.setAccessToken;
  onAuthFailure = opts.onAuthFailure;
}

// --- Single-flight refresh: all concurrent 401s coalesce onto one /refresh promise. ---
let inflightRefresh: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (inflightRefresh) return inflightRefresh;
  inflightRefresh = (async () => {
    try {
      const res = await fetch(`${BASE_URL()}/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const body = (await res.json()) as { access_token?: string };
      if (!body.access_token) return false;
      setAccessToken(body.access_token);
      return true;
    } catch {
      return false;
    } finally {
      inflightRefresh = null;
    }
  })();
  return inflightRefresh;
}

function buildUrl(path: string, query?: RequestOpts["query"]) {
  const url = new URL(`${BASE_URL()}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function doFetch(
  path: string,
  opts: RequestOpts,
  withAuth: boolean
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withAuth) {
    const t = accessTokenGetter();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? "GET",
    headers,
    credentials: "include",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
}

export async function request<T>(
  path: string,
  opts: RequestOpts = {},
  withAuth = true
): Promise<T> {
  let res = await doFetch(path, opts, withAuth);

  if (res.status === 401 && withAuth) {
    const ok = await refreshAccessToken();
    if (!ok) {
      onAuthFailure();
      throw new ApiError(401, null, "Authentication failed");
    }
    res = await doFetch(path, opts, withAuth);
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // body is non-JSON or empty; leave as null
    }
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOpts, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOpts, "method" | "body">
  ) => request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOpts, "method" | "body">
  ) => request<T>(path, { ...opts, method: "PUT", body }),
  delete: <T>(path: string, opts?: Omit<RequestOpts, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
  // Public variants: no Authorization header, no refresh-on-401.
  publicPost: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }, false),
};

// Exported for tests that need to reset the single-flight slot between cases.
export function __resetApiClientForTests() {
  inflightRefresh = null;
  accessTokenGetter = () => null;
  setAccessToken = () => {};
  onAuthFailure = () => {};
}
