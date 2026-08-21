"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CodeEditor } from "@/components/primitives/code-editor";

export interface ManualToolCall {
  toolCallId: string;
  toolName: string;
  toolInput?: Record<string, unknown>;
}

interface QueueItem extends ManualToolCall {
  resolve: (response: string) => void;
}

export interface ManualToolResponder {
  /**
   * Enqueue a client-side tool call for the user to answer. Resolves with the
   * user's typed response string once they submit (or a decline payload if
   * they dismiss). Calls are shown one at a time in FIFO order.
   */
  requestResponse: (call: ManualToolCall) => Promise<string>;
  /** The call currently shown in the popup, if any. */
  current: ManualToolCall | null;
  /** Resolve the current call with the user's response. */
  submit: (response: string) => void;
  /** Dismiss the current call (resolves with a decline payload). */
  cancel: () => void;
  /** Number of calls waiting (including the current one). */
  pending: number;
}

/**
 * Owns a FIFO queue of client-side tool calls awaiting a manual response.
 * Both the chat and voice surfaces route their client-side tool calls here so
 * the user can type a response by hand. Because both SDKs dispatch calls
 * sequentially, a single visible call at a time is sufficient, but the queue
 * safely handles batches too.
 */
export function useManualToolResponder(): ManualToolResponder {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const requestResponse = useCallback((call: ManualToolCall) => {
    return new Promise<string>((resolve) => {
      setQueue((q) => [...q, { ...call, resolve }]);
    });
  }, []);

  const submit = useCallback((response: string) => {
    setQueue((q) => {
      const [head, ...rest] = q;
      head?.resolve(response);
      return rest;
    });
  }, []);

  const cancel = useCallback(() => {
    setQueue((q) => {
      const [head, ...rest] = q;
      head?.resolve(JSON.stringify({ error: "User declined to respond." }));
      return rest;
    });
  }, []);

  const head = queue[0];
  const current: ManualToolCall | null = head
    ? {
        toolCallId: head.toolCallId,
        toolName: head.toolName,
        toolInput: head.toolInput,
      }
    : null;

  return { requestResponse, current, submit, cancel, pending: queue.length };
}

/**
 * Presentational popup driven by a {@link ManualToolResponder}. Shows the
 * agent's tool call (name + params, read-only) and a textarea for the user's
 * response. Render one of these near each session surface.
 */
export function ClientToolResponseDialog({
  responder,
}: {
  responder: ManualToolResponder;
}) {
  const { current, submit, cancel, pending } = responder;
  const [value, setValue] = useState("");

  // Reset the textarea each time a new call surfaces.
  const currentId = current?.toolCallId ?? null;
  const prevIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentId !== prevIdRef.current) {
      prevIdRef.current = currentId;
      setValue("");
    }
  }, [currentId]);

  const paramsJson =
    current?.toolInput && Object.keys(current.toolInput).length > 0
      ? JSON.stringify(current.toolInput, null, 2)
      : "{}";

  return (
    <Dialog
      open={!!current}
      onOpenChange={(next) => {
        if (!next) cancel();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Tool call: <span className="font-mono">{current?.toolName}</span>
          </DialogTitle>
          <DialogDescription>
            The agent called a client-side tool. Enter the response to send back
            {pending > 1 ? ` (${pending - 1} more waiting)` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Parameters</Label>
            <CodeEditor
              value={paramsJson}
              language="json"
              readOnly
              minHeight="4rem"
              maxHeight="12rem"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tool-response">Response</Label>
            <Textarea
              id="tool-response"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type the tool's response…"
              rows={4}
              className="font-mono text-sm"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="md" onClick={cancel}>
            Decline
          </Button>
          <Button variant="gradient" size="md" onClick={() => submit(value)}>
            Send response
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
