"use client";

import { useCallback } from "react";
import { AjentifyVoiceProvider } from "@ajentify/voice";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  resumeContextSession,
  voiceTssUrl,
} from "@/lib/session/start-agent-session";
import { VoiceCallSession } from "@/components/blocks/agent-voice-session-dialog";

export interface ContextVoiceSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextId: string;
  /** The context's `client_id` — the minted token is scoped to it. */
  clientId: string | null;
  agentName: string;
}

/**
 * Reopen an EXISTING realtime (voice) context. No new context is created:
 * we mint a client token for the context's `client_id` and hand the existing
 * `context_id` to the voice SDK.
 */
export function ContextVoiceSessionDialog({
  open,
  onOpenChange,
  contextId,
  clientId,
  agentName,
}: ContextVoiceSessionDialogProps) {
  const startSession = useCallback(
    () => resumeContextSession({ contextId, clientId }),
    [contextId, clientId]
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Voice call · {agentName}</DialogTitle>
        </DialogHeader>
        <AjentifyVoiceProvider
          config={{ mode: "realtime", tokenStreamingServerUrl: voiceTssUrl() }}
        >
          <VoiceCallSession
            startSession={startSession}
            onClose={() => onOpenChange(false)}
          />
        </AjentifyVoiceProvider>
      </DialogContent>
    </Dialog>
  );
}
