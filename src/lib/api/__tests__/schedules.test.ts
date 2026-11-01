import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureApiClient, __resetApiClientForTests } from "../client";
import { schedulesApi } from "../schedules";
import { ApiError } from "../errors";

interface Captured {
  url: URL;
  method: string;
  body: unknown;
}

let captured: Captured[];

function mockFetch(
  respond: (c: Captured) => { status?: number; json?: unknown } = () => ({})
) {
  captured = [];
  globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    const c: Captured = {
      url: new URL(String(url)),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    captured.push(c);
    const r = respond(c);
    return new Response(
      r.json !== undefined ? JSON.stringify(r.json) : JSON.stringify({}),
      { status: r.status ?? 200 }
    );
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  __resetApiClientForTests();
  configureApiClient({
    getAccessToken: () => "tok",
    setAccessToken: () => {},
    onAuthFailure: () => {},
  });
});

describe("schedulesApi", () => {
  it("lists by agent_id and performs CRUD on the contract routes", async () => {
    mockFetch(() => ({ json: { schedules: [] } }));
    const list = await schedulesApi.list("ag1");
    expect(captured[0].method).toBe("GET");
    expect(captured[0].url.pathname).toBe("/schedules");
    expect(captured[0].url.searchParams.get("agent_id")).toBe("ag1");
    expect(list.schedules).toEqual([]);

    mockFetch();
    await schedulesApi.create({
      agent_id: "ag1",
      name: "Morning digest",
      schedule_expression: "cron(0 9 * * ? *)",
      timezone: "Australia/Melbourne",
      enabled: true,
      prompt_args: { topic: "news" },
      message: null,
    });
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url.pathname).toBe("/schedule");
    expect(captured[0].body).toEqual({
      agent_id: "ag1",
      name: "Morning digest",
      schedule_expression: "cron(0 9 * * ? *)",
      timezone: "Australia/Melbourne",
      enabled: true,
      prompt_args: { topic: "news" },
      message: null,
    });

    mockFetch();
    await schedulesApi.get("s1");
    expect(captured[0].method).toBe("GET");
    expect(captured[0].url.pathname).toBe("/schedule/s1");

    mockFetch();
    await schedulesApi.update("s1", { enabled: false });
    // Update is POST, not PUT.
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url.pathname).toBe("/schedule/s1");
    expect(captured[0].body).toEqual({ enabled: false });

    mockFetch(() => ({ json: { success: true } }));
    const del = await schedulesApi.delete("s1");
    expect(captured[0].method).toBe("DELETE");
    expect(captured[0].url.pathname).toBe("/schedule/s1");
    expect(del).toEqual({ success: true });
  });

  it("run posts to /schedule/{id}/run and returns the 202 job body", async () => {
    mockFetch(() => ({
      status: 202,
      json: { job_id: "j1", status: "queued", poll_url: "/job/j1", request_id: "r1" },
    }));
    const job = await schedulesApi.run("s1");
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url.pathname).toBe("/schedule/s1/run");
    expect(captured[0].body).toBeUndefined();
    expect(job.job_id).toBe("j1");
    expect(job.poll_url).toBe("/job/j1");
  });

  it("surfaces validation errors as ApiError with the code", async () => {
    mockFetch(() => ({
      status: 400,
      json: { error: "bad expression", code: "invalid_schedule_expression" },
    }));
    const err = await schedulesApi
      .create({ agent_id: "ag1", schedule_expression: "nope" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect(((err as ApiError).body as { code: string }).code).toBe(
      "invalid_schedule_expression"
    );
  });
});
