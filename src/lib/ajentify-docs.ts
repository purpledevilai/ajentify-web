const DOCS_HOST = "https://api.ajentify.com";

/**
 * Fetch a docs page from api.ajentify.com as markdown for the `view_docs`
 * client-side tool.
 *
 * The docs server returns markdown when the request's Accept header does not
 * indicate HTML. We deliberately constrain the path to anything under `/docs`
 * so the tool can't be coerced into fetching arbitrary API endpoints (which
 * would require auth headers we don't want to expose anyway).
 */
export async function fetchAjentifyDocs(rawPath?: string): Promise<{
  ok: boolean;
  path?: string;
  markdown?: string;
  status?: number;
  error?: string;
}> {
  const path = (rawPath ?? "/docs").trim() || "/docs";

  if (!path.startsWith("/docs")) {
    return { ok: false, error: "path must start with '/docs'" };
  }

  let url: URL;
  try {
    url = new URL(path, DOCS_HOST);
  } catch {
    return { ok: false, error: `invalid path: ${path}` };
  }
  if (url.origin !== DOCS_HOST) {
    return { ok: false, error: "path must resolve under api.ajentify.com/docs" };
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "text/markdown" },
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: `HTTP ${res.status}` };
  }
  return { ok: true, path: url.pathname, markdown: await res.text() };
}
