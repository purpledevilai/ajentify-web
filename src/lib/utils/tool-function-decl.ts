/**
 * Utilities for keeping a custom tool's Python function declaration
 * (`def NAME(...):`) in sync with the visual builder state.
 *
 * The runtime contract (see `execution-lambda/lambda_function.py` and
 * `LLM/TokenStreamingAgentChat.py`):
 *  - The lambda execs the code, looks up `tool.name` as `function_name`
 *    in the resulting globals, and calls `function_name(**params)`.
 *  - When `tool.pass_context=True`, the orchestrator merges
 *    `params['context'] = self.context`, so the function must declare a
 *    `context` parameter.
 *
 * Therefore the function declaration is fully determined by
 * `(funcName, top-level schema property names, passContext)` — and we
 * own it on behalf of the user in the builder UI.
 */

import { getParamNamesFromSchema } from "./tool-signature";

/** Used when the user hasn't typed a name yet but we need an identifier
 *  for code generation. Mirrors the page's `DEFAULT_NEW_TOOL_NAME`. */
export const FALLBACK_FUNC_NAME = "untitled_tool";

export interface FunctionDeclaration {
  funcName: string;
  paramNames: string[];
  passContext: boolean;
}

/**
 * Sanitize a free-text tool name into a Python-safe identifier.
 *
 * - Lowercases.
 * - Replaces any character outside `[a-z0-9_]` with `_`.
 * - Prepends `_` if the result starts with a digit (identifiers can't).
 * - Returns an empty string when input is empty — the caller decides
 *   whether to fall back to `FALLBACK_FUNC_NAME`.
 *
 * Designed to be length-preserving under typical input (so live
 * sanitization in a controlled input doesn't break cursor position):
 * each invalid char is replaced 1:1 with `_`. The only exception is
 * the leading-digit case, which prepends an underscore.
 *
 * We deliberately do NOT collapse consecutive underscores or strip
 * trailing underscores, so typing `my_tool` character-by-character
 * works as expected (e.g. seeing `my_` mid-keystroke).
 */
export function sanitizeFunctionName(raw: string): string {
  if (!raw) return "";
  let s = raw.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (/^[0-9]/.test(s)) s = "_" + s;
  return s;
}

/** Resolve to a non-empty identifier for code generation, falling back
 *  when the user has cleared the name input. */
export function effectiveFunctionName(name: string): string {
  const s = sanitizeFunctionName(name);
  return s || FALLBACK_FUNC_NAME;
}

/**
 * Sanitize a free-text schema property name into a valid Python
 * identifier. Case-preserving (unlike `sanitizeFunctionName`) so users
 * can choose `snake_case` or `camelCase` per their preferred style —
 * both are valid Python parameter names.
 *
 *  - Replaces any character outside `[A-Za-z0-9_]` with `_`.
 *  - Prepends `_` if the result starts with a digit.
 *  - Length-preserving in the common case (each invalid char becomes
 *    one underscore), so live sanitization in a controlled input
 *    doesn't disturb cursor position.
 *  - Returns an empty string when input is empty — empty mid-edit is
 *    fine; the schema serializer drops unnamed nodes anyway.
 */
export function sanitizeIdentifier(raw: string): string {
  if (!raw) return "";
  let s = raw.replace(/[^A-Za-z0-9_]/g, "_");
  if (/^[0-9]/.test(s)) s = "_" + s;
  return s;
}

/** True when `name` is a valid Python identifier (and non-empty).
 *  Note: doesn't check against Python reserved words — the schema
 *  serializer doesn't care, and a user-friendly fallback ("rename
 *  required") would be more disruptive than the runtime SyntaxError
 *  they'd get from `def for(...)`. We can layer that in later. */
export function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

/** Build the canonical single-line `def NAME(...):` declaration.
 *  Dedupes a literal "context" schema property when `passContext` is
 *  on (the runtime would otherwise collide on the kwarg). */
export function buildSignatureLine(decl: FunctionDeclaration): string {
  const seen = new Set(decl.paramNames);
  const params = [...decl.paramNames];
  if (decl.passContext && !seen.has("context")) params.push("context");
  return `def ${decl.funcName}(${params.join(", ")}):`;
}

/** Extract the ordered list of top-level property names from a tool's
 *  schema. Falls back to `[]` for malformed input. */
export function paramNamesFromSchema(
  schema: Record<string, unknown> | undefined
): string[] {
  return getParamNamesFromSchema(schema).map((p) => p.name);
}

/**
 * Locate the byte range of a top-level `def NAME(...):` declaration in
 * a Python source string. Handles multi-line signatures, balanced
 * brackets, string literals (single/double/triple), line comments, and
 * an optional `-> ReturnType` annotation between `)` and `:`.
 *
 * Only matches a def starting in column 0 — nested helpers (which are
 * indented) are deliberately skipped, so a user's local utility named
 * the same as the tool can't be clobbered.
 *
 * Returns `{ lineStart, sigEnd }` where `lineStart` is the index of `d`
 * in `def` and `sigEnd` is the index *just after* the closing `:`.
 * Returns `null` if no matching declaration is found or the signature
 * is malformed (e.g. unbalanced parens, no closing `:`).
 */
