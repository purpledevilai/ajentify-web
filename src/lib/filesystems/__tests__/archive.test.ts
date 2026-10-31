import { describe, it, expect, vi, afterEach } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import {
  DESCRIPTION_FILE_NAME,
  MAX_IMPORT_FILE_BYTES,
  buildExportEntries,
  classifyImportError,
  downloadBytes,
  exportFilesystem,
  mapPool,
  pickedFilesFromFileList,
  planImport,
  runImport,
  sanitizeArchiveName,
  zipEntries,
  type ExportTree,
  type ImportClient,
  type ImportPlan,
  type ImportProgress,
  type PickedFile,
} from "../archive";
import { ApiError } from "@/lib/api/errors";
import type { ApiFilesystemTreeNode } from "@/types/api";

/* ------------------------------------------------------------------------ */
/* helpers                                                                  */
/* ------------------------------------------------------------------------ */

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

/** PickedFile from a string (UTF-8) or raw bytes. */
function pf(relativePath: string, content: string | Uint8Array): PickedFile {
  const bytes =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  return {
    relativePath,
    size: bytes.byteLength,
    arrayBuffer: () => Promise.resolve(toArrayBuffer(bytes)),
  };
}

const node = (
  path: string,
  type: "folder" | "file",
  extra: Partial<ApiFilesystemTreeNode> = {}
): ApiFilesystemTreeNode => ({
  path,
  type,
  name: path.split("/").pop()!,
  parent_path: path.split("/").slice(0, -1).join("/") || "/",
  size_bytes: 0,
  updated_at: 1,
  ...extra,
});

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (e: unknown) => void;
}
function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let pending microtasks + a macrotask tick settle. */
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

const plan = (p: Partial<ImportPlan>): ImportPlan => ({
  rootName: "",
  rootDescription: "",
  folders: [],
  files: [],
  skipped: [],
  totalBytes: 0,
  ...p,
});

const planFolder = (path: string, description = "") => ({
  path,
  description,
  depth: path.split("/").filter(Boolean).length,
});
const planFile = (path: string, content = "x") => ({
  path,
  content,
  size: new TextEncoder().encode(content).length,
});

/* ------------------------------------------------------------------------ */
/* pickedFilesFromFileList                                                  */
/* ------------------------------------------------------------------------ */

describe("pickedFilesFromFileList", () => {
  it("uses webkitRelativePath when present, else name", () => {
    const plain = new File(["hi"], "a.md");
    const nested = new File(["hello"], "b.md");
    Object.defineProperty(nested, "webkitRelativePath", { value: "root/dir/b.md" });
    const picked = pickedFilesFromFileList([plain, nested]);
    expect(picked.map((p) => p.relativePath)).toEqual(["a.md", "root/dir/b.md"]);
    expect(picked.map((p) => p.size)).toEqual([2, 5]);
    expect(typeof picked[0].arrayBuffer).toBe("function");
  });
});

/* ------------------------------------------------------------------------ */
/* planImport                                                               */
/* ------------------------------------------------------------------------ */

