"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { Button, type ButtonProps } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const STARTER_PROMPT = `I'm building an AI agent with Ajentify — a fully-hosted agent platform.
Docs: https://ajentify.com/docs   ·   LLM reference: https://ajentify.com/llms.txt

Set me up end to end:
1. Install the CLI:  npm i -D @ajentify/cli
2. Create ajentify.manifest.json with:
   - one agent (name, system prompt, model)
   - one tool the agent can call
   - one SRE (a typed LLM call: prompt + variables + JSON output schema)
3. Deploy to a dev stage:  npx ajentify deploy --stage dev
4. Embed the @ajentify/chat widget in my app with a client-side "navigate" tool

My app idea: <describe it here>

Ask me what the agent should do, then scaffold everything and explain each piece.`;

interface CopyPromptDialogProps {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  label?: string;
  className?: string;
}

export function CopyPromptDialog({
  variant = "gradient",
  size = "lg",
  label = "Copy starter prompt",
  className,
}: CopyPromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(STARTER_PROMPT);
      setCopied(true);
    } catch {
      /* clipboard can fail on insecure origins — fail quietly */
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Terminal />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Start in your AI editor
            </DialogTitle>
            <DialogDescription>
              Copy this prompt, paste it into Claude Code or Cursor, drop in your
              idea, and it&apos;ll scaffold a working Ajentify agent for you.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-lg border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900 px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Terminal className="size-3.5" />
                starter prompt
              </span>
              <button
                type="button"
                onClick={copy}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  copied
                    ? "text-emerald-400"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                )}
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-[50vh] overflow-auto bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-200">
              {STARTER_PROMPT}
            </pre>
          </div>

          <div className="flex justify-end">
            <Button variant="gradient" size="md" onClick={copy}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied to clipboard" : "Copy prompt"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
