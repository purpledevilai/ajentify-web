"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { BuilderSection } from "@/components/blocks/builder-section";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import { ScheduleDialog } from "@/components/blocks/schedule-dialog";
import { getErrorMessage } from "@/lib/api/errors";
import { useJobPoll } from "@/lib/hooks/use-job-poll";
import { describeExpression } from "@/lib/schedules/expression";
import {
  schedulesActions,
  selectAgentSchedules,
  useSchedulesStore,
} from "@/lib/stores/schedules-store";
import { formatRelativeTime } from "@/lib/utils/date";
import type { ApiSchedule, RunScheduleResult } from "@/types/api";

export interface AgentSchedulesSectionProps {
  agentId: string;
  /** From the builder form so the dialog knows which prompt args to ask for. */
  promptArgNames: string[];
  usesPromptArgs: boolean;
}

/**
 * "Schedules" section of the agent builder: timer-driven runs of this agent.
 * Schedules are their own resource (not part of the agent form), so this
 * section reads/writes the schedules store directly rather than via the
 * builder's dirty/save flow.
 */
export function AgentSchedulesSection({
  agentId,
  promptArgNames,
  usesPromptArgs,
}: AgentSchedulesSectionProps) {
  const slice = useSchedulesStore(selectAgentSchedules(agentId));
  const ensureLoaded = useSchedulesStore((s) => s.ensureLoaded);

  useEffect(() => {
    ensureLoaded(agentId).catch(() => {
      // Error is recorded on the slice and rendered below.
    });
  }, [agentId, ensureLoaded]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiSchedule | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (s: ApiSchedule) => {
    setEditing(s);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await schedulesActions.remove(pendingDelete.schedule_id);
      toast.success(`Deleted ${pendingDelete.name}`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete schedule"));
    } finally {
      setDeleting(false);
    }
  };

  const showSkeleton = !slice.loaded && slice.loading;

  return (
    <BuilderSection
      title="Schedules"
      description="Run this agent automatically on a timer. Each run starts a fresh context with the configured prompt arguments."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={openCreate}>
          <CalendarClock className="size-4" />
          New schedule
        </Button>
      }
    >
      {showSkeleton ? (
        <div className="space-y-2" data-testid="schedules-loading">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : slice.error && !slice.loaded ? (
        <p className="text-destructive text-sm">{slice.error}</p>
      ) : slice.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No schedules yet.{" "}
          <button
            type="button"
            onClick={openCreate}
            className="text-foreground underline underline-offset-2 hover:text-foreground/80"
          >
            <Plus className="mr-0.5 inline size-3 align-[-1px]" />
            Add one
          </button>{" "}
          to run this agent on a timer.
        </p>
      ) : (
        <div className="min-w-0 space-y-2">
          {slice.data.map((s) => (
            <ScheduleRow
              key={s.schedule_id}
              schedule={s}
              onEdit={() => openEdit(s)}
              onDelete={() => setPendingDelete(s)}
            />
          ))}
        </div>
      )}

      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setEditing(null);
        }}
        agentId={agentId}
        promptArgNames={promptArgNames}
        usesPromptArgs={usesPromptArgs}
        schedule={editing}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title={`Delete ${pendingDelete?.name ?? "schedule"}?`}
        description="The schedule stops firing immediately. Contexts it already created are kept."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </BuilderSection>
  );
}

interface ScheduleRowProps {
  schedule: ApiSchedule;
  onEdit: () => void;
  onDelete: () => void;
}

function ScheduleRow({ schedule, onEdit, onDelete }: ScheduleRowProps) {
  const router = useRouter();
  const upsert = useSchedulesStore((s) => s.upsert);
  const [toggling, setToggling] = useState(false);
  const [starting, setStarting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const { job, isPolling, error: pollError } = useJobPoll(jobId);
  const handledRef = useRef<string | null>(null);

  const running = starting || jobId !== null;

  // Resolve the "Run now" job once it reaches a terminal status (or polling
  // gives up on a 4xx); toast and clear the row's job id.
  useEffect(() => {
    if (!jobId) return;
    const status = job?.status;
    const terminal = status === "completed" || status === "error";
    const stalled = !isPolling && !terminal;
    if (!terminal && !stalled) return;
    if (handledRef.current === jobId) return;
    handledRef.current = jobId;

    if (status === "completed") {
      const result = (job?.result ?? null) as RunScheduleResult | null;
      if (result?.schedule) upsert(result.schedule);
      const contextId = result?.context_id ?? null;
      toast.success(`Ran ${schedule.name}`, {
        description: contextId ? "A new context was created." : undefined,
        action: contextId
          ? {
              label: "Open context",
              onClick: () => router.push(`/app/contexts/${contextId}`),
            }
          : undefined,
      });
    } else if (status === "error") {
      toast.error(`${schedule.name} failed`, {
        description: job?.error?.message ?? job?.message ?? "The run reported an error.",
      });
    } else {
      toast.error(`Lost track of the run for ${schedule.name}`, {
        description: pollError ?? undefined,
      });
    }
    setJobId(null);
  }, [job, jobId, isPolling, pollError, router, schedule.name, upsert]);

  const setEnabled = async (enabled: boolean) => {
    setToggling(true);
    try {
      await schedulesActions.setEnabled(schedule.schedule_id, enabled);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update schedule"));
    } finally {
      setToggling(false);
    }
  };

  const runNow = async () => {
    if (running) return;
    setStarting(true);
    try {
      const accepted = await schedulesActions.run(schedule.schedule_id);
      handledRef.current = null;
      setJobId(accepted.job_id);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to start run"));
    } finally {
      setStarting(false);
    }
  };

  const lastRun = schedule.last_run_at ? formatRelativeTime(schedule.last_run_at) : null;

  return (
    <div
      className="border-border flex w-full min-w-0 items-start gap-3 rounded-md border p-3"
      data-testid={`schedule-row-${schedule.schedule_id}`}
    >
      <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
        {running ? (
          <Loader2 className="size-4 animate-spin" aria-label="Running" />
        ) : (
          <CalendarClock className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-foreground text-sm font-medium break-words">{schedule.name}</span>
          {!schedule.enabled && <Badge variant="outline">Paused</Badge>}
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {describeExpression(schedule.schedule_expression, schedule.timezone)}
        </p>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
          {lastRun ? (
            schedule.last_context_id ? (
              <Link
                href={`/app/contexts/${schedule.last_context_id}`}
                className="hover:text-primary underline underline-offset-2 transition-colors"
              >
                Last run {lastRun}
              </Link>
            ) : (
              <span>Last run {lastRun}</span>
            )
          ) : (
            <span>Never run</span>
          )}
          {schedule.last_status === "error" && (
            <Badge
              variant="destructive"
              className="max-w-full truncate"
              title={schedule.last_error ?? undefined}
            >
              {schedule.last_error || "Last run failed"}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Switch
          checked={schedule.enabled}
          disabled={toggling}
          aria-label={`Enable ${schedule.name}`}
          className="mt-0.5"
          onCheckedChange={(v) => void setEnabled(!!v)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Actions for ${schedule.name}`}
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem disabled={running} onClick={() => void runNow()}>
              <Play className="size-4" />
              Run now
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