describe("planImport", () => {
  it("strips the common root, reads descriptions, builds ancestor folders", async () => {
    const p = await planImport([
      pf("root/.description.md", "  Root desc \n"),
      pf("root/b/z.md", "zz"),
      pf("root/a/.description.md", "A folder\n"),
      pf("root/a/x.md", "hello"),
      pf("root/a/deep/er/w.txt", "w"),
      pf("root/only-desc/.description.md", "Lonely"),
      pf("root/top.md", "top"),
    ]);
    expect(p.rootName).toBe("root");
    expect(p.rootDescription).toBe("Root desc");
    expect(p.folders).toEqual([
      { path: "/a", description: "A folder", depth: 1 },
      { path: "/b", description: "", depth: 1 },
      { path: "/only-desc", description: "Lonely", depth: 1 },
      { path: "/a/deep", description: "", depth: 2 },
      { path: "/a/deep/er", description: "", depth: 3 },
    ]);
    expect(p.files.map((f) => f.path)).toEqual([
      "/a/deep/er/w.txt",
      "/a/x.md",
      "/b/z.md",
      "/top.md",
    ]);
    expect(p.files.find((f) => f.path === "/a/x.md")).toEqual({
      path: "/a/x.md",
      content: "hello",
      size: 5,
    });
    expect(p.files.some((f) => f.path.endsWith(DESCRIPTION_FILE_NAME))).toBe(false);
    expect(p.totalBytes).toBe(1 + 5 + 2 + 3);
    expect(p.skipped).toEqual([]);
  });

  it("keeps paths unchanged when there is no common root", async () => {
    const p = await planImport([pf("a.md", "a"), pf("b/c.md", "c")]);
    expect(p.rootName).toBe("");
    expect(p.files.map((f) => f.path)).toEqual(["/a.md", "/b/c.md"]);
    expect(p.folders).toEqual([{ path: "/b", description: "", depth: 1 }]);
  });

  it("returns an empty plan for no files", async () => {
    const p = await planImport([]);
    expect(p).toEqual({
      rootName: "",
      rootDescription: "",
      folders: [],
      files: [],
      skipped: [],
      totalBytes: 0,
    });
  });

  it("applies the targetPath prefix to folders and files", async () => {
    const p = await planImport(
      [pf("root/a/b/x.md", "x"), pf("root/a/.description.md", "A"), pf("root/y.md", "y")],
      { targetPath: "/docs" }
    );
    expect(p.folders).toEqual([
      { path: "/docs/a", description: "A", depth: 2 },
      { path: "/docs/a/b", description: "", depth: 3 },
    ]);
    expect(p.files.map((f) => f.path)).toEqual(["/docs/a/b/x.md", "/docs/y.md"]);
  });

  it("skips litter, binaries, oversized and invalid paths, and duplicates", async () => {
    const longSeg = "x".repeat(300);
    const p = await planImport([
      pf("root/.DS_Store", "junk"),
      pf("root/node_modules/x.js", "module.exports = 1"),
      pf("root/img.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe])),
      pf("root/data.bin", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe])),
      pf("root/nul.txt", "abc\u0000def"),
      pf("root/big.txt", new Uint8Array(MAX_IMPORT_FILE_BYTES + 1).fill(0x61)),
      pf(`root/${longSeg}/x.md`, "x"),
      pf("root/dup.md", "first"),
      pf("root\\dup.md", "second"),
      pf("root/ok.md", "ok"),
    ]);
    const byPath = Object.fromEntries(p.skipped.map((s) => [s.relativePath, s]));
    expect(byPath["root/.DS_Store"].reason).toBe("ignored");
    expect(byPath["root/node_modules/x.js"].reason).toBe("ignored");
    expect(byPath["root/img.png"].reason).toBe("binary");
    expect(byPath["root/data.bin"].reason).toBe("binary");
    expect(byPath["root/nul.txt"].reason).toBe("binary");
    expect(byPath["root/big.txt"].reason).toBe("too_large");
    expect(byPath["root/big.txt"].detail).toBe("256 KB > 256 KB");
    expect(byPath[`root/${longSeg}/x.md`].reason).toBe("invalid_path");
    expect(byPath[`root/${longSeg}/x.md`].detail).toMatch(/255/);
    expect(byPath["root\\dup.md"]).toEqual({
      relativePath: "root\\dup.md",
      reason: "invalid_path",
      detail: "duplicate path",
    });
    expect(p.skipped).toHaveLength(8);
    expect(p.files.map((f) => f.path)).toEqual(["/dup.md", "/ok.md"]);
    expect(p.files[0].content).toBe("first");
    expect(p.folders).toEqual([]);
  });

  it("accepts a file exactly at the byte limit", async () => {
    const exact = new Uint8Array(MAX_IMPORT_FILE_BYTES).fill(0x61);
    const p = await planImport([pf("root/exact.txt", exact), pf("root/x.md", "x")]);
    expect(p.skipped).toEqual([]);
    expect(p.files.find((f) => f.path === "/exact.txt")!.size).toBe(MAX_IMPORT_FILE_BYTES);
  });

  it("strips the BOM, keeps CRLF, normalises backslash and ./ paths", async () => {
    const p = await planImport([
      pf("root\\a\\crlf.txt", "\uFEFFline1\r\nline2\r\n"),
      pf("./root/b.md", "b"),
      pf("root/.description.md", "\uFEFF desc "),
    ]);
    expect(p.rootName).toBe("root");
    expect(p.rootDescription).toBe("desc");
    expect(p.files.map((f) => f.path)).toEqual(["/a/crlf.txt", "/b.md"]);
    expect(p.files[0].content).toBe("line1\r\nline2\r\n");
    expect(p.files[0].size).toBe(14);
    expect(p.folders).toEqual([{ path: "/a", description: "", depth: 1 }]);
  });

  it("marks an undecodable description file as binary", async () => {
    const p = await planImport([
      pf("root/a/.description.md", new Uint8Array([0xff, 0xfe, 0x00])),
      pf("root/a/x.md", "x"),
    ]);
    expect(p.skipped).toEqual([
      { relativePath: "root/a/.description.md", reason: "binary", detail: "not valid UTF-8" },
    ]);
    expect(p.folders).toEqual([{ path: "/a", description: "", depth: 1 }]);
  });
});

