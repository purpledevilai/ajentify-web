import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ApiError } from "@/lib/api/errors";

// --- next/navigation -------------------------------------------------------
const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/oauth/authorize",
  useSearchParams: () => new URLSearchParams(search),
}));

// --- API --------------------------------------------------------------------
const preview = vi.fn();
const grant = vi.fn();
vi.mock("@/lib/api/oauth-authorize", () => ({
  oauthAuthorizeApi: {
    preview: (...a: unknown[]) => preview(...a),
    grant: (...a: unknown[]) => grant(...a),
  },
}));

import OAuthAuthorizePage from "../page";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";

const USER = {
  id: "u1",
  email: "a@b.co",
  first_name: "A",
  last_name: "B",
  organizations: [
    { id: "o1", name: "Acme" },
    { id: "o2", name: "Beta" },
  ],
};

const QUERY = new URLSearchParams({
  response_type: "code",
  client_id: "https://claude.ai/oauth/mcp-oauth-client-metadata",
  redirect_uri: "https://claude.ai/api/mcp/auth_callback",
  scope: "filesystem:read filesystem:write",
  state: "st-123",
  code_challenge: "cc",
  code_challenge_method: "S256",
  resource: "https://api.ajentify.com/mcp",
}).toString();

const PREVIEW = {
  client_name: "Claude",
  client_uri: "https://claude.ai",
  client_host: "claude.ai",
  redirect_host: "claude.ai",
  is_loopback: false,
  scopes: [
    { scope: "filesystem:read", description: "Read" },
    { scope: "filesystem:write", description: "Write" },
  ],
  resource: "https://api.ajentify.com/mcp",
  orgs: [
    { org_id: "o1", name: "Acme" },
    { org_id: "o2", name: "Beta" },
  ],
};

let originalLocation: Location;
let replaced: string[];

function signedIn() {
  useAuthStore.setState({
    accessToken: "jwt",
    user: USER,
    bootstrapped: true,
    bootstrapping: false,
  });
}

beforeEach(() => {
  replace.mockReset();
  preview.mockReset();
  grant.mockReset();
  replaced = [];
  originalLocation = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      href: "http://localhost:3000/oauth/authorize",
      replace: (u: string) => replaced.push(u),
    },
  });
  useAuthStore.setState({
    accessToken: null,
    user: null,
    bootstrapped: false,
    bootstrapping: false,
  });
  useOrgStore.setState({ organizations: [], activeOrgId: null });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

