"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDot,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ApiJob,
  DeletionOrgProgress,
  DeletionPhase,
  DeletionProgress as DeletionProgressData,
  DeletionResourceProgress,
} from "@/types/api";

export type DeletionKind = DeletionProgressData["kind"];

export interface DeletionProgressProps {
  kind: DeletionKind;
  /** Org name or account email, for the header. */
  label?: string;
  job: ApiJob | null;
  /** Polling/fetch error (job may still be running). */
  pollError?: string | null;
}

// Cascade order; unknown keys are appended alphabetically.
const RESOURCE_ORDER: string[] = [
  "api_keys",
  "contexts",
  "chat_pages",
  "integrations",
  "agents",
  "tools",
  "structured_response_endpoints",
  "mcp_connections",
  "data_windows",
  "json_documents",
  "parameter_definitions",
  "stages",
  "clients",
  "jobs",
  "tombstone",
  "memberships",
  "organization",
  "resweep",
];

const RESOURCE_LABELS: Record<string, string> = {
  api_keys: "API keys",
  contexts: "Contexts (chats)",
  chat_pages: "Chat pages",
  integrations: "Integrations",
  agents: "Agents",
  tools: "Tools",
  structured_response_endpoints: "Structured response endpoints",
  mcp_connections: "MCP connections",
  data_windows: "Data windows",
  json_documents: "JSON documents",
  parameter_definitions: "Parameter definitions",
  stages: "Stages",
  clients: "Clients",
  jobs: "Jobs",
  tombstone: "Deletion marker",
  memberships: "Memberships",
  organization: "Organization record",
  resweep: "Final sweep",
};

