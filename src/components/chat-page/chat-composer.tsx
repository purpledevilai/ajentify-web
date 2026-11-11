"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_HEIGHT_PX = 220;

export interface ChatComposerProps {
  onSend: (text: string) => void | Promise<void>;
  /** Send is blocked (no agent picked, still connecting, …). */
  disabled?: boolean;
  /** Show the stop button and route its click to `onCancel`. */
  canCancel?: boolean;
  isCancelling?: boolean;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Docked composer. Enter sends, Shift+Enter inserts a newline. The textarea
 * grows with its content up to `MAX_HEIGHT_PX`, then scrolls.
 */
export function ChatComposer({
  onSend,
  disabled = false,
  canCancel = false,
  isCancelling = false,
  onCancel,
  placeholder = "Message…",
  autoFocus,
  className,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    void onSend(text);
    // Keep focus so the user can keep typing while the agent answers.
    requestAnimationFrame(() => ref.current?.focus());
  }, [value, disabled, onSend]);

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div
      className={cn(
        "bg-card border-border focus-within:border-ring focus-within:ring-ring/30 flex items-end gap-2 rounded-2xl border p-2 pl-4 shadow-xs transition-[border-color,box-shadow] focus-within:ring-3",
        className
      )}
    >
      <Textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Message"
        className="max-h-[220px] min-h-0 flex-1 resize-none border-0 bg-transparent px-0 py-2 text-base shadow-none focus-visible:ring-0 focus-visible:border-transparent md:text-sm dark:bg-transparent"
      />
      <div className="flex shrink-0 items-center gap-1 pb-0.5">
        {canCancel && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            aria-label="Stop generating"
            onClick={onCancel}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Square className="size-3.5 fill-current" />
            )}
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          className="rounded-full"
          aria-label="Send message"
          onClick={submit}
          disabled={!canSend}
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>
    </div>
  );
}
