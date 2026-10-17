import { describe, it, expect } from "vitest";
import { isAllowedNext, resolvePostAuthDestination } from "../post-auth";
import type { ApiUser } from "@/types/api";

const withOrg: ApiUser = {
  id: "u1",
  email: "a@b.co",
  first_name: "A",
  last_name: "B",
  organizations: [{ id: "o1", name: "Acme" }],
};
const noOrg: ApiUser = { ...withOrg, organizations: [] };

const OAUTH_NEXT =
  "/oauth/authorize?response_type=code&client_id=https%3A%2F%2Fclaude.ai%2Fcimd&redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb&state=s&code_challenge=c&code_challenge_method=S256";

describe("isAllowedNext", () => {
  it("allows dashboard paths", () => {
    expect(isAllowedNext("/app")).toBe(true);
    expect(isAllowedNext("/app/agents")).toBe(true);
    expect(isAllowedNext("/app?tab=x")).toBe(true);
  });

  it("allows the OAuth consent page with its query", () => {
    expect(isAllowedNext("/oauth/authorize")).toBe(true);
    expect(isAllowedNext(OAUTH_NEXT)).toBe(true);
  });

  it("rejects everything else (strict allow-list)", () => {
    expect(isAllowedNext("/application")).toBe(false);
    expect(isAllowedNext("/apps")).toBe(false);
    expect(isAllowedNext("/oauth")).toBe(false);
    expect(isAllowedNext("/oauth/authorized")).toBe(false);
    expect(isAllowedNext("/oauth/token")).toBe(false);
    expect(isAllowedNext("//evil.example/app")).toBe(false);
    expect(isAllowedNext("https://evil.example/app")).toBe(false);
    expect(isAllowedNext("/login")).toBe(false);
    expect(isAllowedNext("")).toBe(false);
    expect(isAllowedNext(null)).toBe(false);
    expect(isAllowedNext(undefined)).toBe(false);
  });
});

describe("resolvePostAuthDestination", () => {
  it("sends org-less users to setup regardless of next", () => {
    expect(resolvePostAuthDestination(noOrg, "/app/agents")).toBe("/create-organization");
    expect(resolvePostAuthDestination(noOrg, OAUTH_NEXT)).toBe("/create-organization");
  });

  it("defaults to /app", () => {
    expect(resolvePostAuthDestination(withOrg)).toBe("/app");
  });

  it("honours allow-listed next values verbatim", () => {
    expect(resolvePostAuthDestination(withOrg, "/app/agents")).toBe("/app/agents");
    expect(resolvePostAuthDestination(withOrg, OAUTH_NEXT)).toBe(OAUTH_NEXT);
  });

  it("falls back to /app for anything off the allow-list", () => {
    expect(resolvePostAuthDestination(withOrg, "/oauth/token")).toBe("/app");
    expect(resolvePostAuthDestination(withOrg, "https://evil.example")).toBe("/app");
  });
});
