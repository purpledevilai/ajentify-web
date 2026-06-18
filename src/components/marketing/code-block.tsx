"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type Token = { type: string; value: string };

const RULES: [string, RegExp][] = [
  ["comment", /^\/\/.*/],
  ["comment", /^#.*/],
  ["string", /^"(?:[^"\\]|\\.)*"/],
  ["string", /^'(?:[^'\\]|\\.)*'/],
  ["string", /^`(?:[^`\\]|\\.)*`/],
  ["keyword", /^(?:import|from|export|const|let|var|function|async|await|return|def|class|if|else|type)\b/],
  ["jsx-tag", /^<\/?[A-Z]\w*/],
  ["jsx-close", /^\s*\/>/],
  ["builtin", /^(?:true|false|null|undefined|None|True|False)\b/],
  ["number", /^-?\d+(?:\.\d+)?/],
  ["punctuation", /^[{}()[\];,.:=<>|&!?+\-*/]+/],
  ["identifier", /^[a-zA-Z_$][\w$]*/],
  ["whitespace", /^\s+/],
];

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let remaining = code;
  while (remaining.length > 0) {
    let matched = false;
    for (const [type, regex] of RULES) {
      const match = remaining.match(regex);
      if (match) {
        tokens.push({ type, value: match[0] });
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ type: "plain", value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }
  return tokens;
}

const TOKEN_CLASSES: Record<string, string> = {
  keyword: "text-purple-400",
  string: "text-emerald-400",
  comment: "text-zinc-500 italic",
  builtin: "text-amber-400",
  number: "text-amber-400",
  "jsx-tag": "text-sky-400",
  "jsx-close": "text-sky-400",
  punctuation: "text-zinc-400",
  identifier: "text-zinc-200",
  whitespace: "",
  plain: "text-zinc-200",
};

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
  /** Frosted-glass variant for use inside translucent windows. */
  transparent?: boolean;
}

export function CodeBlock({
  code,
  language,
  filename,
  className,
  transparent,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const lines = code.trimEnd().split("\n");
  const tokenizedLines = lines.map((line) => tokenize(line));

  function handleCopy() {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("group relative overflow-hidden rounded-lg border border-white/10", className)}>
      {(filename || language) && (
        <div
          className={cn(
            "flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-zinc-400",
            transparent ? "bg-white/5" : "bg-zinc-900"
          )}
        >
          <span>{filename ?? language}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 opacity-0 transition-opacity hover:bg-white/5 group-hover:opacity-100"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <pre
        className={cn(
          "overflow-x-auto p-4 text-sm leading-relaxed",
          transparent ? "bg-zinc-950/55 backdrop-blur-xl" : "bg-zinc-950"
        )}
      >
        <code>
          {tokenizedLines.map((tokens, i) => (
            <span key={i}>
              {tokens.map((token, j) => (
                <span key={j} className={TOKEN_CLASSES[token.type]}>
                  {token.value}
                </span>
              ))}
              {i < tokenizedLines.length - 1 && "\n"}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
