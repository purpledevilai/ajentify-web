"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Phone,
  PhoneOff,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/blocks/page-header";
import { EmptyState } from "@/components/blocks/empty-state";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import { CopyButton } from "@/components/blocks/copy-button";
import { PhoneNumberDialog } from "@/components/blocks/phone-number-dialog";
import { TwilioSetupInstructionsDialog } from "@/components/blocks/twilio-setup-instructions";
import { DataTable, type ColumnDef } from "@/components/blocks/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrgStore } from "@/lib/stores/org-store";
import { useAgentsStore } from "@/lib/stores/agents-store";
import {
  phoneNumbersActions,
  usePhoneNumbersStore,
} from "@/lib/stores/phone-numbers-store";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import { getErrorMessage } from "@/lib/api/errors";
import type { ApiPhoneNumber } from "@/types/api";

export default function PhoneNumbersPage() {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const data = usePhoneNumbersStore((s) => s.data);
  const loaded = usePhoneNumbersStore((s) => s.loaded);
  const loading = usePhoneNumbersStore((s) => s.loading);
  const error = usePhoneNumbersStore((s) => s.error);
  const ensureLoaded = usePhoneNumbersStore((s) => s.ensureLoaded);
  const agents = useAgentsStore((s) => s.data);
  const ensureAgents = useAgentsStore((s) => s.ensureLoaded);

  const [connectOpen, setConnectOpen] = useState(false);
  const [editing, setEditing] = useState<ApiPhoneNumber | null>(null);
  const [instructionsFor, setInstructionsFor] = useState<ApiPhoneNumber | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApiPhoneNumber | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ columnId: string; direction: "asc" | "desc" } | null>({
    columnId: "created_at",
    direction: "desc",
  });

  useEffect(() => {
    if (!orgId) return;
    ensureLoaded().catch(() => {});
    ensureAgents().catch(() => {});
  }, [orgId, ensureLoaded, ensureAgents]);

  const agentNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of agents) m.set(a.agent_id, a.agent_name);
    return m;
  }, [agents]);

  const openInstructions = useCallback((n: ApiPhoneNumber | null) => {
    setInstructionsFor(n);
    setInstructionsOpen(true);
  }, []);

  const detach = useCallback(async (n: ApiPhoneNumber) => {
    try {
      await phoneNumbersActions.detach(n.phone_number_id);
      toast.success(`Detached ${n.phone_number}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to detach number"));
    }
  }, []);

  const onDeleteConfirmed = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await phoneNumbersActions.remove(pendingDelete.phone_number_id);
      toast.success(`Removed ${pendingDelete.phone_number}`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to remove number"));
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete]);

  // --- Aj page hooks --------------------------------------------------------
  const SetSearchArgs = useMemo(() => z.object({ query: z.string() }), []);

  useGetPageData(
    () => ({
      data: {
        page: "phone_numbers",
        phone_number_count: data.length,
        search: query,
        phone_numbers: data.slice(0, 50).map((n) => ({
          phone_number_id: n.phone_number_id,
          phone_number: n.phone_number,
          friendly_name: n.friendly_name,
          ownership: n.ownership,
          agent_id: n.agent_id,
          agent_name: n.agent_id ? (agentNameById.get(n.agent_id) ?? null) : null,
          has_twilio_auth_token: n.has_twilio_auth_token,
          created_at: n.created_at,
        })),
        note:
          "Phone numbers route inbound Twilio calls to realtime agents. Connecting, editing and removing numbers are user actions; attach/detach happens in the agent builder.",
      },
      actions: {
        set_search: {
          description: "Filter the visible numbers by a search query.",
          argsSchema: z.toJSONSchema(SetSearchArgs),
        },
        open_connect_dialog: {
          description: "Open the 'Connect your own Twilio number' dialog for the user to fill in.",
          argsSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        open_setup_instructions: {
          description: "Show the Twilio Console setup instructions (webhook URL and credentials).",
          argsSchema: { type: "object", properties: {}, additionalProperties: false },
        },
      },
    }),
    [data, query, agentNameById, SetSearchArgs]
  );

  useDoPageAction(
    async (key, args) => {
      if (key === "set_search") {
        const parsed = SetSearchArgs.parse(args);
        setQuery(parsed.query);
        return { ok: true, query: parsed.query };
      }
      if (key === "open_connect_dialog") {
        setConnectOpen(true);
        return { ok: true };
      }
      if (key === "open_setup_instructions") {
        openInstructions(null);
        return { ok: true };
      }
      return { ok: false, error: `unknown action: ${key}` };
    },
    [SetSearchArgs, openInstructions]
  );

  const columns = useMemo<ColumnDef<ApiPhoneNumber>[]>(
    () => [
      {
        id: "number",
        header: "Number",
        sortable: true,
        minWidth: "240px",
        sortValue: (n) => n.phone_number,
        searchValue: (n) => `${n.phone_number} ${n.friendly_name ?? ""}`,
        cell: (n) => (
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
              <Phone className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-foreground flex items-center gap-1 font-mono text-sm font-medium">
                <span className="truncate">{n.phone_number}</span>
                <CopyButton value={n.phone_number} label="Copy number" />
              </div>
              <div className="text-muted-foreground truncate text-xs">
                {n.friendly_name || <span className="italic">No friendly name</span>}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "ownership",
        header: "Ownership",
        sortable: true,
        width: "130px",
        sortValue: (n) => n.ownership,
        cell: (n) =>
          n.ownership === "byo" ? (
            <Badge variant="outline">Your Twilio</Badge>
          ) : (
            <Badge variant="secondary">Ajentify</Badge>
          ),
      },
      {
        id: "agent",
        header: "Agent",
        sortable: true,
        minWidth: "180px",
        sortValue: (n) => (n.agent_id ? (agentNameById.get(n.agent_id) ?? n.agent_id) : ""),
        searchValue: (n) => (n.agent_id ? (agentNameById.get(n.agent_id) ?? n.agent_id) : ""),
        cell: (n) =>
          n.agent_id ? (
            <Link
              href={`/app/agents/${n.agent_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-foreground hover:text-primary text-sm underline-offset-2 transition-colors hover:underline"
            >
              {agentNameById.get(n.agent_id) ?? (
                <span className="font-mono text-xs">{n.agent_id.slice(0, 8)}…</span>
              )}
            </Link>
          ) : (
            <span className="text-muted-foreground text-sm italic">Unattached</span>
          ),
      },
      {
        id: "auth_token",
        header: "Auth token",
        sortable: true,
        width: "120px",
        sortValue: (n) => (n.has_twilio_auth_token ? 1 : 0),
        cell: (n) =>
          n.has_twilio_auth_token ? (
            <Badge variant="outline" className="gap-1">
              <KeyRound className="size-3" />
              Stored
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
      {
        id: "created_at",
        header: "Created",
        sortable: true,
        width: "150px",
        sortValue: (n) => n.created_at,
        cell: (n) => (
          <span className="text-muted-foreground tabular-nums" title={formatDateTime(n.created_at)}>
            {formatRelativeTime(n.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        width: "56px",
        align: "right",
        cell: (n) => (
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Actions for ${n.phone_number}`}
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setEditing(n)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                {n.ownership === "byo" && (
                  <DropdownMenuItem onClick={() => openInstructions(n)}>
                    <BookOpen className="size-4" />
                    Setup instructions
                  </DropdownMenuItem>
                )}
                {n.agent_id && (
                  <DropdownMenuItem onClick={() => void detach(n)}>
                    <PhoneOff className="size-4" />
                    Detach agent
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setPendingDelete(n)}>
                  <Trash2 className="size-4" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [agentNameById, detach, openInstructions]
  );

  const connectButton = (
    <Button variant="gradient" onClick={() => setConnectOpen(true)}>
      <Plus className="size-4" />
      Connect your own Twilio number
    </Button>
  );
  const buyButton = (
    <span title="Buying numbers from Ajentify is coming soon">
      <Button variant="outline" disabled>
        <ShoppingCart className="size-4" />
        Buy a number from Ajentify (coming soon)
      </Button>
    </span>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phone numbers"
        subtitle="Twilio numbers that route inbound calls to your realtime agents."
        actions={
          <>
            <Button variant="outline" onClick={() => openInstructions(null)}>
              <BookOpen className="size-4" />
              Setup instructions
            </Button>
            {buyButton}
            {connectButton}
          </>
        }
      />
      {error && <p className="text-destructive text-sm">{error}</p>}

      <DataTable<ApiPhoneNumber>
        data={data}
        columns={columns}
        getRowKey={(n) => n.phone_number_id}
        loading={loading}
        loaded={loaded}
        defaultSort={{ columnId: "created_at", direction: "desc" }}
        searchPlaceholder="Search numbers…"
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        resourceLabel={{ singular: "number", plural: "numbers" }}
        emptyState={
          <EmptyState
            icon={Phone}
            title="No phone numbers yet"
            description="Connect a number you already own in Twilio and point it at a realtime agent. Ajentify answers the call with the agent's voice."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                {buyButton}
                {connectButton}
              </div>
            }
          />
        }
      />

      <PhoneNumberDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onSaved={(n, mode) => {
          if (mode === "created" && n.ownership === "byo") openInstructions(n);
        }}
      />

      <PhoneNumberDialog
        open={!!editing}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        phoneNumber={editing}
      />

      {orgId && (
        <TwilioSetupInstructionsDialog
          open={instructionsOpen}
          onOpenChange={setInstructionsOpen}
          orgId={orgId}
          phoneNumber={instructionsFor}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title="Remove this number?"
        description={
          pendingDelete ? (
            <>
              <span className="text-foreground font-mono font-medium">
                {pendingDelete.phone_number}
              </span>{" "}
              is removed from Ajentify and calls to it will no longer be answered.
              {pendingDelete.ownership === "byo"
                ? " The number stays in your Twilio account — remember to clear its voice webhook there."
                : ""}
            </>
          ) : undefined
        }
        confirmLabel="Remove"
        loadingLabel="Removing"
        loading={deleting}
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}
