"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/primitives/button";
import { PageHeader } from "@/components/blocks/page-header";
import { EmptyState } from "@/components/blocks/empty-state";
import { CopyButton } from "@/components/blocks/copy-button";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type ColumnDef } from "@/components/blocks/data-table";
import {
  useApiKeysStore,
  apiKeysActions,
} from "@/lib/stores/api-keys-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import type { ApiAPIKey, ApiAPIKeySummary } from "@/types/api";

export default function ApiKeysPage() {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const data = useApiKeysStore((s) => s.data);
  const loaded = useApiKeysStore((s) => s.loaded);
  const loading = useApiKeysStore((s) => s.loading);
  const error = useApiKeysStore((s) => s.error);
  const ensureLoaded = useApiKeysStore((s) => s.ensureLoaded);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // Holds the freshly generated key whose raw token must be shown once.
  const [newKey, setNewKey] = useState<ApiAPIKey | null>(null);

  const [revokeTarget, setRevokeTarget] = useState<ApiAPIKeySummary | null>(
    null
  );
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ columnId: string; direction: "asc" | "desc" } | null>({
    columnId: "created_at",
    direction: "desc",
  });

  useEffect(() => {
    if (orgId) ensureLoaded();
  }, [orgId, ensureLoaded]);

  const onCreate = useCallback(async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const key = await apiKeysActions.generate({ type: "org" });
      setNewKey(key);
      return key;
    } catch (err: unknown) {
      setCreateError(getErrorMessage(err, "Unable to create API key"));
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  const SetSearchArgs = useMemo(() => z.object({ query: z.string() }), []);
  const SetSortArgs = useMemo(
    () =>
      z.object({
        columnId: z.enum(["token_hint", "status", "created_at"]),
        direction: z.enum(["asc", "desc"]),
      }),
    [],
  );

  useGetPageData(
    () => ({
      data: {
        page: "api_keys",
        key_count: data.length,
        search: query,
        sort,
        keys_summary: data.slice(0, 50).map((k) => ({
          api_key_id: k.api_key_id,
          token_hint: k.token_hint,
          valid: k.valid,
          created_at: k.created_at,
        })),
        note:
          "Use list_api_keys for the full set of fields. Revoking is a user action. create_new mints a new key and opens a one-time dialog showing the raw token — the user must close the dialog after copying.",
      },
      actions: {
        set_search: {
          description: "Filter the visible API keys by a search query.",
          argsSchema: z.toJSONSchema(SetSearchArgs),
        },
        set_sort: {
          description: "Sort the API keys table by one of the allowed columns.",
          argsSchema: z.toJSONSchema(SetSortArgs),
        },
        create_new: {
          description:
            "Click the '+ New API key' button: mints a fresh org API key and opens the one-time token dialog. The token is shown to the user only once.",
          argsSchema: { type: "object", properties: {}, additionalProperties: false },
        },
      },
    }),
    [data, query, sort, SetSearchArgs, SetSortArgs],
  );

  useDoPageAction(
    async (key, args) => {
      if (key === "set_search") {
        const parsed = SetSearchArgs.parse(args);
        setQuery(parsed.query);
        return { ok: true, query: parsed.query };
      }
      if (key === "set_sort") {
        const parsed = SetSortArgs.parse(args);
        setSort({ columnId: parsed.columnId, direction: parsed.direction });
        return { ok: true, sort: parsed };
      }
      if (key === "create_new") {
        const minted = await onCreate();
        return {
          ok: true,
          api_key_id: minted?.api_key_id,
          note: "The raw token is shown in a one-time dialog to the user.",
        };
      }
      return { ok: false, error: `unknown action: ${key}` };
    },
    [onCreate, SetSearchArgs, SetSortArgs],
  );

  async function onConfirmRevoke() {
    if (!revokeTarget) return;
    setRevokeError(null);
    setRevoking(true);
    try {
      await apiKeysActions.revoke(revokeTarget.api_key_id);
      setRevokeTarget(null);
    } catch (err: unknown) {
      setRevokeError(getErrorMessage(err, "Unable to revoke API key"));
    } finally {
      setRevoking(false);
    }
  }

  const columns = useMemo<ColumnDef<ApiAPIKeySummary>[]>(
    () => [
      {
        id: "token_hint",
        header: "Token",
        sortable: true,
        minWidth: "240px",
        sortValue: (k) => k.token_hint,
        searchValue: (k) => `${k.token_hint} ${k.api_key_id}`,
        cell: (k) => (
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
              <KeyRound className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={
                  k.valid
                    ? "text-foreground font-mono text-sm break-all"
                    : "text-muted-foreground font-mono text-sm break-all line-through"
                }
              >
                {k.token_hint}
              </div>
              <div className="text-muted-foreground mt-0.5 flex items-center gap-1 font-mono text-xs">
                <span className="truncate" title={k.api_key_id}>
                  {k.api_key_id.slice(0, 8)}…
                </span>
                <CopyButton value={k.api_key_id} label="Copy key ID" />
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (k) => (k.valid ? "valid" : "revoked"),
        width: "120px",
        cell: (k) =>
          k.valid ? (
            <Badge variant="secondary">Valid</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Revoked
            </Badge>
          ),
      },
      {
        id: "created_at",
        header: "Created",
        sortable: true,
        sortValue: (k) => k.created_at,
        width: "160px",
        cell: (k) => (
          <span
            className="text-muted-foreground tabular-nums"
            title={formatDateTime(k.created_at)}
          >
            {formatRelativeTime(k.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        align: "right",
        width: "100px",
        cell: (k) =>
          k.valid ? (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setRevokeError(null);
                  setRevokeTarget(k);
                }}
              >
                <Trash2 className="size-4" />
                Revoke
              </Button>
            </div>
          ) : null,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        subtitle="Tokens for programmatic access to the Ajentify API."
        actions={
          <Button variant="gradient" onClick={onCreate} disabled={creating}>
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {creating ? "Creating…" : "New API key"}
          </Button>
        }
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {createError && <p className="text-destructive text-sm">{createError}</p>}

      <DataTable<ApiAPIKeySummary>
        data={data}
        columns={columns}
        getRowKey={(k) => k.api_key_id}
        loading={loading}
        loaded={loaded}
        defaultSort={{ columnId: "created_at", direction: "desc" }}
        searchPlaceholder="Search API keys…"
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        emptyState={
          <EmptyState
            icon={KeyRound}
            title="No API keys yet"
            description="Create an API key to authenticate server-side requests against the Ajentify API."
            action={
              <Button
                variant="gradient"
                onClick={onCreate}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {creating ? "Creating…" : "New API key"}
              </Button>
            }
          />
        }
      />

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
            setRevokeError(null);
          }
        }}
        title="Revoke this API key?"
        description={
          <>
            The token ending in{" "}
            <span className="text-foreground font-mono">
              {revokeTarget?.token_hint}
            </span>{" "}
            will stop working immediately. Any clients still using it will
            fail to authenticate. This cannot be undone.
            {revokeError && (
              <span className="text-destructive mt-2 block">
                {revokeError}
              </span>
            )}
          </>
        }
        confirmLabel="Revoke"
        loadingLabel="Revoking"
        loading={revoking}
        onConfirm={onConfirmRevoke}
      />

      <NewKeyDialog
        apiKey={newKey}
        onClose={() => setNewKey(null)}
      />
    </div>
  );
}

function NewKeyDialog({
  apiKey,
  onClose,
}: {
  apiKey: ApiAPIKey | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={apiKey !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>API key created</DialogTitle>
          <DialogDescription>
            Copy this token now and store it somewhere safe.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            This is the <strong>only time</strong> you&apos;ll see this token.
            We don&apos;t store it in a way that lets us show it again — if you
            lose it, revoke it and create a new one.
          </p>
        </div>

        {apiKey && (
          <div className="space-y-2">
            <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Token
            </div>
            <div className="border-border bg-muted/40 flex items-start gap-2 rounded-md border p-2">
              <code className="flex-1 break-all font-mono text-xs">
                {apiKey.token}
              </code>
              <CopyButton
                value={apiKey.token}
                label="Copy token"
                stopRowPropagation={false}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="solid" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