/* ------------------------------------------------------------------------ */
/* classifyImportError                                                      */
/* ------------------------------------------------------------------------ */

describe("classifyImportError", () => {
  it("maps already_exists to exists", () => {
    expect(classifyImportError(new ApiError(409, { code: "already_exists" }))).toEqual({
      status: "exists",
    });
  });
  it("uses the API error body message", () => {
    expect(classifyImportError(new ApiError(500, { error: "boom" }))).toEqual({
      status: "failed",
      error: "boom",
    });
  });
  it("uses Error.message for plain errors", () => {
    expect(classifyImportError(new Error("network down"))).toEqual({
      status: "failed",
      error: "network down",
    });
  });
  it("falls back for non-errors", () => {
    expect(classifyImportError("nope")).toEqual({ status: "failed", error: "Request failed" });
    expect(classifyImportError(null)).toEqual({ status: "failed", error: "Request failed" });
  });
});

/* ------------------------------------------------------------------------ */
/* mapPool                                                                  */
/* ------------------------------------------------------------------------ */

describe("mapPool", () => {
  it("preserves order and settles every item", async () => {
    const results = await mapPool([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("two");
      return n * 10;
    });
    expect(results).toEqual([
      { status: "fulfilled", value: 10 },
      { status: "rejected", reason: new Error("two") },
      { status: "fulfilled", value: 30 },
    ]);
  });
});

/* ------------------------------------------------------------------------ */
/* runImport                                                                */
/* ------------------------------------------------------------------------ */

type Call = { kind: "folder" | "file"; path: string; createParents: boolean };

function recordingClient(
  impl: (call: Call) => Promise<void> = () => Promise.resolve()
): ImportClient & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    createFolder(path, _description, createParents) {
      const call = { kind: "folder" as const, path, createParents };
      calls.push(call);
      return impl(call);
    },
    createFile(path, _content, createParents) {
      const call = { kind: "file" as const, path, createParents };
      calls.push(call);
      return impl(call);
    },
  };
}

