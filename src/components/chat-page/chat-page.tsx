"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { History, MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  AjentifyProvider,
  useChat,
  useContextHistory,
  useCurrentContext,
  type AjentifyError,
  type AjentifyProxyRequest,
  type ConnectionStatus,
  type HistoryContext,
} from "@ajentify/chat";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { contextsApi } from "@/lib/api/contexts";
import { apiKeysApi } from "@/lib/api/api-keys";
import { ApiError, getErrorMessage } from "@/lib/api/errors";
import { useAgentsStore } from "@/lib/stores/agents-store";
import { useModelsStore } from "@/lib/stores/models-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { chatWebsocketUrl } from "@/lib/session/start-agent-session";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import {
  consumeAddMessageParam,
  readLastAgentId,
  resolveInitialAgentId,
  writeLastAgentId,
} from "@/lib/chat-page/helpers";
import { cn } from "@/lib/utils";
import type { ApiAgent } from "@/types/api";

import { AgentPicker } from "./agent-picker";
import { ChatComposer } from "./chat-composer";
import { ChatMessages } from "./chat-messages";
import { HistoryRail } from "./history-rail";

export interface ChatPageProps {
  /** The conversation the URL points at; undefined on `/app/chat` (new chat). */
  contextId?: string;
}

const CHAT_ROUTE = "/app/chat";
const chatHref = (id: string) => `${CHAT_ROUTE}/${id}`;

/**
 * `/app/chat` — the consumer chat page. Mounts its own `AjentifyProvider`
 * (separate from the dashboard's docked Aj), with in-memory storage so it
 * never shares persisted state with it.
 *
 * The provider is created once per mount; the agent picked for a new chat
 * is read through a ref inside the `create_context` proxy case so changing
 * the picker never requires a remount. This component is rendered from the
 * `/app/chat` route-group *layout* (not the pages) so navigating between
 * `/app/chat` and `/app/chat/[context_id]` keeps the provider — and the live
 * WebSocket — mounted.
 */
export function ChatPage({ contextId }: ChatPageProps) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const agents = useAgentsStore((s) => s.data);
  const agentsLoaded = useAgentsStore((s) => s.loaded);
  const agentsLoading = useAgentsStore((s) => s.loading);
  const ensureAgents = useAgentsStore((s) => s.ensureLoaded);
  const models = useModelsStore((s) => s.data);

  useEffect(() => {
    void ensureAgents();
  }, [ensureAgents]);

  // Chat-capable agents: drop realtime (voice-only) models.
  const chatAgents = useMemo(() => {
    const realtime = new Set(models.filter((m) => m.is_realtime).map((m) => m.model));
    return agents.filter((a) => !a.model_id || !realtime.has(a.model_id));
  }, [agents, models]);

  // The user's explicit pick (or the remembered one); resolved against the
  // available list so a stale/foreign id falls back to the first agent.
  const [chosenAgentId, setChosenAgentId] = useState<string | null>(() =>
    readLastAgentId(activeOrgId)
  );
  const selectedAgentId = useMemo(
    () => resolveInitialAgentId(chatAgents, chosenAgentId),
    [chatAgents, chosenAgentId]
  );
  const selectAgent = useCallback(
    (id: string) => {
      setChosenAgentId(id);
      writeLastAgentId(activeOrgId, id);
    },
    [activeOrgId]
  );

  // Refs read inside the proxy callback (never during render).
  const agentIdRef = useRef<string | null>(null);
  useEffect(() => {
    agentIdRef.current = selectedAgentId;
  }, [selectedAgentId]);
  const clientIdRef = useRef<string | null>(null);

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
          const agentId = agentIdRef.current;
          if (!agentId) throw new Error("Choose an agent to start a chat.");
          const ctx = await contextsApi.create({
            ...request.request,
            agent_id: agentId,
          });
          clientIdRef.current = ctx.client_id ?? null;
          return ctx;
        }
        case "get_context_history": {
          const res = await api.get<{ contexts?: HistoryContext[] }>(
            "/context-history"
          );
          return res.contexts ?? [];
        }
        case "delete_context":
          await contextsApi.delete(request.contextId);
          return undefined;
        default:
          return undefined;
      }
    },
    []
  );

  const config = useMemo(
    () => ({
      onAjentifyProxyRequest,
      websocketUrl: chatWebsocketUrl(),
      agentSpeaksFirst: false,
      storage: "memory" as const,
      themeBridge: "shadcn" as const,
      onError: (err: AjentifyError) => {
        console.error("[chat-page]", err);
        toast.error(err.message || "Something went wrong in the chat.");
      },
    }),
    [onAjentifyProxyRequest]
  );

  return (
    <AjentifyProvider config={config}>
      <Suspense fallback={<ChatPageSkeleton />}>
        <ChatPageInner
          routeContextId={contextId}
          agents={chatAgents}
          agentsLoading={agentsLoading && !agentsLoaded}
          agentsLoaded={agentsLoaded}
          selectedAgentId={selectedAgentId}
          onSelectAgent={selectAgent}
        />
      </Suspense>
    </AjentifyProvider>
  );
}

