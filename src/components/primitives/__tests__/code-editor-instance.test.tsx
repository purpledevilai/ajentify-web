/**
 * Guards against a duplicated `@codemirror/state` in the lockfile. CodeMirror checks
 * extensions with `instanceof` against ITS copy of `@codemirror/state`; when a language
 * package resolves a different copy, `EditorState.create` throws "Unrecognized extension
 * value in extension set" and every CodeEditor user (start-session dialog, file editor,
 * schema editor) crashes to the error page. This happened on staging on 2026-10-17.
 */
import { describe, expect, it } from "vitest";
import { markdown } from "@codemirror/lang-markdown";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
// `@codemirror/state` is not a direct dependency; @uiw/react-codemirror re-exports it,
// so this is the same copy the real CodeEditor builds its EditorState with.
import { EditorState, basicSetup } from "@uiw/react-codemirror";

describe("CodeMirror dependency graph", () => {
  it("builds an EditorState with every language extension CodeEditor uses", () => {
    for (const ext of [markdown(), json(), python(), javascript(), oneDark, basicSetup()]) {
      expect(() => EditorState.create({ doc: "x", extensions: [ext] })).not.toThrow();
    }
  });
});
