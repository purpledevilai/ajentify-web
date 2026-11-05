import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureApiClient, __resetApiClientForTests } from "../client";
import { phoneNumbersApi } from "../phone-numbers";
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

describe("phoneNumbersApi", () => {
  it("lists by org_id or agent_id on /phone-numbers", async () => {
    mockFetch(() => ({ json: { phone_numbers: [] } }));
    const byOrg = await phoneNumbersApi.listByOrg("o1");
    expect(captured[0].method).toBe("GET");
    expect(captured[0].url.pathname).toBe("/phone-numbers");
    expect(captured[0].url.searchParams.get("org_id")).toBe("o1");
    expect(captured[0].url.searchParams.has("agent_id")).toBe(false);
    expect(byOrg.phone_numbers).toEqual([]);

    mockFetch(() => ({ json: { phone_numbers: [] } }));
    await phoneNumbersApi.listByAgent("ag1");
    expect(captured[0].url.pathname).toBe("/phone-numbers");
    expect(captured[0].url.searchParams.get("agent_id")).toBe("ag1");
    expect(captured[0].url.searchParams.has("org_id")).toBe(false);
  });

  it("performs CRUD on the contract routes", async () => {
    mockFetch();
    await phoneNumbersApi.create({
      org_id: "o1",
      phone_number: "+61400000000",
      twilio_auth_token: "tok123",
      twilio_account_sid: "AC" + "0".repeat(32),
      agent_id: "ag1",
      friendly_name: "Front desk",
    });
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url.pathname).toBe("/phone-number");
    expect(captured[0].body).toEqual({
      org_id: "o1",
      phone_number: "+61400000000",
      twilio_auth_token: "tok123",
      twilio_account_sid: "AC" + "0".repeat(32),
      agent_id: "ag1",
      friendly_name: "Front desk",
    });

    mockFetch();
    await phoneNumbersApi.get("pn1");
    expect(captured[0].method).toBe("GET");
    expect(captured[0].url.pathname).toBe("/phone-number/pn1");

    // Update is POST, not PUT; null detaches / clears the sid; the token is
    // replace-only.
    mockFetch();
    await phoneNumbersApi.update("pn1", {
      agent_id: null,
      twilio_auth_token: "n3w",
      twilio_account_sid: null,
    });
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url.pathname).toBe("/phone-number/pn1");
    expect(captured[0].body).toEqual({
      agent_id: null,
      twilio_auth_token: "n3w",
      twilio_account_sid: null,
    });

    mockFetch();
    await phoneNumbersApi.update("pn1", { agent_id: "ag2" });
    expect(captured[0].body).toEqual({ agent_id: "ag2" });

    mockFetch(() => ({ json: { success: true } }));
    const del = await phoneNumbersApi.delete("pn1");
    expect(captured[0].method).toBe("DELETE");
    expect(captured[0].url.pathname).toBe("/phone-number/pn1");
    expect(del).toEqual({ success: true });
  });

  it("surfaces a 409 for an already-registered number as ApiError", async () => {
    mockFetch(() => ({
      status: 409,
      json: { error: "phone number already registered", code: "phone_number_taken" },
    }));
    const err = await phoneNumbersApi
      .create({ org_id: "o1", phone_number: "+61400000000", twilio_auth_token: "tok" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(409);
    expect(((err as ApiError).body as { code: string }).code).toBe("phone_number_taken");
  });

  it("surfaces the 400 for a missing twilio_auth_token", async () => {
    mockFetch(() => ({
      status: 400,
      json: { error: "twilio_auth_token is required" },
    }));
    const err = await phoneNumbersApi
      .create({ org_id: "o1", phone_number: "+61400000000", twilio_auth_token: "" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect(((err as ApiError).body as { error: string }).error).toMatch(/twilio_auth_token/);
  });
});
