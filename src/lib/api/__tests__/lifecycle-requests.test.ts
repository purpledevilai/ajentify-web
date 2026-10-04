import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureApiClient, __resetApiClientForTests } from "../client";
import { jobsApi } from "../jobs";
import { orgApi } from "../organization";
import { userApi } from "../user";
import { ApiError } from "../errors";

interface Captured {
  url: string;
  method: string;
  body: unknown;
}

let captured: Captured[];

function mockFetch(status = 200, jsonValue: unknown = { ok: true }) {
  captured = [];
  globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    captured.push({
      url: String(url),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(JSON.stringify(jsonValue), { status });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  __resetApiClientForTests();
  configureApiClient({
    getAccessToken: () => "tok",
    setAccessToken: () => {},
    onAuthFailure: vi.fn(),
  });
});

const BASE = "https://api.test.invalid";

describe("jobsApi", () => {
  it("GET /job/{job_id}", async () => {
    mockFetch(200, { job_id: "j1", status: "queued" });
    const j = await jobsApi.get("j1");
    expect(j.job_id).toBe("j1");
    expect(captured[0]).toMatchObject({ url: `${BASE}/job/j1`, method: "GET" });
  });
});

describe("orgApi lifecycle", () => {
  it("rename posts {name} to /organization/{org_id}", async () => {
    mockFetch(200, { org_id: "o1", name: "New" });
    await orgApi.rename("o1", "New");
    expect(captured[0]).toMatchObject({
      url: `${BASE}/organization/o1`,
      method: "POST",
      body: { name: "New" },
    });
  });

  it("delete sends DELETE /organization/{org_id} with {confirm_name} and returns the 202 job", async () => {
    mockFetch(202, { job_id: "j9", status: "queued", poll_url: "/job/j9" });
    const job = await orgApi.delete("o1", "Acme");
    expect(job.job_id).toBe("j9");
    expect(captured[0]).toMatchObject({
      url: `${BASE}/organization/o1`,
      method: "DELETE",
      body: { confirm_name: "Acme" },
    });
  });

  it("surfaces the error code on confirm_name_mismatch", async () => {
    mockFetch(400, { error: "Name mismatch", code: "confirm_name_mismatch" });
    await expect(orgApi.delete("o1", "wrong")).rejects.toMatchObject({
      status: 400,
      body: { code: "confirm_name_mismatch" },
    } satisfies Partial<ApiError>);
  });

  it("listMembers GETs /organization/{org_id}/members", async () => {
    mockFetch(200, { members: [] });
    await orgApi.listMembers("o1");
    expect(captured[0]).toMatchObject({ url: `${BASE}/organization/o1/members`, method: "GET" });
  });

  it("removeMember DELETEs /organization/{org_id}/members/{user_id}", async () => {
    mockFetch(200, { success: true });
    await orgApi.removeMember("o1", "u2");
    expect(captured[0]).toMatchObject({
      url: `${BASE}/organization/o1/members/u2`,
      method: "DELETE",
    });
    expect(captured[0].body).toBeUndefined();
  });

  it("invite POSTs {email} to /organization/{org_id}/invite", async () => {
    mockFetch(200, { status: "invited", invite: { invite_id: "o1#a@b.co" } });
    const r = await orgApi.invite("o1", "a@b.co");
    expect(r.status).toBe("invited");
    expect(captured[0]).toMatchObject({
      url: `${BASE}/organization/o1/invite`,
      method: "POST",
      body: { email: "a@b.co" },
    });
  });

  it("listInvites GETs /organization/{org_id}/invites", async () => {
    mockFetch(200, { invites: [] });
    await orgApi.listInvites("o1");
    expect(captured[0]).toMatchObject({ url: `${BASE}/organization/o1/invites`, method: "GET" });
  });

  it("revokeInvite percent-encodes the `#` (and `@`) in invite_id", async () => {
    mockFetch(200, { success: true });
    await orgApi.revokeInvite("o1", "o1#ana@example.com");
    expect(captured[0].method).toBe("DELETE");
    expect(captured[0].url).toBe(
      `${BASE}/organization/o1/invites/${encodeURIComponent("o1#ana@example.com")}`
    );
    expect(captured[0].url).toContain("%23");
    expect(captured[0].url).not.toContain("#");
  });
});

describe("userApi.delete", () => {
  it("sends DELETE /user with {confirm_email} and returns the 202 body incl. orgs[]", async () => {
    mockFetch(202, {
      job_id: "j2",
      status: "queued",
      orgs: [{ org_id: "o1", name: "Solo", action: "delete" }],
    });
    const r = await userApi.delete("me@example.com");
    expect(r.job_id).toBe("j2");
    expect(r.orgs[0]).toMatchObject({ org_id: "o1", action: "delete" });
    expect(captured[0]).toMatchObject({
      url: `${BASE}/user`,
      method: "DELETE",
      body: { confirm_email: "me@example.com" },
    });
  });
});
