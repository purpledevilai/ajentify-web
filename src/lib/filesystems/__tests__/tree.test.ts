import { describe, it, expect } from "vitest";
import {
  ancestorPaths,
  buildTree,
  countDescendants,
  formatBytes,
} from "../tree";
import type { ApiFilesystemTreeNode } from "@/types/api";

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

describe("buildTree", () => {
  it("nests flat rows under a synthetic root carrying the fs description", () => {
    const { root, byPath } = buildTree(
      [
        node("/projects", "folder", { description: "Work" }),
        node("/projects/notes.md", "file", { size_bytes: 12 }),
        node("/readme.md", "file"),
        node("/archive", "folder"),
      ],
      { name: "Brain", description: "Everything" }
    );
    expect(root.name).toBe("Brain");
    expect(root.description).toBe("Everything");
    // folders first, then alpha
    expect(root.children.map((c) => c.path)).toEqual([
      "/archive",
      "/projects",
      "/readme.md",
    ]);
    expect(byPath.get("/projects")!.children[0].path).toBe("/projects/notes.md");
    expect(byPath.get("/projects")!.description).toBe("Work");
    expect(byPath.get("/projects/notes.md")!.size_bytes).toBe(12);
  });

  it("attaches orphans to the nearest present ancestor", () => {
    const { root, byPath } = buildTree(
      [node("/a/b/c.md", "file"), node("/a", "folder")],
      { name: "x", description: "" }
    );
    expect(byPath.get("/a")!.children.map((c) => c.path)).toEqual(["/a/b/c.md"]);
    expect(root.children.map((c) => c.path)).toEqual(["/a"]);
  });

  it("ignores duplicate rows", () => {
    const { root } = buildTree(
      [node("/x.md", "file"), node("/x.md", "file")],
      { name: "x", description: "" }
    );
    expect(root.children).toHaveLength(1);
  });
});

describe("helpers", () => {
  it("lists ancestor paths root-first", () => {
    expect(ancestorPaths("/")).toEqual([]);
    expect(ancestorPaths("/a")).toEqual(["/"]);
    expect(ancestorPaths("/a/b/c")).toEqual(["/", "/a", "/a/b"]);
  });

  it("counts descendants recursively", () => {
    const { byPath } = buildTree(
      [
        node("/a", "folder"),
        node("/a/b", "folder"),
        node("/a/b/c.md", "file"),
        node("/a/d.md", "file"),
      ],
      { name: "x", description: "" }
    );
    expect(countDescendants(byPath.get("/a")!)).toEqual({ folders: 1, files: 2 });
    expect(countDescendants(byPath.get("/a/b/c.md")!)).toEqual({
      folders: 0,
      files: 0,
    });
  });

  it("formats bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(20 * 1024)).toBe("20 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
    expect(formatBytes(null)).toBe("—");
  });
});
