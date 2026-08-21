"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, PhoneOff } from "lucide-react";
import {
  AjentifyVoiceProvider,
  useRealtimeSession,
  useRealtimeStore,
  useRealtimeEvent,
} from "@ajentify/voice";

import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  startAgentSession,
  voiceTssUrl,
} from "@/lib/session/start-agent-session";
import {
  ClientToolResponseDialog,
  useManualToolResponder,
} from "@/components/blocks/client-tool-response-dialog";

export interface AgentVoiceSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  promptArgs: Record<string, string>;
  userDefined: Record<string, unknown>;
}

export function AgentVoiceSessionDialog({
  open,
  onOpenChange,
  agentId,
  agentName,
  promptArgs,
  userDefined,
}: AgentVoiceSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Voice call · {agentName}</DialogTitle>
        </DialogHeader>
        <AjentifyVoiceProvider
          config={{ mode: "realtime", tokenStreamingServerUrl: voiceTssUrl() }}
        >
          <VoiceCallInner
            agentId={agentId}
            promptArgs={promptArgs}
            userDefined={userDefined}
            onClose={() => onOpenChange(false)}
          />
        </AjentifyVoiceProvider>
      </DialogContent>
    </Dialog>
  );
}

function VoiceCallInner({
  agentId,
  promptArgs,
  userDefined,
  onClose,
}: {
  agentId: string;
  promptArgs: Record<string, string>;
  userDefined: Record<string, unknown>;
  onClose: () => void;
}) {
  const responder = useManualToolResponder();

  const isConnecting = useRealtimeSession((s) => s.isConnecting);
  const isConnected = useRealtimeSession((s) => s.isConnected);
  const isMuted = useRealtimeSession((s) => s.isMuted);
  const messages = useRealtimeSession((s) => s.messages);

  const initialize = useRealtimeSession((s) => s.initialize);
  const disconnect = useRealtimeSession((s) => s.disconnect);
  const toggleMute = useRealtimeSession((s) => s.toggleMute);

  const realtimeStore = useRealtimeStore();

  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const connect = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    try {
      const session = await startAgentSession({
        agentId,
        promptArgs,
        userDefined,
      });
      await initialize(session.contextId, session.accessToken);
    } catch (err) {
      startedRef.current = false;
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [agentId, promptArgs, userDefined, initialize]);

  // Auto-connect on mount (the user already confirmed the config modal).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void connect();
    return () => {
      try {
        disconnect();
      } catch {
        // ignore teardown errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Answer client-side tool calls via the manual-response popup.
  useRealtimeEvent("on_client_side_tool_calls", async ({ tool_calls }) => {
    const tool_responses: { tool_call_id: string; response: string }[] = [];
    for (const call of tool_calls) {
      const response = await responder.requestResponse({
        toolCallId: call.tool_call_id,
        toolName: call.tool_name,
        toolInput: call.tool_input,
      });
      tool_responses.push({ tool_call_id: call.tool_call_id, response });
    }
    try {
      await realtimeStore
        .getState()
        .send("client_side_tool_responses", { tool_responses }, true, 10000);
    } catch (err) {
      console.error("[agent-voice] failed to send tool responses", err);
    }
  });

  function handleEnd() {
    try {
      disconnect();
    } catch {
      // ignore
    }
    onClose();
  }

  const status = isConnected
    ? "Connected"
    : isConnecting
      ? "Connecting…"
      : "Disconnected";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant={isConnected ? "default" : "secondary"}>
          {isConnecting && <Loader2 className="mr-1 size-3 animate-spin" />}
          {status}
        </Badge>
        <Badge variant="outline">{isMuted ? "Mic muted" : "Mic active"}</Badge>
      </div>

      {error && (
        <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void connect()}>
            Retry
          </Button>
        </div>
      )}

      <div className="max-h-[40vh] min-h-[8rem] space-y-2 overflow-y-auto rounded-md border border-border p-3">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Waiting for the conversation to start…
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={`${m.ts}-${i}`}
              className={cn(
                "text-sm",
                m.role === "user" ? "text-foreground" : "text-primary"
              )}
            >
              <span className="font-medium">
                {m.role === "user" ? "You" : "Agent"}:
              </span>{" "}
              {m.text}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="md"
          disabled={!isConnected}
          onClick={toggleMute}
        >
          {isMuted ? (
            <>
              <MicOff className="size-4" />
              Unmute
            </>
          ) : (
            <>
              <Mic className="size-4" />
              Mute
            </>
          )}
        </Button>
        <Button variant="destructive" size="md" onClick={handleEnd}>
          <PhoneOff className="size-4" />
          End call
        </Button>
      </div>

      <ClientToolResponseDialog responder={responder} />
    </div>
  );
}