export function humanizeResourceKey(key: string): string {
  if (RESOURCE_LABELS[key]) return RESOURCE_LABELS[key];
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function sortResourceKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ia = RESOURCE_ORDER.indexOf(a);
    const ib = RESOURCE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

interface Step {
  id: string;
  label: string;
  /** Phases that mean "this step is currently running". */
  phases: DeletionPhase[];
}

const ORG_STEPS: Step[] = [
  { id: "cancel", label: "Cancel Stripe subscription", phases: ["cancel_subscription"] },
  { id: "resources", label: "Delete resources", phases: ["delete_resources"] },
  { id: "remove", label: "Remove organization", phases: ["delete_org"] },
];

const USER_STEPS: Step[] = [
  {
    id: "orgs",
    label: "Leave or delete organizations",
    // A sole-member org runs the org cascade inline during account deletion.
    phases: ["leave_orgs", "cancel_subscription", "delete_resources", "delete_org"],
  },
  { id: "user", label: "Delete account", phases: ["delete_user"] },
];

type StepState = "pending" | "current" | "done" | "error";

export function computeStepStates(
  kind: DeletionKind,
  job: ApiJob | null
): Array<Step & { state: StepState }> {
  const steps = kind === "organization" ? ORG_STEPS : USER_STEPS;
  const phase = job?.data?.progress?.phase;
  const status = job?.status;

  if (status === "completed" || phase === "done") {
    return steps.map((s) => ({ ...s, state: "done" }));
  }

  let currentIdx = phase ? steps.findIndex((s) => s.phases.includes(phase)) : -1;
  // queued / no progress yet → first step is "current" once the job is running.
  if (currentIdx === -1) currentIdx = status === "in_progress" ? 0 : -1;

  return steps.map((s, i) => {
    let state: StepState = "pending";
    if (i < currentIdx) state = "done";
    else if (i === currentIdx) state = status === "error" ? "error" : "current";
    return { ...s, state };
  });
}

/** Σdeleted / Σtotal over resources with a known total. */
export function computeOverall(
  resources: Record<string, DeletionResourceProgress> | undefined
): { deleted: number; total: number | null } {
  if (!resources) return { deleted: 0, total: null };
  let deleted = 0;
  let total = 0;
  let known = false;
  for (const r of Object.values(resources)) {
    deleted += r.deleted ?? 0;
    const t = r.total ?? (r.status === "done" ? r.deleted : null);
    if (t !== null && t !== undefined) {
      total += t;
      known = true;
    }
  }
  return { deleted, total: known ? total : null };
}

export function DeletionProgress({
  kind,
  label,
  job,
  pollError,
}: DeletionProgressProps) {
  const progress = job?.data?.progress;
  const status = job?.status;
  const steps = useMemo(() => computeStepStates(kind, job), [kind, job]);
  const resourceKeys = useMemo(
    () => sortResourceKeys(Object.keys(progress?.resources ?? {})),
    [progress?.resources]
  );
  const overall = useMemo(
    () => computeOverall(progress?.resources),
    [progress?.resources]
  );

  const noun = kind === "organization" ? "organization" : "account";
  const subject = label ? <span className="font-medium">{label}</span> : noun;

  return (
    <div className="space-y-4">
      <Header status={status} subject={subject} job={job} />

      {pollError && status !== "error" && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <AlertTriangle className="size-3.5" />
          {pollError} — retrying…
        </p>
      )}

      <ol className="space-y-1.5">
        {steps.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-sm">
            <StepIcon state={s.state} />
            <span
              className={cn(
                s.state === "pending" && "text-muted-foreground",
                s.state === "error" && "text-destructive"
              )}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      {progress?.orgs && progress.orgs.length > 0 && (
        <OrgList orgs={progress.orgs} />
      )}

      {resourceKeys.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground uppercase tracking-wide">
              Resources
            </span>
            <span className="text-muted-foreground tabular-nums">
              {overall.total === null
                ? `${overall.deleted} deleted`
                : `${overall.deleted} / ${overall.total}`}
            </span>
          </div>
          <Bar
            value={overall.deleted}
            total={overall.total}
            indeterminate={overall.total === null && status === "in_progress"}
            className="h-2"
          />
          <ul className="space-y-1.5">
            {resourceKeys.map((key) => (
              <ResourceRow
                key={key}
                label={humanizeResourceKey(key)}
                r={progress!.resources[key]}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Header({
  status,
  subject,
  job,
}: {
  status: ApiJob["status"] | undefined;
  subject: React.ReactNode;
  job: ApiJob | null;
}) {
  if (status === "completed") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="size-4 text-emerald-500" />
        <span>Deleted {subject}.</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="space-y-1">
        <div className="text-destructive flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="size-4" />
          Deletion failed
        </div>
        <p className="text-destructive text-sm">
          {job?.error?.message ?? job?.message ?? "Something went wrong."}
          {job?.error?.code && (
            <span className="text-muted-foreground"> ({job.error.code})</span>
          )}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <Loader2 className="size-4 animate-spin" />
      <span>
        {status === "queued" || !status ? "Starting deletion of " : "Deleting "}
        {subject}…
      </span>
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (state === "current") return <Loader2 className="text-primary size-4 animate-spin" />;
  if (state === "error") return <AlertTriangle className="text-destructive size-4" />;
  return <Circle className="text-muted-foreground/50 size-4" />;
}

function OrgList({ orgs }: { orgs: DeletionOrgProgress[] }) {
  return (
    <ul className="divide-border divide-y rounded-md border">
      {orgs.map((o) => (
        <li
          key={o.org_id}
          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
        >
          <div className="flex min-w-0 items-center gap-2">
            <OrgStatusIcon status={o.status} />
            <span className="truncate" title={o.name}>
              {o.name}
            </span>
          </div>
          <span
            className={cn(
              "shrink-0 text-xs",
              o.action === "delete" ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {o.action === "delete" ? "Delete" : "Leave"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function OrgStatusIcon({ status }: { status: DeletionOrgProgress["status"] }) {
  if (status === "done") return <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />;
  if (status === "in_progress") return <Loader2 className="text-primary size-4 shrink-0 animate-spin" />;
  if (status === "error") return <AlertTriangle className="text-destructive size-4 shrink-0" />;
  return <CircleDot className="text-muted-foreground/50 size-4 shrink-0" />;
}

function ResourceRow({ label, r }: { label: string; r: DeletionResourceProgress }) {
  const total = r.total ?? (r.status === "done" ? r.deleted : null);
  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={cn(r.status === "pending" && "text-muted-foreground")}>
          {label}
        </span>
        <span className="text-muted-foreground flex items-center gap-1.5 tabular-nums">
          {total === null ? `${r.deleted}` : `${r.deleted} / ${total}`}
          {r.status === "done" ? (
            <CheckCircle2 className="size-3 text-emerald-500" />
          ) : r.status === "in_progress" ? (
            <Loader2 className="text-primary size-3 animate-spin" />
          ) : (
            <Circle className="text-muted-foreground/50 size-3" />
          )}
        </span>
      </div>
      <Bar
        value={r.deleted}
        total={total}
        indeterminate={total === null && r.status === "in_progress"}
        done={r.status === "done"}
      />
    </li>
  );
}

function Bar({
  value,
  total,
  indeterminate,
  done,
  className,
}: {
  value: number;
  total: number | null;
  indeterminate?: boolean;
  done?: boolean;
  className?: string;
}) {
  const pct =
    done ? 100 : total && total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div
      className={cn("bg-muted h-1.5 w-full overflow-hidden rounded-full", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : pct}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          done ? "bg-emerald-500" : "bg-primary",
          indeterminate && "animate-pulse"
        )}
        style={{ width: indeterminate ? "100%" : `${pct}%` }}
      />
    </div>
  );
}