// ---------------------------------------------------------------------------

interface InnerProps {
  routeContextId?: string;
  agents: ApiAgent[];
  agentsLoading: boolean;
  agentsLoaded: boolean;
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
}

interface SwitchFailure {
  id: string;
  notFound: boolean;
  message: string;
}

/** Best-effort HTTP status off an SDK error wrapping our `ApiError`. */
function apiStatusOf(err: unknown): number | null {
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    if (cur instanceof ApiError) return cur.status;
    cur = (cur as { cause?: unknown }).cause;
  }
  return null;
}

const BUSY: ReadonlySet<ConnectionStatus> = new Set<ConnectionStatus>([
  "streaming",
  "awaiting_tool_responses",
]);
const SENDABLE: ReadonlySet<ConnectionStatus> = new Set<ConnectionStatus>([
  "connected",
  "streaming",
  "awaiting_tool_responses",
]);

function ChatPageInner({
  routeContextId,
  agents,
  agentsLoading,
  agentsLoaded,
  selectedAgentId,
  onSelectAgent,
}: InnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chat = useChat();
  const {
    history,
    loading: historyLoading,
    loaded: historyLoaded,
    error: historyError,
    load: loadHistory,
    ensureLoaded: ensureHistory,
    switchTo,
    createNew,
    clearCurrent,
    deleteContext,
  } = useContextHistory();
  // The current store's id is set synchronously by `switchTo` / on draft
  // materialisation — the right thing to compare the URL against.
  const liveContextId = useCurrentContext((s) => s.contextId);

  // --- History rail -----------------------------------------------------------
  useEffect(() => {
    void ensureHistory().catch(() => {});
  }, [ensureHistory]);

  // `/context-history` spans every org the user belongs to; narrow it to the
  // active org's agents once we know them. (Falls back to showing all.)
  const visibleHistory = useMemo(() => {
    if (!agentsLoaded || agents.length === 0) return history;
    const ids = new Set(agents.map((a) => a.agent_id));
    return history.filter((h) => ids.has(h.agent.agent_id));
  }, [history, agents, agentsLoaded]);

  // --- Route → store sync ---------------------------------------------------
  const switchTargetRef = useRef<string | null>(null);
  const [switchFailure, setSwitchFailure] = useState<SwitchFailure | null>(null);

  const openContext = useCallback(
    (id: string) => {
      if (switchTargetRef.current === id) return;
      switchTargetRef.current = id;
      switchTo(id)
        .then(() => {
          if (switchTargetRef.current === id) switchTargetRef.current = null;
        })
        .catch((err: unknown) => {
          if (switchTargetRef.current !== id) return;
          switchTargetRef.current = null;
          const status = apiStatusOf(err);
          setSwitchFailure({
            id,
            notFound: status === 404 || status === 403,
            message: getErrorMessage(
              err,
              err instanceof Error ? err.message : "Couldn't open this conversation."
            ),
          });
        });
    },
    [switchTo]
  );

  const prevRouteRef = useRef<string | undefined | null>(null); // null = first run
  useEffect(() => {
    const prev = prevRouteRef.current;
    prevRouteRef.current = routeContextId;
    if (routeContextId) {
      if (liveContextId !== routeContextId) openContext(routeContextId);
      return;
    }
    // `/app/chat`: on first mount, or when coming back from a conversation,
    // start a fresh draft. (A draft that just materialised keeps the store's
    // id while the URL catches up — see the URL-sync effect below.)
    if (prev === null || prev !== undefined) {
      clearCurrent();
      void createNew();
    }
    // `liveContextId` intentionally omitted: this effect reacts to the URL only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeContextId, openContext, clearCurrent, createNew]);

  // Store → URL: the first send on a draft materialises a context; once the
  // store has its id, move the URL to `/app/chat/<id>` without a remount.
  const prevLiveRef = useRef<string | null>(liveContextId);
  useEffect(() => {
    const prev = prevLiveRef.current;
    prevLiveRef.current = liveContextId;
    if (!routeContextId && prev === null && liveContextId) {
      router.replace(chatHref(liveContextId));
      void loadHistory().catch(() => {});
    }
  }, [liveContextId, routeContextId, router, loadHistory]);

  // Refresh the rail (ordering + last_message) when a turn finishes.
  const prevStatusRef = useRef<ConnectionStatus>(chat.status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = chat.status;
    if (BUSY.has(prev) && chat.status === "connected") {
      void loadHistory().catch(() => {});
    }
  }, [chat.status, loadHistory]);

  // --- Deep link `?add_message=` --------------------------------------------------
  const addMessage = useMemo(
    () => consumeAddMessageParam(pathname, searchParams.toString()),
    [pathname, searchParams]
  );
  const addMessageSentRef = useRef<string | null>(null);
  const { send: sendMessage, status: chatStatus } = chat;
  useEffect(() => {
    if (!routeContextId) return;
    if (addMessage.tooLong) {
      const key = `${routeContextId}:toolong`;
      if (addMessageSentRef.current === key) return;
      addMessageSentRef.current = key;
      toast.error("That link's message is too long to send automatically.");
      router.replace(addMessage.strippedUrl);
      return;
    }
    const text = addMessage.text;
    if (!text) return;
    // Wait until the URL's context is the live one and the socket is usable.
    if (liveContextId !== routeContextId || !SENDABLE.has(chatStatus)) return;
    // Exactly once per (context, text) — survives re-renders and StrictMode.
    const key = `${routeContextId}:${text}`;
    if (addMessageSentRef.current === key) return;
    addMessageSentRef.current = key;
    void sendMessage(text).catch(() => {});
    router.replace(addMessage.strippedUrl);
  }, [addMessage, routeContextId, liveContextId, chatStatus, sendMessage, router]);

  // --- Actions -----------------------------------------------------------------
  const [railOpen, setRailOpen] = useState(false);
  const isMobile = useIsMobile();

  const goNewChat = useCallback(() => {
    setRailOpen(false);
    if (routeContextId === undefined) {
      // Already on `/app/chat`: just reset to a fresh draft.
      clearCurrent();
      void createNew();
      return;
    }
    router.push(CHAT_ROUTE);
  }, [routeContextId, router, clearCurrent, createNew]);

  const selectConversation = useCallback(
    (id: string) => {
      setRailOpen(false);
      if (id === liveContextId) return;
      setSwitchFailure(null);
      // Switch immediately for snappiness; the route effect dedupes via the
      // in-flight target ref once the URL catches up.
      openContext(id);
      router.push(chatHref(id));
    },
    [liveContextId, openContext, router]
  );

  const removeConversation = useCallback(
    async (id: string) => {
      try {
        const wasCurrent = id === liveContextId;
        await deleteContext(id);
        toast.success("Conversation deleted");
        if (wasCurrent) router.push(CHAT_ROUTE);
      } catch (err) {
        toast.error(getErrorMessage(err, "Couldn't delete the conversation."));
        throw err;
      }
    },
    [deleteContext, liveContextId, router]
  );

  const send = useCallback(
    (text: string) => chat.send(text).catch(() => {}),
    [chat]
  );

  // --- Derived view state -------------------------------------------------------
  const failure =
    switchFailure && switchFailure.id === routeContextId ? switchFailure : null;
  const isNewChat = !routeContextId;
  const opening =
    !!routeContextId &&
    !failure &&
    (liveContextId !== routeContextId ||
      (chat.status === "connecting" && chat.messages.length === 0));
  const showHero = isNewChat && chat.messages.length === 0 && !chat.pendingResponse;

  const pickedAgent = agents.find((a) => a.agent_id === selectedAgentId) ?? null;
  const historyAgentName = routeContextId
    ? history.find((h) => h.context_id === routeContextId)?.agent.agent_name
    : undefined;
  const headerAgentName = isNewChat
    ? (chat.agent?.agent_name ?? pickedAgent?.agent_name ?? "New chat")
    : (chat.agent?.agent_name ?? historyAgentName ?? "Conversation");

  const composerDisabled =
    chat.status === "connecting" ||
    chat.isPreparingNewChat ||
    (isNewChat && chat.isDraft && !selectedAgentId) ||
    opening ||
    !!failure;

  const rail = (
    <HistoryRail
      history={visibleHistory}
      loading={historyLoading}
      loaded={historyLoaded}
      error={historyError}
      currentContextId={liveContextId}
      onSelect={selectConversation}
      onNewChat={goNewChat}
      onDelete={removeConversation}
      onRetry={() => void loadHistory().catch(() => {})}
    />
  );

  return (
    <div className="bg-background flex h-full min-h-0 w-full">
      {/* Chat column */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <StatusDot status={chat.status} />
            <h1 className="truncate text-sm font-medium">{headerAgentName}</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="New chat"
              onClick={goNewChat}
              className="md:hidden"
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Conversation history"
              onClick={() => setRailOpen(true)}
              className="md:hidden"
            >
              <History className="size-4" />
            </Button>
          </div>
        </header>

        {failure ? (
          <NotFoundState notFound={failure.notFound} message={failure.message} onNew={goNewChat} />
        ) : opening ? (
          <OpeningSkeleton />
        ) : showHero ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4 pb-16 md:px-6">
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
                <MessageSquare className="size-6" />
              </div>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                What can I help with?
              </h2>
              <AgentPicker
                agents={agents}
                value={selectedAgentId}
                onChange={onSelectAgent}
                loading={agentsLoading}
              />
            </div>
            <ChatComposer
              className="w-full max-w-3xl"
              onSend={send}
              disabled={composerDisabled}
              placeholder={
                pickedAgent ? `Message ${pickedAgent.agent_name}…` : "Choose an agent to begin"
              }
              autoFocus={!isMobile}
            />
          </div>
        ) : (
          <>
            <ChatMessages
              messages={chat.messages}
              pendingResponse={chat.pendingResponse}
              isWaitingForResponse={chat.isWaitingForResponse}
              isStreaming={BUSY.has(chat.status)}
              subagentRuns={chat.subagentRuns}
            />
            <div className="shrink-0 px-4 pt-2 pb-4 md:px-6 md:pb-6">
              <ChatComposer
                className="mx-auto w-full max-w-3xl"
                onSend={send}
                disabled={composerDisabled}
                canCancel={chat.canCancel}
                isCancelling={chat.isCancelling}
                onCancel={() => void chat.cancel()}
                placeholder={`Message ${chat.agent?.agent_name ?? headerAgentName}…`}
                autoFocus={!isMobile}
              />
              {chat.error && (
                <p className="text-destructive mx-auto mt-2 max-w-3xl text-center text-xs">
                  {chat.error}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={chat.clearError}
                  >
                    Dismiss
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* History rail — desktop */}
      <aside className="border-border hidden w-[300px] shrink-0 border-l md:block">
        {rail}
      </aside>

      {/* History rail — mobile drawer */}
      <DialogPrimitive.Root open={railOpen} onOpenChange={setRailOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 duration-200 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 md:hidden" />
          <DialogPrimitive.Popup className="bg-background border-border fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85%] flex-col border-l outline-none duration-200 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right md:hidden">
            <DialogPrimitive.Title className="sr-only">
              Conversation history
            </DialogPrimitive.Title>
            {rail}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

// ---------------------------------------------------------------------------

const DOT: Record<ConnectionStatus, { className: string; label: string }> = {
  idle: { className: "bg-muted-foreground/40", label: "Idle" },
  draft: { className: "bg-muted-foreground/40", label: "New chat" },
  connecting: { className: "bg-amber-500 animate-pulse", label: "Connecting" },
  connected: { className: "bg-emerald-500", label: "Connected" },
  streaming: { className: "bg-primary animate-pulse", label: "Responding" },
  awaiting_tool_responses: { className: "bg-primary animate-pulse", label: "Working" },
  error: { className: "bg-destructive", label: "Error" },
  disconnected: { className: "bg-destructive/70", label: "Disconnected" },
};

function StatusDot({ status }: { status: ConnectionStatus }) {
  const d = DOT[status] ?? DOT.idle;
  return (
    <span
      role="img"
      aria-label={d.label}
      title={d.label}
      className={cn("inline-block size-2 shrink-0 rounded-full", d.className)}
    />
  );
}

function OpeningSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
        <Skeleton className="ml-auto h-10 w-2/5 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="ml-auto h-10 w-1/3 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="px-4 pb-4 md:px-6 md:pb-6">
        <Skeleton className="mx-auto h-14 w-full max-w-3xl rounded-2xl" />
      </div>
    </div>
  );
}

function NotFoundState({
  notFound,
  message,
  onNew,
}: {
  notFound: boolean;
  message: string;
  onNew: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
        <MessageSquare className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {notFound ? "Conversation not found" : "Couldn't open this conversation"}
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          {notFound
            ? "It may have been deleted, or you don't have access to it."
            : message}
        </p>
      </div>
      <Button type="button" onClick={onNew} className="rounded-full">
        <Plus className="size-4" />
        New chat
      </Button>
    </div>
  );
}

export function ChatPageSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-12 items-center px-4 md:px-6">
          <Skeleton className="h-4 w-32" />
        </div>
        <OpeningSkeleton />
      </div>
      <aside className="border-border hidden w-[300px] shrink-0 space-y-2 border-l p-4 md:block">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </aside>
    </div>
  );
}
