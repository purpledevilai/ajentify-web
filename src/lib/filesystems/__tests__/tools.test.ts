import { describe, it, expect } from "vitest";
import {
  FILESYSTEM_TOOL_IDS,
  filesystemToolIds,
  missingFilesystemToolIds,
  unionToolIds,
} from "../tools";
import type { ApiDefaultTool } from "@/types/api";

const tool = (tool_id: string, category: string): ApiDefaultTool => ({
  tool_id,
  name: tool_id,
  parameters: {},
  category,
});

describe("filesystem tools", () => {
  it("matches by category at runtime, falling back to the known ids", () => {
    expect(
      filesystemToolIds([
        tool("list_folder", "Filesystem"),
        tool("open_file", "Filesystem"),
        tool("get_time", "Utility"),
      ])
    ).toEqual(["list_folder", "open_file"]);
    expect(filesystemToolIds([tool("get_time", "Utility")])).toEqual([
      ...FILESYSTEM_TOOL_IDS,
    ]);
    expect(FILESYSTEM_TOOL_IDS).toHaveLength(10);
  });

  it("unions without duplicates and reports missing ids", () => {
    expect(unionToolIds(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
    expect(missingFilesystemToolIds(["a", "b"], ["b", "c"])).toEqual(["c"]);
  });
});
