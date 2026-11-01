"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getErrorCode, getErrorMessage } from "@/lib/api/errors";
import { schedulesActions } from "@/lib/stores/schedules-store";
import {
  WEEKDAYS,
  browserTimezone,
  describeExpression,
  expressionToPreset,
  formatHHMM,
  isPlausibleExpression,
  parseHHMM,
  presetToExpression,
  timezoneOptions,
  type RateUnit,
  type SchedulePreset,
  type Weekday,
} from "@/lib/schedules/expression";
import { cn } from "@/lib/utils";
import type { ApiSchedule, CreateScheduleParams, UpdateScheduleParams } from "@/types/api";

export interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  /** Names from the agent form; one input each when `usesPromptArgs`. */
  promptArgNames: string[];
  usesPromptArgs: boolean;
  /** When set the dialog edits this schedule; otherwise it creates one. */
  schedule?: ApiSchedule | null;
  onSaved?: (schedule: ApiSchedule) => void;
}

type FrequencyKind = "minutes" | "hours" | "days" | "daily" | "weekly" | "custom";

const FREQUENCY_LABEL: Record<FrequencyKind, string> = {
  minutes: "Every N minutes",
  hours: "Every N hours",
  days: "Every N days",
  daily: "Daily",
  weekly: "Weekly",
  custom: "Custom",
};

const FREQUENCY_KINDS: FrequencyKind[] = ["minutes", "hours", "days", "daily", "weekly", "custom"];

const WEEKDAY_SHORT: Record<Weekday, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

/** Flat form model: every preset's inputs live side by side so switching
 *  kinds doesn't lose what the user typed. */
interface FrequencyForm {
  kind: FrequencyKind;
  rateValue: string;
  time: string; // "HH:MM"
  days: Weekday[];
  custom: string;
}

function frequencyFromPreset(p: SchedulePreset): FrequencyForm {
  const base: FrequencyForm = {
    kind: "daily",
    rateValue: "1",
    time: "09:00",
    days: ["MON"],
    custom: "",
  };
  switch (p.kind) {
    case "rate":
      return { ...base, kind: p.unit, rateValue: String(p.value) };
    case "daily":
      return { ...base, kind: "daily", time: formatHHMM(p.hour, p.minute) };
    case "weekly":
      return {
        ...base,
        kind: "weekly",
        days: p.days.length > 0 ? p.days : ["MON"],
        time: formatHHMM(p.hour, p.minute),
      };
    case "custom":
      return { ...base, kind: "custom", custom: p.expression };
  }
}

/** Build the preset from the form; null when the inputs are incomplete. */
function presetFromForm(f: FrequencyForm): SchedulePreset | null {
  switch (f.kind) {
    case "minutes":
    case "hours":
    case "days": {
      const value = Number(f.rateValue);
      if (!Number.isInteger(value) || value < 1) return null;
      return { kind: "rate", value, unit: f.kind as RateUnit };
    }
    case "daily": {
      const t = parseHHMM(f.time);
      return t ? { kind: "daily", ...t } : null;
    }
    case "weekly": {
      const t = parseHHMM(f.time);
      if (!t || f.days.length === 0) return null;
      return { kind: "weekly", days: f.days, ...t };
    }
    case "custom":
      return f.custom.trim() ? { kind: "custom", expression: f.custom } : null;
  }
}

const KNOWN_ERROR_CODES: Record<string, string> = {
  invalid_schedule_expression: "That schedule expression isn't valid.",
  invalid_timezone: "That timezone isn't recognised.",
  invalid_prompt_args: "The prompt arguments don't match what this agent expects.",
};

function friendlyError(err: unknown, fallback: string): string {
  const code = getErrorCode(err);
  const serverMsg = getErrorMessage(err, "");
  if (code && KNOWN_ERROR_CODES[code]) {
    return serverMsg ? `${KNOWN_ERROR_CODES[code]} ${serverMsg}` : KNOWN_ERROR_CODES[code];
  }
  return serverMsg || fallback;
}