describe("runImport", () => {
  it("creates folders depth by depth, then files, with the right createParents", async () => {
    const pending = new Map<string, Deferred>();
    const client = recordingClient((call) => {
      const d = deferred();
      pending.set(call.path, d);
      return d.promise;
    });
    const p = plan({
      folders: [planFolder("/a"), planFolder("/b"), planFolder("/a/c"), planFolder("/a/c/d")],
      files: [planFile("/a/c/d/x.md"), planFile("/top.md")],
    });
    const run = runImport(p, client, { concurrency: 6 });

    await flush();
    expect(client.calls.map((c) => c.path)).toEqual(["/a", "/b"]);
    pending.get("/a")!.resolve();
    await flush();
    // /b still pending → depth 2 must not have started
    expect(client.calls.map((c) => c.path)).toEqual(["/a", "/b"]);
    pending.get("/b")!.resolve();
    await flush();
    expect(client.calls.map((c) => c.path)).toEqual(["/a", "/b", "/a/c"]);
    pending.get("/a/c")!.resolve();
    await flush();
    expect(client.calls.map((c) => c.path)).toEqual(["/a", "/b", "/a/c", "/a/c/d"]);
    pending.get("/a/c/d")!.resolve();
    await flush();
    expect(client.calls.map((c) => c.path)).toEqual([
      "/a", "/b", "/a/c", "/a/c/d", "/a/c/d/x.md", "/top.md",
    ]);
    pending.get("/a/c/d/x.md")!.resolve();
    pending.get("/top.md")!.resolve();

    const result = await run;
    expect(client.calls.filter((c) => c.kind === "folder").every((c) => !c.createParents)).toBe(true);
    expect(client.calls.filter((c) => c.kind === "file").every((c) => c.createParents)).toBe(true);
    expect(result).toEqual({
      folders: { created: 4, exists: 0, failed: 0 },
      files: { created: 2, exists: 0, failed: 0 },
      items: [],
      cancelled: false,
    });
  });

  it("respects the concurrency limit", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const client = recordingClient(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await flush();
      inFlight--;
    });
    const files = Array.from({ length: 9 }, (_, i) => planFile(`/f${i}.md`));
    const result = await runImport(plan({ files }), client, { concurrency: 3 });
    expect(maxInFlight).toBe(3);
    expect(result.files.created).toBe(9);
  });

  it("counts exists and failed items and reports them", async () => {
    const client = recordingClient((call) => {
      if (call.path === "/a") return Promise.reject(new ApiError(409, { code: "already_exists" }));
      if (call.path === "/x.md") return Promise.reject(new ApiError(500, { error: "boom" }));
      if (call.path === "/y.md") return Promise.reject(new Error("offline"));
      return Promise.resolve();
    });
    const result = await runImport(
      plan({
        folders: [planFolder("/a"), planFolder("/b")],
        files: [planFile("/x.md"), planFile("/y.md"), planFile("/z.md")],
      }),
      client
    );
    expect(result.folders).toEqual({ created: 1, exists: 1, failed: 0 });
    expect(result.files).toEqual({ created: 1, exists: 0, failed: 2 });
    expect(result.items).toEqual([
      { path: "/a", type: "folder", status: "exists", error: undefined },
      { path: "/x.md", type: "file", status: "failed", error: "boom" },
      { path: "/y.md", type: "file", status: "failed", error: "offline" },
    ]);
    expect(result.cancelled).toBe(false);
  });

  it("emits a progress sequence ending at done === total with current null", async () => {
    const progress: ImportProgress[] = [];
    const client = recordingClient();
    await runImport(
      plan({ folders: [planFolder("/a")], files: [planFile("/a/x.md"), planFile("/b.md")] }),
      client,
      { concurrency: 1, onProgress: (p) => progress.push({ ...p }) }
    );
    expect(progress[0]).toEqual({ done: 0, total: 3, current: null });
    expect(progress.map((p) => p.done)).toEqual([0, 1, 2, 3]);
    expect(progress.every((p) => p.total === 3)).toBe(true);
    expect(progress[progress.length - 1]).toEqual({ done: 3, total: 3, current: null });
  });

  it("reports the last-started path while work is in flight", async () => {
    const progress: ImportProgress[] = [];
    const pending = new Map<string, Deferred>();
    const client = recordingClient((call) => {
      const d = deferred();
      pending.set(call.path, d);
      return d.promise;
    });
    const run = runImport(
      plan({ files: [planFile("/a.md"), planFile("/b.md")] }),
      client,
      { concurrency: 2, onProgress: (p) => progress.push({ ...p }) }
    );
    await flush();
    pending.get("/a.md")!.resolve();
    await flush();
    expect(progress[1]).toEqual({ done: 1, total: 2, current: "/b.md" });
    pending.get("/b.md")!.resolve();
    await run;
    expect(progress[2]).toEqual({ done: 2, total: 2, current: null });
  });

  it("stops launching new items after abort and sets cancelled", async () => {
    const pending = new Map<string, Deferred>();
    const client = recordingClient((call) => {
      const d = deferred();
      pending.set(call.path, d);
      return d.promise;
    });
    const controller = new AbortController();
    const files = Array.from({ length: 5 }, (_, i) => planFile(`/f${i}.md`));
    const run = runImport(plan({ files }), client, {
      concurrency: 2,
      signal: controller.signal,
    });
    await flush();
    expect(client.calls.map((c) => c.path)).toEqual(["/f0.md", "/f1.md"]);
    controller.abort();
    pending.get("/f0.md")!.resolve();
    pending.get("/f1.md")!.resolve();
    const result = await run;
    expect(client.calls).toHaveLength(2);
    expect(result).toEqual({
      folders: { created: 0, exists: 0, failed: 0 },
      files: { created: 2, exists: 0, failed: 0 },
      items: [],
      cancelled: true,
    });
  });

  it("returns immediately when the signal is already aborted", async () => {
    const client = recordingClient();
    const controller = new AbortController();
    controller.abort();
    const result = await runImport(
      plan({ folders: [planFolder("/a")], files: [planFile("/x.md")] }),
      client,
      { signal: controller.signal }
    );
    expect(client.calls).toEqual([]);
    expect(result).toEqual({
      folders: { created: 0, exists: 0, failed: 0 },
      files: { created: 0, exists: 0, failed: 0 },
      items: [],
      cancelled: true,
    });
  });
});

