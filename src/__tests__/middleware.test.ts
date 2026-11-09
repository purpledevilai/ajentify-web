// @vitest-environment node
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

function req(url: string, authed = false) {
  const r = new NextRequest(new URL(url, "http://localhost:3000"));
  if (authed) r.cookies.set("is_authenticated", "true");
  return r;
}

describe("middleware auth redirect", () => {
  it("sends unauthenticated /app visitors to /login with `next` = path", () => {
    const res = middleware(req("/app/agents"));
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("next")).toBe("/app/agents");
  });

  it("preserves the query string in `next` (chat deep link)", () => {
    const res = middleware(req("/app/chat/abc?add_message=a%20b&x=1"));
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/login");
    // Only `next` is carried on the login URL — the original params live
    // inside it, not alongside it.
    expect([...loc.searchParams.keys()]).toEqual(["next"]);
    expect(loc.searchParams.get("next")).toBe("/app/chat/abc?add_message=a%20b&x=1");
  });

  it("lets authenticated users through", () => {
    const res = middleware(req("/app/chat/abc?add_message=a", true));
    expect(res.headers.get("location")).toBeNull();
  });

  it("bounces authenticated users off /login to /app", () => {
    const res = middleware(req("/login", true));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/app");
  });
});
