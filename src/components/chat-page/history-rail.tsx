"use client";

import { useMemo, useState } from "react";
import { Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import type { HistoryContext } from "@ajentify/chat";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import { groupHistoryByDate } from "@/lib/chat-page/helpers";
import { formatRelativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

export interface HistoryRailProps {
  history: HistoryContext[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  currentContextId: string | null;
  onSelect: (contextId: string) => void;
  onNewChat: () => void;
  onDelete: (contextId: string) => Promise<void>;
  onRetry: () => void;
  className?: string;
}

/**
 * Right-hand conversation list. Grouped by day, newest first; the active
 * conversation is highlighted. Deletion confirms via `ConfirmDialog`.
 */
export function HistoryRail({
  history,
  loading,
  loaded,
  error,
  currentContextId,
  onSelect,
  onNewChat,
  onDelete,
  onRetry,
  className,
}: HistoryRailProps) {
  const groups = useMemo(() => groupHistoryByDate(history), [history]);
  const [pendingDelete, setPendingDelete] = useState<HistoryContext | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete.context_id);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const showSkeleton = loading && !loaded && history.length === 0;

  return (
    <div className={cn("bg-background flex h-full min-h-0 flex-col", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Conversations
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={onNewChat}
        >
          <Plus className="size-3.5" />
          New chat
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {showSkeleton && (
          <div className="space-y-2 px-2 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!showSkeleton && error && history.length === 0 && (
          <div className="px-2 pt-6 text-center">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}

        {!showSkeleton && !error && loaded && history.length === 0 && (
          <p className="text-muted-foreground px-2 pt-8 text-center text-sm">
            No conversations yet.
            <br />
            Start one on the left.
          </p>
        )}

        {groups.map((group) => (
          <section key={group.label} className="mt-3 first:mt-1">
            <h3 className="text-muted-foreground px-2 pb-1 text-[11px] font-medium">
              {group.label}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <HistoryRow
                  key={item.context_id}
                  item={item}
                  active={item.context_id === currentContextId}
                  onSelect={() => onSelect(item.context_id)}
                  onDelete={() => setPendingDelete(item)}
                />
              ))}
            </ul>
          </section>
        ))}

        {loading && loaded && (
          <div className="text-muted-foreground flex justify-center pt-3">
            <Loader2 className="size-3.5 animate-spin" />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title="Delete this conversation?"
        description={
          pendingDelete ? (
            <>
              The conversation with{" "}
              <span className="text-foreground font-medium">
                {pendingDelete.agent.agent_name}
              </span>{" "}
              will be permanently removed. This cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete"
        loadingLabel="Deleting"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function HistoryRow({
  item,
  active,
  onSelect,
  onDelete,
}: {
  item: HistoryContext;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const preview = item.last_message?.trim() || "New conversation";
  return (
    <li
      className={cn(
        "group/row relative rounded-lg transition-colors",
        active ? "bg-muted" : "hover:bg-muted/60"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className="flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 pr-9 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{item.agent.agent_name}</span>
          <span className="text-muted-foreground shrink-0 text-[11px]">
            {formatRelativeTime(item.updated_at)}
          </span>
        </span>
        <span className="text-muted-foreground truncate text-xs">{preview}</span>
      </button>
      <div
        className={cn(
          "absolute top-1.5 right-1.5 transition-opacity",
          menuOpen || active
            ? "opacity-100"
            : "opacity-0 group-hover/row:opacity-100 focus-within:opacity-100"
        )}
      >
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Conversation actions"
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