/* ------------------------------------------------------------------------ */
/* sanitizeArchiveName                                                      */
/* ------------------------------------------------------------------------ */

describe("sanitizeArchiveName", () => {
  it("replaces unsafe characters and trims junk", () => {
    expect(sanitizeArchiveName("My/Notes: v2?")).toBe("My-Notes- v2");
    expect(sanitizeArchiveName("  My   Notes  ")).toBe("My Notes");
    expect(sanitizeArchiveName("..hidden--")).toBe("hidden");
    expect(sanitizeArchiveName('a<b>c"d|e\\f*g\u0001h')).toBe("a-b-c-d-e-f-g-h");
    expect(sanitizeArchiveName("plain")).toBe("plain");
  });
  it("falls back to 'filesystem' when nothing is left", () => {
    expect(sanitizeArchiveName("")).toBe("filesystem");
    expect(sanitizeArchiveName("   ")).toBe("filesystem");
    expect(sanitizeArchiveName("///")).toBe("filesystem");
  });
  it("caps at 100 characters", () => {
    expect(sanitizeArchiveName("x".repeat(250))).toHaveLength(100);
  });
});

/* ------------------------------------------------------------------------ */
/* buildExportEntries / zipEntries                                          */
/* ------------------------------------------------------------------------ */

const sampleTree: ExportTree = {
  name: "My Notes",
  description: "root desc",
  nodes: [
    node("/top.md", "file"),
    node("/a/b/y.txt", "file"),
    node("/a", "folder", { description: "A" }),
    node("/a/x.md", "file"),
    node("/empty", "folder", { description: "E" }),
    node("/a/b", "folder", { description: "" }),
  ],
};
const sampleContents = new Map<string, string>([
  ["/a/x.md", "# X\n\nline\r\nmore"],
  ["/a/b/y.txt", "y content"],
  ["/top.md", "top"],
]);

describe("buildExportEntries", () => {
  it("writes root description first, one description per folder, files from the map", () => {
    const entries = buildExportEntries(sampleTree, sampleContents);
    expect(entries).toEqual([
      { path: "My Notes/.description.md", content: "root desc\n" },
      { path: "My Notes/a/.description.md", content: "A\n" },
      { path: "My Notes/a/b/.description.md", content: "\n" },
      { path: "My Notes/a/b/y.txt", content: "y content" },
      { path: "My Notes/a/x.md", content: "# X\n\nline\r\nmore" },
      { path: "My Notes/empty/.description.md", content: "E\n" },
      { path: "My Notes/top.md", content: "top" },
    ]);
  });

  it("skips files whose content is missing and treats null descriptions as empty", () => {
    const entries = buildExportEntries(
      {
        name: "n",
        description: "",
        nodes: [node("/f", "folder", { description: null }), node("/gone.md", "file")],
      },
      new Map()
    );
    expect(entries).toEqual([
      { path: "n/.description.md", content: "\n" },
      { path: "n/f/.description.md", content: "\n" },
    ]);
  });

  it("sanitises the root folder name", () => {
    const entries = buildExportEntries(
      { name: "a/b", description: "", nodes: [] },
      new Map()
    );
    expect(entries).toEqual([{ path: "a-b/.description.md", content: "\n" }]);
  });
});

