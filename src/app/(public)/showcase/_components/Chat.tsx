"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Sparkles, User, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatItem =
  | { kind: "agent"; text: React.ReactNode }
  | { kind: "user"; text: React.ReactNode }
  | {
      kind: "tool";
      name: string;
      meta?: string;
      sre?: boolean;
      input?: string;
      output?: string;
    };

export function Chat({
  items,
  header,
  prompts,
  onPrompt,
  thinking,
  disabled,
}: {
  items: ChatItem[];
  header?: { name: string; sub?: string };
  prompts?: string[];
  onPrompt?: (p: string) => void;
  thinking?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-full flex-col bg-background">
      {header && (
        <div className="border-border/50 flex items-center gap-2.5 border-b px-3.5 py-2.5">
          <span className="bg-gradient-brand flex size-7 items-center justify-center rounded-full">
            <Bot className="size-4 text-white" />
          </span>
          <div className="leading-tight">
            <div className="text-foreground text-sm font-semibold">
              {header.name}
            </div>
            {header.sub && (
              <div className="text-muted-foreground text-[0.7rem]">
                {header.sub}
              </div>
            )}
          </div>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground text-[0.65rem]">online</span>
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3.5 text-[0.82rem]">
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {item.kind === "tool" ? (
                <ToolTrace item={item} />
              ) : (
                <Bubble role={item.kind}>{item.text}</Bubble>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {thinking && (
          <div className="text-muted-foreground flex items-center gap-1 pl-8">
            <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
          </div>
        )}
      </div>

      {prompts && prompts.length > 0 && (
        <div className="border-border/50 flex flex-wrap gap-1.5 border-t p-2.5">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => onPrompt?.(p)}
              className="border-border/70 hover:border-primary/50 hover:bg-primary/5 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="bg-muted-foreground/60 size-1.5 rounded-full"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity, delay }}
    />
  );
}

function ToolTrace({ item }: { item: Extract<ChatItem, { kind: "tool" }> }) {
  return (
    <div className="ml-8 overflow-hidden rounded-lg border border-border/60 bg-muted/40 text-[0.7rem]">
      <div className="border-border/50 flex items-center gap-1.5 border-b px-2 py-1.5 font-mono">
        {item.sre ? (
          <Sparkles className="text-accent size-2.5" />
        ) : (
          <Wrench className="text-primary size-2.5" />
        )}
        <span className="text-foreground/80">{item.name}()</span>
        {item.meta && (
          <span className="text-muted-foreground ml-auto">{item.meta}</span>
        )}
      </div>
      {(item.input || item.output) && (
        <div className="space-y-1 p-2 font-mono">
          {item.input && (
            <div className="text-muted-foreground truncate">{item.input}</div>
          )}
          {item.output && (
            <div className="text-foreground/70 truncate">→ {item.output}</div>
          )}
        </div>
      )}
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
          "max-w-[82%] rounded-2xl px-3 py-2 leading-relaxed",
          isUser ? "bg-muted text-foreground" : "bg-muted/50 text-foreground/90"
        )}
      >
        {children}
      </div>
    </div>
  );
}