export function findDefBlock(
  code: string,
  funcName: string
): { lineStart: number; sigEnd: number } | null {
  if (!funcName) return null;
  const esc = funcName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Column 0 only: anchor to either start of file or a preceding newline.
  const re = new RegExp(`(?:^|\\n)def[ \\t]+${esc}[ \\t]*\\(`, "g");
  const m = re.exec(code);
  if (!m) return null;
  // m.index is the position of the leading `\n` (or 0 for start of file).
  const lineStart = m.index === 0 && code[0] === "d" ? 0 : m.index + 1;
  // Position of the `(` is the last char of the match.
  let i = m.index + m[0].length - 1;

  const len = code.length;
  let depth = 0;
  // Scan forward through balanced brackets, skipping over strings and
  // line comments. Cap the scan distance so a pathologically broken
  // file can't lock us up.
  const SCAN_LIMIT = 50_000;
  const start = i;
  while (i < len && i - start < SCAN_LIMIT) {
    const ch = code[i];

    if (ch === "#") {
      // Skip the rest of the line. (Comments only count outside string
      // literals, which we've already filtered above.)
      while (i < len && code[i] !== "\n") i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      const triple = code[i + 1] === quote && code[i + 2] === quote;
      if (triple) {
        i += 3;
        while (i < len) {
          if (code[i] === "\\") {
            i += 2;
            continue;
          }
          if (
            code[i] === quote &&
            code[i + 1] === quote &&
            code[i + 2] === quote
          ) {
            i += 3;
            break;
          }
          i++;
        }
        continue;
      }
      i++;
      while (i < len && code[i] !== quote) {
        if (code[i] === "\\") {
          i += 2;
          continue;
        }
        if (code[i] === "\n") break;
        i++;
      }
      i++;
      continue;
    }

    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      i++;
      continue;
    }

    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      i++;
      if (depth === 0 && ch === ")") {
        // Skip whitespace, an optional `-> Type`, then expect `:`.
        while (i < len && /[ \t\r\n]/.test(code[i])) i++;
        if (code[i] === "-" && code[i + 1] === ">") {
          i += 2;
          let aDepth = 0;
          while (i < len) {
            const c = code[i];
            if (c === "(" || c === "[" || c === "{") aDepth++;
            else if (c === ")" || c === "]" || c === "}") aDepth--;
            else if (c === ":" && aDepth === 0) break;
            i++;
          }
        }
        if (code[i] === ":") {
          return { lineStart, sigEnd: i + 1 };
        }
        return null;
      }
      continue;
    }

    i++;
  }
  return null;
}

export type SyncStatus =
  | "unchanged"
  | "replaced"
  | "inserted"
  | "drift";

export interface SyncResult {
  code: string;
  status: SyncStatus;
}

/**
 * "Soft" sync: rewrite the managed `def` line to match `decl`, looking
 * it up first by `prevFuncName` (to catch renames) then by `decl.funcName`.
 *
 *  - If found       → replace the signature in place.
 *  - If code is empty/whitespace → insert a `def + pass` stub.
 *  - Otherwise      → leave the code untouched and signal `drift`. The
 *                     caller is expected to surface this to the user
 *                     and offer a `resetDeclaration()` recovery action.
 *
 * Never inserts into non-empty code: that's the user's text and we
 * don't want to silently prepend things mid-edit.
 */
export function syncDeclaration(
  code: string,
  decl: FunctionDeclaration,
  prevFuncName: string
): SyncResult {
  const sigLine = buildSignatureLine(decl);

  let block = findDefBlock(code, prevFuncName);
  if (!block && decl.funcName !== prevFuncName) {
    block = findDefBlock(code, decl.funcName);
  }

  if (block) {
    const next =
      code.slice(0, block.lineStart) + sigLine + code.slice(block.sigEnd);
    if (next === code) return { code, status: "unchanged" };
    return { code: next, status: "replaced" };
  }

  if (!code.trim()) {
    return { code: `${sigLine}\n    pass\n`, status: "inserted" };
  }

  return { code, status: "drift" };
}

/**
 * "Aggressive" sync used by the user-initiated "Reset signature" action.
 * Will overwrite any top-level def it can find, and if none is present
 * prepend a stub. Used when soft sync gave up because the code didn't
 * have a recognizable managed def.
 */
export function resetDeclaration(
  code: string,
  decl: FunctionDeclaration
): SyncResult {
  const sigLine = buildSignatureLine(decl);

  let block = findDefBlock(code, decl.funcName);
  if (!block) {
    const anyDef = /(?:^|\n)def[ \t]+([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/.exec(
      code
    );
    if (anyDef) block = findDefBlock(code, anyDef[1]);
  }

  if (block) {
    return {
      code: code.slice(0, block.lineStart) + sigLine + code.slice(block.sigEnd),
      status: "replaced",
    };
  }

  if (!code.trim()) {
    return { code: `${sigLine}\n    pass\n`, status: "inserted" };
  }

  return {
    code: `${sigLine}\n    pass\n\n${code}`,
    status: "inserted",
  };
}

/** True if the managed def is missing from the code, or its current
 *  signature line doesn't match what we'd render from `decl`. Used to
 *  flag user edits to the declaration after a code-side change. */
export function detectDeclarationDrift(
  code: string,
  decl: FunctionDeclaration
): boolean {
  if (!code.trim()) return false;
  const block = findDefBlock(code, decl.funcName);
  if (!block) return true;
  const existing = code.slice(block.lineStart, block.sigEnd);
  return existing !== buildSignatureLine(decl);
}