describe("zipEntries", () => {
  it("produces a zip fflate can read back", () => {
    const bytes = zipEntries([
      { path: "r/.description.md", content: "d\n" },
      { path: "r/x.md", content: "héllo" },
    ]);
    expect(bytes[0]).toBe(0x50); // "PK"
    expect(bytes[1]).toBe(0x4b);
    const out = unzipSync(bytes);
    expect(Object.keys(out).sort()).toEqual(["r/.description.md", "r/x.md"]);
    expect(strFromU8(out["r/x.md"])).toBe("héllo");
  });
});

/* ------------------------------------------------------------------------ */
/* round trip                                                               */
/* ------------------------------------------------------------------------ */

describe("export → import round trip", () => {
  it("re-imports an exported zip with identical structure, descriptions and contents", async () => {
    const bytes = zipEntries(buildExportEntries(sampleTree, sampleContents));
    const unzipped = unzipSync(bytes);
    const picked: PickedFile[] = Object.entries(unzipped).map(([name, data]) =>
      pf(name, data)
    );

    const p = await planImport(picked);
    expect(p.rootName).toBe("My Notes");
    expect(p.rootDescription).toBe("root desc");
    expect(p.folders).toEqual([
      { path: "/a", description: "A", depth: 1 },
      { path: "/empty", description: "E", depth: 1 },
      { path: "/a/b", description: "", depth: 2 },
    ]);
    expect(p.files.map((f) => [f.path, f.content])).toEqual([
      ["/a/b/y.txt", "y content"],
      ["/a/x.md", "# X\n\nline\r\nmore"],
      ["/top.md", "top"],
    ]);
    expect(p.skipped).toEqual([]);
    expect(p.totalBytes).toBe(
      [...sampleContents.values()].reduce(
        (sum, c) => sum + new TextEncoder().encode(c).length,
        0
      )
    );
  });
});

/* ------------------------------------------------------------------------ */
/* exportFilesystem                                                         */
/* ------------------------------------------------------------------------ */

describe("exportFilesystem", () => {
  it("fetches every file, reports progress and returns a named zip", async () => {
    const fetchContent = vi.fn(async (path: string) => sampleContents.get(path)!);
    const progress: ImportProgress[] = [];
    const { bytes, filename } = await exportFilesystem(sampleTree, fetchContent, {
      concurrency: 2,
      onProgress: (p) => progress.push({ ...p }),
    });
    expect(filename).toBe("My Notes.zip");
    expect(fetchContent).toHaveBeenCalledTimes(3);
    expect(progress[0]).toEqual({ done: 0, total: 3, current: null });
    expect(progress[progress.length - 1]).toEqual({ done: 3, total: 3, current: null });
    expect(Object.keys(unzipSync(bytes)).sort()).toEqual([
      "My Notes/.description.md",
      "My Notes/a/.description.md",
      "My Notes/a/b/.description.md",
      "My Notes/a/b/y.txt",
      "My Notes/a/x.md",
      "My Notes/empty/.description.md",
      "My Notes/top.md",
    ]);
  });

  it("rethrows a failed fetch", async () => {
    const fetchContent = vi.fn(async (path: string) => {
      if (path === "/a/x.md") throw new Error("nope");
      return "ok";
    });
    await expect(exportFilesystem(sampleTree, fetchContent)).rejects.toThrow("nope");
  });

  it("throws AbortError when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchContent = vi.fn(async () => "x");
    await expect(
      exportFilesystem(sampleTree, fetchContent, { signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchContent).not.toHaveBeenCalled();
  });

  it("throws AbortError when aborted mid-way", async () => {
    const controller = new AbortController();
    const fetchContent = vi.fn(async () => {
      controller.abort();
      return "x";
    });
    await expect(
      exportFilesystem(sampleTree, fetchContent, { signal: controller.signal, concurrency: 1 })
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchContent).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------------ */
/* downloadBytes                                                            */
/* ------------------------------------------------------------------------ */

describe("downloadBytes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("clicks a hidden anchor and revokes the object URL later", () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe("x.zip");
        expect(this.href).toBe("blob:fake");
        expect(document.body.contains(this)).toBe(true);
      });

    downloadBytes(new Uint8Array([1, 2, 3]), "x.zip");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });
});