describe("/oauth/authorize page", () => {
  it("renders an error card (no redirect, no login bounce) for a malformed request", async () => {
    search = new URLSearchParams({
      response_type: "token",
      client_id: "x",
      redirect_uri: "https://claude.ai/cb",
      state: "s",
      code_challenge: "c",
      code_challenge_method: "S256",
    }).toString();
    render(<OAuthAuthorizePage />);
    expect(await screen.findByText("Invalid authorization request")).toBeInTheDocument();
    expect(screen.getByText(/Only "code" is supported/)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(replaced).toEqual([]);
    expect(preview).not.toHaveBeenCalled();
  });

  it("bounces signed-out users to /login with the full authorize URL in next=", async () => {
    search = QUERY;
    // Simulate a failed /refresh bootstrap.
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 401 })) as unknown as typeof fetch;
    render(<OAuthAuthorizePage />);
    await waitFor(() => expect(replace).toHaveBeenCalled());
    const target = replace.mock.calls[0][0] as string;
    expect(target.startsWith("/login?next=")).toBe(true);
    const next = new URLSearchParams(target.slice("/login".length)).get("next");
    expect(next).toBe(`/oauth/authorize?${QUERY}`);
    expect(preview).not.toHaveBeenCalled();
  });

  it("previews with oauth_client_id naming, renders consent, grants and redirects", async () => {
    search = QUERY;
    signedIn();
    useOrgStore.setState({ activeOrgId: "o2" });
    preview.mockResolvedValue(PREVIEW);
    grant.mockResolvedValue({
      redirect_uri: "https://claude.ai/api/mcp/auth_callback?code=abc&state=st-123&iss=x",
    });

    render(<OAuthAuthorizePage />);

    expect(await screen.findByText("Authorize Claude")).toBeInTheDocument();
    expect(preview).toHaveBeenCalledWith({
      oauth_client_id: "https://claude.ai/oauth/mcp-oauth-client-metadata",
      redirect_uri: "https://claude.ai/api/mcp/auth_callback",
      scope: "filesystem:read filesystem:write",
      state: "st-123",
      code_challenge: "cc",
      code_challenge_method: "S256",
      resource: "https://api.ajentify.com/mcp",
    });

    // Both access levels offered; broadest selected by default.
    const readOnly = screen.getByLabelText(/Read only/) as HTMLInputElement;
    const readWrite = screen.getByLabelText(/Read & write/) as HTMLInputElement;
    expect(readOnly.checked).toBe(false);
    expect(readWrite.checked).toBe(true);
    expect(screen.queryByText("Local application")).not.toBeInTheDocument();

    // Narrow to read only, then Allow.
    fireEvent.click(readOnly);
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));

    await waitFor(() => expect(grant).toHaveBeenCalledTimes(1));
    expect(grant).toHaveBeenCalledWith({
      oauth_client_id: "https://claude.ai/oauth/mcp-oauth-client-metadata",
      redirect_uri: "https://claude.ai/api/mcp/auth_callback",
      scope: "filesystem:read",
      requested_scope: "filesystem:read filesystem:write",
      state: "st-123",
      code_challenge: "cc",
      code_challenge_method: "S256",
      resource: "https://api.ajentify.com/mcp",
      org_id: "o2", // active org wins when it is in the preview's org list
    });
    await waitFor(() =>
      expect(replaced).toEqual([
        "https://claude.ai/api/mcp/auth_callback?code=abc&state=st-123&iss=x",
      ])
    );
  });

  it("only offers Read only when the client asked for read, and Deny redirects with access_denied", async () => {
    const q = new URLSearchParams(QUERY);
    q.set("scope", "filesystem:read");
    q.set("redirect_uri", "http://127.0.0.1:51234/callback?app=cc");
    search = q.toString();
    signedIn();
    preview.mockResolvedValue({
      ...PREVIEW,
      client_name: "Claude Code",
      redirect_host: "127.0.0.1",
      is_loopback: true,
      scopes: [{ scope: "filesystem:read", description: "Read" }],
    });

    render(<OAuthAuthorizePage />);
    expect(await screen.findByText("Authorize Claude Code")).toBeInTheDocument();
    expect(screen.getByLabelText(/Read only/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Read & write/)).not.toBeInTheDocument();
    expect(screen.getByText("Local application")).toBeInTheDocument();
    expect(screen.getByText(/redirect to a local application/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    expect(grant).not.toHaveBeenCalled();
    expect(replaced).toHaveLength(1);
    const u = new URL(replaced[0]);
    expect(u.origin + u.pathname).toBe("http://127.0.0.1:51234/callback");
    expect(u.searchParams.get("app")).toBe("cc"); // existing query preserved
    expect(u.searchParams.get("error")).toBe("access_denied");
    expect(u.searchParams.get("state")).toBe("st-123");
  });

  it("shows an error card without redirecting on invalid_client", async () => {
    search = QUERY;
    signedIn();
    preview.mockRejectedValue(
      new ApiError(400, { error: "Unknown client", code: "invalid_client" })
    );
    render(<OAuthAuthorizePage />);
    expect(await screen.findByText("Unknown application")).toBeInTheDocument();
    expect(screen.getByText("Unknown client")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(replaced).toEqual([]);
  });

  it("forwards invalid_scope to the client (the API validated redirect_uri before scopes)", async () => {
    search = QUERY;
    signedIn();
    preview.mockRejectedValueOnce(
      new ApiError(400, { error: "Unknown scope", code: "invalid_scope" })
    );
    const { unmount } = render(<OAuthAuthorizePage />);
    await waitFor(() => expect(replaced).toHaveLength(1));
    const u = new URL(replaced[0]);
    expect(u.searchParams.get("error")).toBe("invalid_scope");
    expect(u.searchParams.get("state")).toBe("st-123");
    unmount();

    // invalid_redirect_uri → card, never a redirect.
    replaced = [];
    preview.mockRejectedValueOnce(
      new ApiError(400, { error: "redirect_uri is not registered for this client", code: "invalid_redirect_uri" })
    );
    render(<OAuthAuthorizePage />);
    expect(await screen.findByText(/redirect/i)).toBeInTheDocument();
    expect(replaced).toEqual([]);
  });

  it("shows an inline error with retry when grant fails", async () => {
    search = QUERY;
    signedIn();
    preview.mockResolvedValue(PREVIEW);
    grant
      .mockRejectedValueOnce(new ApiError(500, { error: "Storage unavailable" }))
      .mockResolvedValueOnce({ redirect_uri: "https://claude.ai/api/mcp/auth_callback?code=z&state=st-123" });

    render(<OAuthAuthorizePage />);
    await screen.findByText("Authorize Claude");
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Storage unavailable");
    expect(replaced).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(grant).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(replaced).toHaveLength(1));
  });
});
