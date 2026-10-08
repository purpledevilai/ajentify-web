"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Mic } from "lucide-react";
import { useGetPageData } from "@ajentify/chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/primitives/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/blocks/copy-button";
import { ContextChatSessionDialog } from "@/components/blocks/context-chat-session-dialog";
import { ContextVoiceSessionDialog } from "@/components/blocks/context-voice-session-dialog";
import { contextsApi } from "@/lib/api/contexts";
import { getErrorMessage } from "@/lib/api/errors";
import { useAgentsStore } from "@/lib/stores/agents-store";
import { useModelsStore } from "@/lib/stores/models-store";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { ApiContext, ApiContextMessage } from "@/types/api";

/**
 * Pretty-prints a string as JSON when it parses, otherwise renders it as
 * plain text. Used for tool output (a string that is frequently JSON).
 */
function JsonOrText({ value }: { value: string }) {
  const { isJson, pretty } = useMemo(() => {
    const trimmed = value?.trimStart() ?? "";
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return { isJson: true, pretty: JSON.stringify(JSON.parse(value), null, 2) };
      } catch {
        /* not valid JSON — fall through to plain text */
      }
    }
    return { isJson: false, pretty: value };
  }, [value]);

  return (
    <pre
      className={cn(
        "bg-muted/50 max-h-96 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap break-words",
        isJson ? "font-mono" : "font-sans",
      )}
    >
      {pretty || "(empty)"}
    </pre>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  const pretty = useMemo(() => {
    try {
      return JSON.stringify(value ?? null, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <pre className="bg-muted/50 max-h-96 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap break-words">
      {pretty}
    </pre>
  );
}

const SENDER_LABEL: Record<string, string> = {
  human: "Human",
  ai: "AI",
  system: "System",
};

function MessageCard({ msg }: { msg: ApiContextMessage }) {
  if ("sender" in msg) {
    return (
      <div className="bg-card border-border rounded-lg border p-4">
        <Badge
          variant={msg.sender === "ai" ? "default" : "secondary"}
          className="mb-2"
        >
          {SENDER_LABEL[msg.sender] ?? msg.sender}
        </Badge>
        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
      </div>
    );
  }

  if (msg.type === "tool_call") {
    return (
      <div className="border-border bg-muted/30 rounded-lg border p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">Tool call</Badge>
          <span className="font-mono text-sm font-medium">{msg.tool_name}</span>
          <span className="text-muted-foreground font-mono text-xs">
            {msg.tool_call_id}
          </span>
        </div>
        <p className="text-muted-foreground mb-1 text-xs">Input</p>
        <JsonBlock value={msg.tool_input ?? {}} />
      </div>
    );
  }

  return (
    <div className="border-border bg-muted/30 rounded-lg border p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline">Tool response</Badge>
        <span className="text-muted-foreground font-mono text-xs">
          {msg.tool_call_id}
        </span>
      </div>
      <p className="text-muted-foreground mb-1 text-xs">Output</p>
      <JsonOrText value={msg.tool_output ?? ""} />
    </div>
  );
}

function HeaderField({
  label,
  value,
  copyable,
  href,
}: {
  label: string;
  value: string;
  copyable?: string;
  href?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-[0.7rem] font-medium tracking-wider uppercase">
        {label}
      </p>
      <div className="mt-0.5 flex items-center gap-1">
        {href ? (
          <Link
            href={href}
            className="text-primary truncate font-mono text-sm hover:underline"
            title={value}
          >
            {value}
          </Link>
        ) : (
          <span
            className={cn("truncate text-sm", copyable && "font-mono")}
            title={value}
          >
            {value || "—"}
          </span>
        )}
        {copyable && <CopyButton value={copyable} label={`Copy ${label}`} />}
      </div>
    </div>
  );
}

export default function ContextDetailPage() {
  const router = useRouter();
  const params = useParams<{ context_id: string }>();
  const contextId = params?.context_id;

  const [context, setContext] = useState<ApiContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  const models = useModelsStore((s) => s.data);
  const ensureModels = useModelsStore((s) => s.ensureLoaded);
  const agents = useAgentsStore((s) => s.data);
  const ensureAgents = useAgentsStore((s) => s.ensureLoaded);

  useEffect(() => {
    // Needed to resolve the context's model (voice vs text) and agent name.
    ensureModels();
    ensureAgents();
  }, [ensureModels, ensureAgents]);

  useEffect(() => {
    if (!contextId) return;
    let cancelled = false;
    // Defined as an async function so the initial setState calls don't run
    // synchronously in the effect body (avoids cascading-render lint).
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const c = await contextsApi.get(contextId, true);
        if (!cancelled) setContext(c);
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e, "Failed to load context"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [contextId]);

  // Silent refetch after a session closes so the message list reflects the
  // conversation that just happened.
  const refetch = useCallback(async () => {
    if (!contextId) return;
    try {
      setContext(await contextsApi.get(contextId, true));
    } catch {
      // keep the stale view; the user can reload
    }
  }, [contextId]);

  const agent = useMemo(
    () => (context ? agents.find((a) => a.agent_id === context.agent_id) : undefined),
    [agents, context],
  );
  // The model the context was created with. Older contexts predate
  // `model_id` on the row — fall back to the agent's current model.
  const sessionModelId = context?.model_id || agent?.model_id || null;
  const sessionModel = models.find((m) => m.model === sessionModelId);
  const isRealtime = !!sessionModel?.is_realtime;
  const canOpen = !!context && !!sessionModelId;
  const agentName = agent?.agent_name ?? context?.agent_id ?? "Agent";

  const handleSessionOpenChange = useCallback(
    (open: boolean) => {
      setSessionOpen(open);
      if (!open) void refetch();
    },
    [refetch],
  );

  useGetPageData(
    () => ({
      data: {
        page: "context_detail",
        context_id: contextId,
        loading,
        error,
        context: context
          ? {
              context_id: context.context_id,
              agent_id: context.agent_id,
              client_id: context.client_id,
              model_id: context.model_id,
              created_at: context.created_at,
              updated_at: context.updated_at,
              message_count: context.messages?.length ?? 0,
            }
          : null,
        session_model_id: sessionModelId,
        session_kind: isRealtime ? "voice" : "chat",
        session_open: sessionOpen,
        note: "Context inspector. The user can reopen this context in a chat or voice session via the header button.",
      },
      actions: {},
    }),
    [contextId, loading, error, context, sessionModelId, isRealtime, sessionOpen],
  );

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/app/contexts")}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Context
        </h1>
        {!loading && !error && context && (
          <span
            className="ml-auto"
            title={
              !sessionModelId
                ? "This context has no model to open a session with"
                : undefined
            }
          >
            <Button
              variant="outline"
              size="sm"
              className="sm:h-9 sm:px-4"
              disabled={!canOpen}
              onClick={() => setSessionOpen(true)}
            >
              {isRealtime ? (
                <Mic className="size-4" />
              ) : (
                <MessageSquare className="size-4" />
              )}
              {isRealtime ? "Voice call" : "Chat"}
            </Button>
          </span>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading && (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && !error && context && (
        <>
          {/* Summary */}
          <div className="bg-card border-border rounded-lg border p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <HeaderField
                label="Context ID"
                value={context.context_id}
                copyable={context.context_id}
              />
              <HeaderField
                label="Agent ID"
                value={context.agent_id}
                copyable={context.agent_id}
                href={`/app/agents/${context.agent_id}`}
              />
              <HeaderField
                label="Client ID"
                value={context.client_id || "—"}
                copyable={context.client_id || undefined}
              />
              <HeaderField label="Model" value={context.model_id || "—"} />
              <HeaderField
                label="Created"
                value={formatDateTime(context.created_at)}
              />
              <HeaderField
                label="Updated"
                value={formatDateTime(context.updated_at)}
              />
            </div>
          </div>

          {/* System prompt */}
          {context.system_prompt && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold">
                  System prompt
                </h2>
                <CopyButton
                  value={context.system_prompt}
                  label="Copy system prompt"
                />
              </div>
              <pre className="bg-muted/50 max-h-96 overflow-auto rounded-md p-3 font-sans text-sm whitespace-pre-wrap break-words">
                {context.system_prompt}
              </pre>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold">
              Messages ({context.messages?.length ?? 0})
            </h2>
            {!context.messages || context.messages.length === 0 ? (
              <div className="border-border text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
                No messages.
              </div>
            ) : (
              <div className="space-y-3">
                {context.messages.map((m, i) => (
                  <MessageCard key={i} msg={m} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {sessionOpen &&
        context &&
        (isRealtime ? (
          <ContextVoiceSessionDialog
            open={sessionOpen}
            onOpenChange={handleSessionOpenChange}
            contextId={context.context_id}
            clientId={context.client_id ?? null}
            agentName={agentName}
          />
        ) : (
          <ContextChatSessionDialog
            open={sessionOpen}
            onOpenChange={handleSessionOpenChange}
            contextId={context.context_id}
            clientId={context.client_id ?? null}
            agentId={context.agent_id}
            agentName={agentName}
            userDefined={context.user_defined}
          />
        ))}
    </div>
  );
}
