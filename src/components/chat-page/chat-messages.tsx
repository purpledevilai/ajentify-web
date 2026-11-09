"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ChevronDown, Loader2, Wrench } from "lucide-react";
import {
  CANCELLED_TOOL_OUTPUT,
  deriveSubagentCard,
  isSubagentToolCall,
  linkedSubagentReplyIds,
  type ChatMessage,
  type SubagentRun,
  type TextMessage,
  type ToolCallMessage,
} from "@ajentify/chat";
import { SubagentCard } from "@ajentify/chat/ui";
import { MarkdownView } from "@/components/blocks/markdown-view";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChatMessagesProps {
  messages: ChatMessage[];
  pendingResponse: { responseId: string; text: string } | null;
  /** Between a send and the first streamed token. */
  isWaitingForResponse: boolean;
  isStreaming: boolean;
  subagentRuns: Record<string, SubagentRun>;
  className?: string;
}

/** Either a single text message or a run of consecutive tool calls. */
type Row =
  | { kind: "text"; key: string; message: TextMessage }
  | { kind: "tools"; key: string; calls: ToolCallMessage[] };

function buildRows(messages: ChatMessage[]): Row[] {
  const hidden = linkedSubagentReplyIds(messages);
  const rows: Row[] = [];
  for (const m of messages) {
    if (m.kind === "tool_response") continue; // deprecated; merged onto calls
    if (m.kind === "tool_call") {
      if (hidden.has(m.toolCallId)) continue;
      const last = rows[rows.length - 1];
      if (last?.kind === "tools") last.calls.push(m);
      else rows.push({ kind: "tools", key: `tools-${m.localId}`, calls: [m] });
      continue;
    }
    rows.push({ kind: "text", key: m.localId, message: m });
  }
  return rows;
}

const NEAR_BOTTOM_PX = 96;

/**
 * Scrollable transcript. Follows the stream while the user is at the
 * bottom; once they scroll up, auto-follow pauses and a "Jump to latest"
 * pill appears.
 */
export function ChatMessages({
  messages,
  pendingResponse,
  isWaitingForResponse,
  isStreaming,
  subagentRuns,
  className,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const atBottomRef = useRef(true);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    atBottomRef.current = near;
    setAtBottom(near);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // Follow new content while pinned to the bottom.
  const lastLen = messages.length;
  const pendingLen = pendingResponse?.text.length ?? 0;
  useEffect(() => {
    if (atBottomRef.current) scrollToBottom(pendingLen ? "auto" : "smooth");
  }, [lastLen, pendingLen, isWaitingForResponse, scrollToBottom]);

  const rows = useMemo(() => buildRows(messages), [messages]);
  const showJump = !atBottom && (isStreaming || rows.length > 0);

  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto overscroll-contain px-4 md:px-6"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-8">
          {rows.map((row) =>
            row.kind === "text" ? (
              <TextRow key={row.key} message={row.message} />
            ) : (
              <ToolRow
                key={row.key}
                calls={row.calls}
                messages={messages}
                runs={subagentRuns}
              />
            )
          )}
          {pendingResponse && pendingResponse.text && (
            <AiBubble streaming>{pendingResponse.text}</AiBubble>
          )}
          {isWaitingForResponse && !pendingResponse?.text && <ThinkingDots />}
        </div>
      </div>

      {showJump && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pointer-events-auto rounded-full shadow-md"
            onClick={() => scrollToBottom()}
          >
            <ArrowDown className="size-3.5" />
            Jump to latest
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function TextRow({ message }: { message: TextMessage }) {
  if (message.sender === "human") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-xs md:max-w-[75%]">
          {message.content}
        </div>
        {message.queued && (
          <span className="text-muted-foreground text-[11px]">
            Queued — will be read after the current reply
          </span>
        )}
      </div>
    );
  }
  if (message.sender === "system") {
    return (
      <p className="text-muted-foreground mx-auto max-w-prose text-center text-xs">
        {message.content}
      </p>
    );
  }
  return (
    <AiBubble cancelled={message.cancelled}>{message.content}</AiBubble>
  );
}

function AiBubble({
  children,
  streaming,
  cancelled,
}: {
  children: string;
  streaming?: boolean;
  cancelled?: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-full">
        <MarkdownView
          className={cn(
            "text-[15px] leading-7",
            streaming &&
              "[&>*:last-child]:after:ml-0.5 [&>*:last-child]:after:inline-block [&>*:last-child]:after:h-[1em] [&>*:last-child]:after:w-[2px] [&>*:last-child]:after:translate-y-[2px] [&>*:last-child]:after:animate-pulse [&>*:last-child]:after:bg-foreground/70 [&>*:last-child]:after:content-['']"
          )}
        >
          {children}
        </MarkdownView>
      </div>
      {cancelled && (
        <span className="text-muted-foreground text-[11px]">Stopped</span>
      )}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div
      className="text-muted-foreground flex items-center gap-1.5 py-1"
      aria-live="polite"
      aria-label="Thinking"
    >
      <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
      <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
      <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool calls
// ---------------------------------------------------------------------------

function ToolRow({
  calls,
  messages,
  runs,
}: {
  calls: ToolCallMessage[];
  messages: ChatMessage[];
  runs: Record<string, SubagentRun>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {calls.map((call) => {
        if (isSubagentToolCall(call)) {
          const card = deriveSubagentCard(call, messages, runs);
          if (card) return <SubagentCard key={call.localId} card={card} />;
        }
        return <ToolChip key={call.localId} call={call} />;
      })}
    </div>
  );
}

function prettyJson(value: unknown): string {
  if (typeof value === "string") {
    const t = value.trimStart();
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        /* plain text */
      }
    }
    return value;
  }
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value);
  }
}

function ToolChip({ call }: { call: ToolCallMessage }) {
  const [open, setOpen] = useState(false);
  const running = call.toolOutput === undefined;
  const cancelled = call.toolOutput === CANCELLED_TOOL_OUTPUT;
  return (
    <div className="max-w-full self-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs transition-colors",
          open && "text-foreground"
        )}
      >
        {running ? (
          <Loader2 className="size-3 shrink-0 animate-spin" />
        ) : (
          <Wrench className="size-3 shrink-0" />
        )}
        <span className="truncate">{call.toolName}</span>
        {cancelled && <span className="font-sans not-italic opacity-70">· stopped</span>}
        <ChevronDown
          className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-border bg-muted/30 mt-2 grid gap-3 rounded-xl border p-3 text-xs">
          <div>
            <p className="text-muted-foreground mb-1 font-medium">Input</p>
            <pre className="max-h-64 overflow-auto font-mono break-words whitespace-pre-wrap">
              {prettyJson(call.toolInput)}
            </pre>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 font-medium">Output</p>
            {running ? (
              <p className="text-muted-foreground italic">Running…</p>
            ) : (
              <pre className="max-h-64 overflow-auto font-mono break-words whitespace-pre-wrap">
                {prettyJson(call.toolOutput) || "(empty)"}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
