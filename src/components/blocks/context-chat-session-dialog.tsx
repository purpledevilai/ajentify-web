"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AjentifyProvider,
  useContextHistory,
  type AjentifyProxyRequest,
} from "@ajentify/chat";
import { ChatView } from "@ajentify/chat/ui";

import { Button } from "@/components/primitives/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { contextsApi } from "@/lib/api/contexts";
import { apiKeysApi } from "@/lib/api/api-keys";
import { useOrgStore } from "@/lib/stores/org-store";
import { chatWebsocketUrl } from "@/lib/session/start-agent-session";
import {
  ClientToolResponseDialog,
  useManualToolResponder,
} from "@/components/blocks/client-tool-response-dialog";

export interface ContextChatSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The existing context to reopen. */
  contextId: string;
  /** The context's `client_id` — the minted token is scoped to it. */
  clientId: string | null;
  /** Used for the chat title and for "+ New chat" (creates a sibling context). */
  agentId: string;
  agentName: string;
  /** Carried over if the user starts a new chat from the header. */
  userDefined?: Record<string, unknown> | null;
}

/**
 * Reopen an EXISTING text context in the chat UI. Renders its own
 * `<AjentifyProvider>` (NOT the docked "Aj" provider) with in-memory storage,
 * then resumes via `useContextHistory().switchTo(contextId)` — the SDK fetches
 * the messages (`get_context`), mints a client token (`generate_access_token`)
 * and reconnects the WebSocket. No new context is created on open.
 */
export function ContextChatSessionDialog({
  open,
  onOpenChange,
  contextId,
  clientId,
  agentId,
  agentName,
  userDefined,
}: ContextChatSessionDialogProps) {
  const responder = useManualToolResponder();

  // client_id of whichever context the SDK is currently on. Seeded from the
  // reopened context; replaced if "+ New chat" creates a sibling context.
  // Only read/written inside the proxy callback, never during render.
  const clientIdRef = useRef<string | null>(clientId);

  const onAjentifyProxyRequest = useCallback(
    async (request: AjentifyProxyRequest): Promise<unknown> => {
      switch (request.type) {
        case "get_context": {
          const ctx = await contextsApi.get(request.contextId, true);
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
        case "create_context": {
          // Only reachable via the header's "+ New chat" button.
          const ctx = await contextsApi.create({
            ...request.request,
            agent_id: agentId,
            user_defined: userDefined ?? undefined,
          });
          clientIdRef.current = ctx.client_id ?? null;
          return ctx;
        }
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
    [agentId, userDefined]
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
      // Resuming — never eagerly create a context on mount.
      agentSpeaksFirst: false,
      // Never share persisted state with the docked Aj chat.
      storage: "memory" as const,
      clientSideTools,
      themeBridge: "shadcn" as const,
      beta: true,
      onError: (err: unknown) => console.error("[context-chat]", err),
    }),
    [onAjentifyProxyRequest, clientSideTools]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[80vh] max-w-3xl overflow-hidden p-0 sm:max-w-3xl"
      >
        <AjentifyProvider config={config}>
          <ResumedChat
            contextId={contextId}
            title={agentName}
            onClose={() => onOpenChange(false)}
          />
          <ClientToolResponseDialog responder={responder} />
        </AjentifyProvider>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Calls `switchTo(contextId)` once on mount and only renders `<ChatView />`
 * after the context is bound, so ChatView's "no context → start a new chat"
 * auto-draft never fires.
 */
function ResumedChat({
  contextId,
  title,
  onClose,
}: {
  contextId: string;
  title: string;
  onClose: () => void;
}) {
  const { switchTo } = useContextHistory();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const resume = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    try {
      await switchTo(contextId);
      setReady(true);
    } catch (err) {
      startedRef.current = false;
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [switchTo, contextId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ready) {
    return (
      <ChatView title={title} onClose={onClose} classNames={{ root: "h-full" }} />
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      {error ? (
        <>
          <p className="text-destructive text-sm">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void resume()}>
              Retry
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Reopening conversation…
        </p>
      )}
    </div>
  );
}
