"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  AjentifyProvider,
  type AjentifyProxyRequest,
} from "@ajentify/chat";
import { ChatView } from "@ajentify/chat/ui";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { contextsApi } from "@/lib/api/contexts";
import { apiKeysApi } from "@/lib/api/api-keys";
import { useOrgStore } from "@/lib/stores/org-store";
import { chatWebsocketUrl } from "@/lib/session/start-agent-session";
import {
  ClientToolResponseDialog,
  useManualToolResponder,
} from "@/components/blocks/client-tool-response-dialog";

export interface AgentChatSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  agentSpeaksFirst: boolean;
  promptArgs: Record<string, string>;
  userDefined: Record<string, unknown>;
}

/**
 * Isolated chat session for a specific agent. Renders its own
 * `<AjentifyProvider>` (NOT the docked "Aj" provider) whose proxy creates the
 * context for THIS agent via `POST /context` and mints client-scoped tokens via
 * `POST /generate-api-key`. Mounted only while open so its stores can never
 * clobber the dashboard-wide Aj chat.
 */
export function AgentChatSessionDialog({
  open,
  onOpenChange,
  agentId,
  agentName,
  agentSpeaksFirst,
  promptArgs,
  userDefined,
}: AgentChatSessionDialogProps) {
  const responder = useManualToolResponder();

  // The context's client_id, stashed on create so generate_access_token can
  // mint a token scoped to the same client (TSS enforces this match). Only
  // read/written inside the proxy callback, never during render.
  const clientIdRef = useRef<string | null>(null);

  const onAjentifyProxyRequest = useCallback(
    async (request: AjentifyProxyRequest): Promise<unknown> => {
      switch (request.type) {
        case "create_context": {
          const ctx = await contextsApi.create({
            ...request.request,
            agent_id: agentId,
            prompt_args: promptArgs,
            user_defined: userDefined,
          });
          clientIdRef.current = ctx.client_id ?? null;
          return ctx;
        }
        case "generate_access_token": {
          const orgId = useOrgStore.getState().activeOrgId;
          if (!orgId) throw new Error("No active organization selected.");
          return apiKeysApi.generate({
            org_id: orgId,
            type: "client",
            client_id: clientIdRef.current ?? undefined,
          });
        }
        case "get_context":
          return contextsApi.get(request.contextId, true);
        case "get_context_history":
          // One-off session — no history browsing.
          return [];
        case "delete_context":
          // No delete endpoint wired; nothing to do.
          return undefined;
        default:
          return undefined;
      }
    },
    [agentId, promptArgs, userDefined]
  );

  const clientSideTools = useCallback(
    (
      toolName: string,
      toolInput: Record<string, unknown>,
      ctx: { toolCallId: string }
    ) =>
      responder.requestResponse({
        toolCallId: ctx.toolCallId,
        toolName,
        toolInput,
      }),
    [responder]
  );

  const config = useMemo(
    () => ({
      onAjentifyProxyRequest,
      websocketUrl: chatWebsocketUrl(),
      agentSpeaksFirst,
      clientSideTools,
      themeBridge: "shadcn" as const,
      onError: (err: unknown) => console.error("[agent-chat]", err),
    }),
    [onAjentifyProxyRequest, agentSpeaksFirst, clientSideTools]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[80vh] max-w-3xl overflow-hidden p-0 sm:max-w-3xl"
      >
        <AjentifyProvider config={config}>
          <ChatView
            title={agentName}
            onClose={() => onOpenChange(false)}
            classNames={{ root: "h-full" }}
          />
          <ClientToolResponseDialog responder={responder} />
        </AjentifyProvider>
      </DialogContent>
    </Dialog>
  );
}
