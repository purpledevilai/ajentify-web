import { describe, it, expect } from "vitest";
import {
  attachFilesystemToPrompt,
  buildFilesystemSnippet,
  detachFilesystemFromPrompt,
  promptReferencesFilesystem,
  referencedFilesystemIds,
} from "../snippet";

const FS = {
  filesystem_id: "4a926872-2bef-426e-b2f7-721610a761df",
  name: "Company brain",
  description: "Policies,\n  procedures and FAQs",
};
const OTHER = "11111111-2222-3333-4444-555555555555";

describe("snippet", () => {
  it("builds the standard one-paragraph snippet", () => {
    const s = buildFilesystemSnippet(FS);
    expect(s).toBe(
      `You have a filesystem memory at \`/${FS.filesystem_id}\` ("Company brain": Policies, procedures and FAQs). ` +
        "When you need information or instructions, call `list_folder` on it, navigate by folder names and descriptions, " +
        "and `open_file` only the relevant file. Use `search_filesystem` only when navigation fails. " +
        "Keep it up to date with the write tools."
    );
    expect(s).not.toContain("\n");
  });

  it("attaches with exactly one blank line before, and is idempotent", () => {
    const once = attachFilesystemToPrompt("You are helpful.\n\n\n", FS);
    expect(once).toBe(`You are helpful.\n\n${buildFilesystemSnippet(FS)}`);
    expect(attachFilesystemToPrompt(once, FS)).toBe(once);
    expect(attachFilesystemToPrompt("", FS)).toBe(buildFilesystemSnippet(FS));
  });

  it("detects references and lists known ids in order of appearance", () => {
    const prompt = `Intro.\n\nSee /${OTHER} and also /${FS.filesystem_id.toUpperCase()}.\nUnrelated ${OTHER} (no slash) and /99999999-9999-9999-9999-999999999999.`;
    expect(promptReferencesFilesystem(prompt, OTHER)).toBe(true);
    expect(referencedFilesystemIds(prompt, [FS.filesystem_id, OTHER])).toEqual([
      OTHER,
      FS.filesystem_id,
    ]);
    expect(referencedFilesystemIds("nothing here", [OTHER])).toEqual([]);
  });

  it("detaches by removing the paragraph containing the id", () => {
    const base = "You are helpful.\n\nBe concise.";
    const attached = attachFilesystemToPrompt(base, FS);
    expect(detachFilesystemFromPrompt(attached, FS.filesystem_id)).toBe(base);
    // Other filesystem's paragraph survives.
    const two = attachFilesystemToPrompt(attached, { ...FS, filesystem_id: OTHER });
    const left = detachFilesystemFromPrompt(two, FS.filesystem_id);
    expect(left).toContain(`/${OTHER}`);
    expect(left).not.toContain(`/${FS.filesystem_id}`);
    // No-op when absent.
    expect(detachFilesystemFromPrompt(base, OTHER)).toBe(base);
  });
});