export function ScheduleDialog({
  open,
  onOpenChange,
  agentId,
  promptArgNames,
  usesPromptArgs,
  schedule = null,
  onSaved,
}: ScheduleDialogProps) {
  // Remount the form whenever the target schedule changes or the dialog
  // reopens so edit mode pre-fills and create mode starts clean.
  const [session, setSession] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) setSession((n) => n + 1);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{schedule ? "Edit schedule" : "New schedule"}</DialogTitle>
          <DialogDescription>
            Run this agent automatically on a timer. Each run starts a fresh context with the
            configured prompt arguments.
          </DialogDescription>
        </DialogHeader>
        <ScheduleForm
          key={`${schedule?.schedule_id ?? "new"}:${session}`}
          agentId={agentId}
          promptArgNames={promptArgNames}
          usesPromptArgs={usesPromptArgs}
          schedule={schedule}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onSaved={(s) => {
            setSession((n) => n + 1);
            onOpenChange(false);
            onSaved?.(s);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

interface ScheduleFormProps {
  agentId: string;
  promptArgNames: string[];
  usesPromptArgs: boolean;
  schedule: ApiSchedule | null;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSaved: (schedule: ApiSchedule) => void;
}

function ScheduleForm({
  agentId,
  promptArgNames,
  usesPromptArgs,
  schedule,
  submitting,
  setSubmitting,
  onSaved,
}: ScheduleFormProps) {
  const [name, setName] = useState(schedule?.name ?? "");
  const [freq, setFreq] = useState<FrequencyForm>(() =>
    schedule
      ? frequencyFromPreset(expressionToPreset(schedule.schedule_expression))
      : frequencyFromPreset({ kind: "daily", hour: 9, minute: 0 })
  );
  const [timezone, setTimezone] = useState(() => schedule?.timezone || browserTimezone());
  const [promptArgs, setPromptArgs] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const n of promptArgNames) out[n] = schedule?.prompt_args?.[n] ?? "";
    return out;
  });
  const [message, setMessage] = useState(schedule?.message ?? "");
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);

  const zones = useMemo(() => {
    const list = timezoneOptions();
    // Make sure whatever is selected (e.g. a stored zone) is offered.
    return list.includes(timezone) ? list : [timezone, ...list];
  }, [timezone]);

  const preset = useMemo(() => presetFromForm(freq), [freq]);
  const expression = preset ? presetToExpression(preset) : "";
  const plausible = expression.length > 0 && isPlausibleExpression(expression);
  const canSubmit = name.trim().length > 0 && plausible && !submitting;

  const patch = (p: Partial<FrequencyForm>) => setFreq((f) => ({ ...f, ...p }));

  const toggleDay = (d: Weekday) =>
    patch({
      days: freq.days.includes(d) ? freq.days.filter((x) => x !== d) : [...freq.days, d],
    });

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const args: Record<string, string> | null = usesPromptArgs
      ? Object.fromEntries(promptArgNames.map((n) => [n, promptArgs[n] ?? ""]))
      : null;
    const common = {
      name: name.trim(),
      schedule_expression: expression,
      timezone,
      enabled,
      prompt_args: args,
      message: message.trim() ? message.trim() : null,
    };
    try {
      let saved: ApiSchedule;
      if (schedule) {
        const body: UpdateScheduleParams = common;
        saved = await schedulesActions.update(schedule.schedule_id, body);
        toast.success(`Updated ${saved.name}`);
      } else {
        const body: CreateScheduleParams = { agent_id: agentId, ...common };
        saved = await schedulesActions.create(body);
        toast.success(`Created ${saved.name}`);
      }
      setSubmitting(false);
      onSaved(saved);
    } catch (err) {
      setError(friendlyError(err, schedule ? "Failed to update schedule" : "Failed to create schedule"));
      setSubmitting(false);
    }
  };

  const isRate = freq.kind === "minutes" || freq.kind === "hours" || freq.kind === "days";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="schedule-name">Name</Label>
        <Input
          id="schedule-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Morning digest"
          autoFocus
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="schedule-frequency">Frequency</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={freq.kind}
            onValueChange={(v) => {
              if (typeof v === "string") patch({ kind: v as FrequencyKind });
            }}
          >
            <SelectTrigger id="schedule-frequency" className="w-full sm:w-48" aria-label="Frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {FREQUENCY_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isRate && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Every</span>
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                aria-label="Interval"
                className="w-24"
                value={freq.rateValue}
                onChange={(e) => patch({ rateValue: e.target.value })}
              />
              <span className="text-muted-foreground text-sm">{freq.kind}</span>
            </div>
          )}

          {(freq.kind === "daily" || freq.kind === "weekly") && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">at</span>
              <Input
                type="time"
                aria-label="Time"
                className="w-32"
                value={freq.time}
                onChange={(e) => patch({ time: e.target.value })}
              />
            </div>
          )}
        </div>

        {freq.kind === "weekly" && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days of the week">
            {WEEKDAYS.map((d) => {
              const on = freq.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {WEEKDAY_SHORT[d]}
                </button>
              );
            })}
          </div>
        )}

        {freq.kind === "custom" && (
          <>
            <Input
              aria-label="Schedule expression"
              value={freq.custom}
              onChange={(e) => patch({ custom: e.target.value })}
              placeholder="cron(0 9 ? * MON-FRI *)"
              className="font-mono"
            />
            <p className="text-muted-foreground text-xs">
              EventBridge syntax, e.g. cron(0 9 ? * MON-FRI *)
            </p>
          </>
        )}

        <p className="text-muted-foreground text-xs" data-testid="schedule-preview">
          {plausible
            ? describeExpression(expression, timezone)
            : freq.kind === "weekly" && freq.days.length === 0
              ? "Pick at least one day."
              : "Enter a valid frequency."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="schedule-timezone">Timezone</Label>
        <Select
          value={timezone}
          onValueChange={(v) => {
            if (typeof v === "string") setTimezone(v);
          }}
        >
          <SelectTrigger id="schedule-timezone" className="w-full" aria-label="Timezone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {zones.map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {usesPromptArgs && promptArgNames.length > 0 && (
        <div className="space-y-2">
          <Label>Prompt arguments</Label>
          <div className="space-y-2">
            {promptArgNames.map((n) => (
              <div key={n} className="space-y-1">
                <Label htmlFor={`schedule-arg-${n}`} className="text-muted-foreground text-xs">
                  {n}
                </Label>
                <Input
                  id={`schedule-arg-${n}`}
                  value={promptArgs[n] ?? ""}
                  onChange={(e) => setPromptArgs((a) => ({ ...a, [n]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="schedule-message">Kick-off message</Label>
        <Textarea
          id="schedule-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional first message sent to the agent on each run."
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="schedule-enabled">Enabled</Label>
          <p className="text-muted-foreground text-xs">Disabled schedules never fire.</p>
        </div>
        <Switch id="schedule-enabled" checked={enabled} onCheckedChange={(v) => setEnabled(!!v)} />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <DialogFooter className="mt-4">
        <DialogClose
          render={
            <Button type="button" variant="ghost" size="md" disabled={submitting}>
              Cancel
            </Button>
          }
        />
        <Button type="submit" variant="gradient" size="md" disabled={!canSubmit}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting
            ? schedule
              ? "Saving…"
              : "Creating…"
            : schedule
              ? "Save"
              : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
