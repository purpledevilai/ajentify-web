"use client";

import { Bot, Database, Sparkles, User, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODELS } from "./demo-runtime";
import type { PreviewModel, PreviewStep } from "./types";
import { Chip, Flash } from "./ui";

export function AgentPreview({ preview }: { preview: PreviewModel }) {
  const model = MODELS.find((m) => m.id === preview.model) ?? MODELS[0];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-brand flex size-8 items-center justify-center rounded-lg">
            <Bot className="size-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">
              Live output
            </div>
            <div className="text-muted-foreground text-xs">
              persona:{" "}
              <Flash value={preview.personaLabel} className="px-0.5">
                {preview.personaLabel}
              </Flash>
            </div>
          </div>
        </div>
        <Flash value={model.id}>
          <Chip tone="primary">
            <Sparkles className="size-3" />
            {model.label}
          </Chip>
        </Flash>
      </div>

      {/* Context tray */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/50 px-4 py-2.5">
        {preview.toolsAvailable.map((t) => (
          <span key={t} className="animate-in fade-in slide-in-from-left-1 duration-300">
            <Chip>
              <Wrench className="size-3" />
              {t}
            </Chip>
          </span>
        ))}
        {preview.knowledge.map((k) => (
          <span key={k} className="animate-in fade-in slide-in-from-left-1 duration-300">
            <Chip tone="accent">{k}</Chip>
          </span>
        ))}
        {preview.toolsAvailable.length === 0 && preview.knowledge.length === 0 && (
          <span className="text-muted-foreground text-xs">
            No tools or knowledge wired in
          </span>
        )}
      </div>

      {/* Conversation */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <Bubble role="agent">
          <Flash value={preview.greeting}>{preview.greeting}</Flash>
        </Bubble>

        <Bubble role="user">{preview.userMessage}</Bubble>

        {preview.steps.map((step) => (
          <ToolTrace key={step.kind + step.name} step={step} />
        ))}

        <Bubble role="agent">
          {preview.answer.map((seg, i) => (
            <Flash key={i} value={seg.text}>
              <span>{seg.text}</span>
            </Flash>
          ))}
        </Bubble>
      </div>

      {/* Live Data Window — as JSON */}
      {preview.liveData && (
        <div className="border-t border-border/50 bg-muted/30 px-4 py-3">
          <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider">
            <Database className="size-3" />
            Data Window · {preview.liveData.name}
          </div>
          <Flash value={preview.liveData.json}>
            <pre className="text-foreground/70 overflow-x-auto rounded-md bg-background/60 p-2.5 font-mono text-[0.7rem] leading-relaxed">
              {preview.liveData.json}
            </pre>
          </Flash>
        </div>
      )}
    </div>
  );
}

function ToolTrace({ step }: { step: PreviewStep }) {
  const isTool = step.kind === "tool";
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 ml-1 overflow-hidden rounded-md border border-border/60 bg-muted/30 text-xs duration-300">
      <div className="flex items-center gap-2 border-b border-border/50 px-2.5 py-1.5">
        <span
          className={cn(
            "flex size-4 items-center justify-center rounded",
            isTool ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
          )}
        >
          {isTool ? <Wrench className="size-2.5" /> : <Sparkles className="size-2.5" />}
        </span>
        <span className="font-mono text-foreground/80">{step.name}()</span>
        <Chip tone={isTool ? "primary" : "accent"} className="ml-auto">
          {step.meta}
        </Chip>
      </div>
      <div className="space-y-1.5 p-2.5">
        <TraceRow label="args" json={step.input} />
        <TraceRow label="returns" json={step.output} />
      </div>
    </div>
  );
}

function TraceRow({ label, json }: { label: string; json: string }) {
  return (
    <div>
      <div className="text-muted-foreground mb-0.5 font-mono text-[0.65rem] uppercase tracking-wider">
        {label}
      </div>
      <Flash value={json}>
        <pre className="text-foreground/75 overflow-x-auto rounded bg-background/60 px-2 py-1.5 font-mono text-[0.7rem] leading-relaxed">
          {json}
        </pre>
      </Flash>
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "agent" | "user";
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-muted" : "bg-gradient-brand"
        )}
      >
        {isUser ? (
          <User className="text-muted-foreground size-3.5" />
        ) : (
          <Bot className="size-3.5 text-white" />
        )}
      </span>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser ? "bg-muted text-foreground" : "bg-muted/50 text-foreground/90"
        )}
      >
        {children}
      </div>
    </div>
  );
}
