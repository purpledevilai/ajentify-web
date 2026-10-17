import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureApiClient, __resetApiClientForTests } from "../client";
import { filesystemsApi } from "../filesystems";
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

describe("filesystemsApi", () => {
  it("lists by org and performs filesystem CRUD on the right routes", async () => {
    mockFetch(() => ({ json: { filesystems: [] } }));
    await filesystemsApi.list("org1");
    expect(captured[0].url.pathname).toBe("/filesystems");
    expect(captured[0].url.searchParams.get("org_id")).toBe("org1");

    mockFetch();
    await filesystemsApi.create({ org_id: "org1", name: "n", description: "d" });
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url.pathname).toBe("/filesystem");
    expect(captured[0].body).toEqual({ org_id: "org1", name: "n", description: "d" });

    mockFetch();
    await filesystemsApi.get("fs1");
    expect(captured[0].url.pathname).toBe("/filesystem/fs1");

    mockFetch();
    await filesystemsApi.update("fs1", { description: "x" });
    expect(captured[0].method).toBe("PUT");
    expect(captured[0].body).toEqual({ description: "x" });

    mockFetch(() => ({ json: { filesystem_id: "fs1", deleted: { folders: 1, files: 2 } } }));
    const del = await filesystemsApi.delete("fs1");
    expect(captured[0].method).toBe("DELETE");
    expect(del.deleted).toEqual({ folders: 1, files: 2 });
  });

  it("fetches tree and node with internal paths as query", async () => {
    mockFetch(() => ({ json: { filesystem_id: "fs1", name: "n", description: "", nodes: [] } }));
    await filesystemsApi.tree("fs1");
    expect(captured[0].url.pathname).toBe("/filesystem/fs1/tree");

    mockFetch(() => ({ json: { type: "folder", path: "/", children: [] } }));
    await filesystemsApi.node("fs1", "/projects/a b");
    expect(captured[0].url.pathname).toBe("/filesystem/fs1/node");
    expect(captured[0].url.searchParams.get("path")).toBe("/projects/a b");
  });

  it("sends folder/file mutations with the contract bodies", async () => {
    mockFetch();
    await filesystemsApi.createFolder("fs1", {
      path: "/a",
      description: "d",
      create_parents: true,
    });
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url.pathname).toBe("/filesystem/fs1/folder");
    expect(captured[0].body).toEqual({ path: "/a", description: "d", create_parents: true });

    mockFetch();
    await filesystemsApi.updateFolder("fs1", { path: "/a", description: "e" });
    expect(captured[0].method).toBe("PUT");
    expect(captured[0].url.pathname).toBe("/filesystem/fs1/folder");

    mockFetch();
    await filesystemsApi.createFile("fs1", { path: "/a/f.md", content: "# hi" });
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url.pathname).toBe("/filesystem/fs1/file");

    mockFetch();
    await filesystemsApi.updateFile("fs1", {
      path: "/a/f.md",
      content: "x",
      expected_updated_at: 123,
    });
    expect(captured[0].method).toBe("PUT");
    expect(captured[0].body).toEqual({ path: "/a/f.md", content: "x", expected_updated_at: 123 });

    mockFetch();
    await filesystemsApi.move("fs1", { source_path: "/a", destination_path: "/b" });
    expect(captured[0].url.pathname).toBe("/filesystem/fs1/move");
    expect(captured[0].body).toEqual({ source_path: "/a", destination_path: "/b" });
  });

  it("deletes nodes with path + recursive query and searches with q/path/scope/limit", async () => {
    mockFetch(() => ({ json: { path: "/a", type: "folder", deleted: { folders: 0, files: 3 } } }));
    await filesystemsApi.deleteNode("fs1", "/a", true);
    expect(captured[0].method).toBe("DELETE");
    expect(captured[0].url.pathname).toBe("/filesystem/fs1/node");
    expect(captured[0].url.searchParams.get("path")).toBe("/a");
    expect(captured[0].url.searchParams.get("recursive")).toBe("true");

    mockFetch(() => ({ json: { query: "q", path: "/", matches: [], truncated: false } }));
    await filesystemsApi.search("fs1", "q", { path: "/a", scope: "both", limit: 20 });
    const u = captured[0].url;
    expect(u.pathname).toBe("/filesystem/fs1/search");
    expect(u.searchParams.get("q")).toBe("q");
    expect(u.searchParams.get("path")).toBe("/a");
    expect(u.searchParams.get("scope")).toBe("both");
    expect(u.searchParams.get("limit")).toBe("20");
  });

  it("surfaces 409 conflict / folder_not_empty as ApiError with the code", async () => {
    mockFetch(() => ({ status: 409, json: { error: "stale", code: "conflict" } }));
    const err = await filesystemsApi
      .updateFile("fs1", { path: "/f", content: "", expected_updated_at: 1 })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(409);
    expect(((err as ApiError).body as { code: string }).code).toBe("conflict");

    mockFetch(() => ({ status: 409, json: { error: "not empty", code: "folder_not_empty" } }));
    const err2 = await filesystemsApi.deleteNode("fs1", "/a").catch((e) => e);
    expect(((err2 as ApiError).body as { code: string }).code).toBe("folder_not_empty");
  });
});
