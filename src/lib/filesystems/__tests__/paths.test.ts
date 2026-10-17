import { describe, it, expect } from "vitest";
import {
  baseName,
  breadcrumbs,
  extensionOf,
  externalPath,
  isMarkdownPath,
  isSameOrDescendant,
  joinPath,
  parentPath,
  rebasePath,
  splitPath,
  validateInternalPath,
  validateSegment,
} from "../paths";

describe("paths", () => {
  it("splits, joins and finds parents", () => {
    expect(splitPath("/")).toEqual([]);
    expect(splitPath("/a/b.md")).toEqual(["a", "b.md"]);
    expect(joinPath("/", "a")).toBe("/a");
    expect(joinPath("/a", "b")).toBe("/a/b");
    expect(joinPath("/a/", "b")).toBe("/a/b");
    expect(parentPath("/")).toBe("/");
    expect(parentPath("/a")).toBe("/");
    expect(parentPath("/a/b/c")).toBe("/a/b");
    expect(baseName("/a/b.md")).toBe("b.md");
    expect(baseName("/")).toBe("");
  });

  it("detects extensions and markdown", () => {
    expect(extensionOf("/notes.MD")).toBe("md");
    expect(extensionOf("/README")).toBe("");
    expect(extensionOf("/.gitignore")).toBe("");
    expect(extensionOf("/trailing.")).toBe("");
    expect(isMarkdownPath("/a/b.markdown")).toBe(true);
    expect(isMarkdownPath("/a/b.txt")).toBe(false);
  });

  it("builds external (agent) paths with the filesystem id as root", () => {
    expect(externalPath("fs1", "/")).toBe("/fs1");
    expect(externalPath("fs1", "")).toBe("/fs1");
    expect(externalPath("fs1", "/projects/notes.md")).toBe(
      "/fs1/projects/notes.md"
    );
  });

  it("builds breadcrumbs with root first", () => {
    expect(breadcrumbs("/")).toEqual([{ name: "", path: "/" }]);
    expect(breadcrumbs("/a/b")).toEqual([
      { name: "", path: "/" },
      { name: "a", path: "/a" },
      { name: "b", path: "/a/b" },
    ]);
  });

  it("knows ancestry and rebases after a move", () => {
    expect(isSameOrDescendant("/", "/x")).toBe(true);
    expect(isSameOrDescendant("/a", "/a")).toBe(true);
    expect(isSameOrDescendant("/a", "/a/b")).toBe(true);
    expect(isSameOrDescendant("/a", "/ab")).toBe(false);
    expect(rebasePath("/a/b/c.md", "/a/b", "/z")).toBe("/z/c.md");
    expect(rebasePath("/a/b", "/a/b", "/z")).toBe("/z");
    expect(rebasePath("/a/bc", "/a/b", "/z")).toBe("/a/bc");
  });

  describe("validateInternalPath", () => {
    const bad = (p: string) => validateInternalPath(p);
    it("accepts well-formed absolute paths and normalises trailing slash", () => {
      expect(validateInternalPath("/a/b.md")).toEqual({ ok: true, path: "/a/b.md" });
      expect(validateInternalPath("  /a/b/  ")).toEqual({ ok: true, path: "/a/b" });
      expect(validateInternalPath("/", { allowRoot: true })).toEqual({
        ok: true,
        path: "/",
      });
    });
    it("rejects root unless allowed", () => {
      expect(bad("/").ok).toBe(false);
    });
    it("rejects relative, empty, dot and double-slash paths", () => {
      expect(bad("").ok).toBe(false);
      expect(bad("a/b").ok).toBe(false);
      expect(bad("/a//b").ok).toBe(false);
      expect(bad("/a/./b").ok).toBe(false);
      expect(bad("/a/../b").ok).toBe(false);
      expect(bad("/a\0b").ok).toBe(false);
    });
    it("enforces segment and total length", () => {
      expect(bad(`/${"x".repeat(255)}`).ok).toBe(true);
      expect(bad(`/${"x".repeat(256)}`).ok).toBe(false);
      const long = Array.from({ length: 5 }, () => "y".repeat(250)).join("/");
      expect(bad(`/${long}`).ok).toBe(false);
    });
  });

  it("validates single segments", () => {
    expect(validateSegment("notes.md")).toEqual({ ok: true, path: "notes.md" });
    expect(validateSegment("").ok).toBe(false);
    expect(validateSegment("a/b").ok).toBe(false);
    expect(validateSegment("..").ok).toBe(false);
    expect(validateSegment("x".repeat(256)).ok).toBe(false);
  });
});
