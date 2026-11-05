"use client";

import { useEffect, useMemo, useState } from "react";
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
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getErrorCode, getErrorMessage } from "@/lib/api/errors";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { useAgentsStore } from "@/lib/stores/agents-store";
import { useModelsStore } from "@/lib/stores/models-store";
import { phoneNumbersActions } from "@/lib/stores/phone-numbers-store";
import { isE164, normalizePhoneInput } from "@/lib/telephony/e164";
import { cn } from "@/lib/utils";
import type {
  ApiAgent,
  ApiPhoneNumber,
  CreatePhoneNumberParams,
  UpdatePhoneNumberParams,
} from "@/types/api";

export interface PhoneNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set the dialog edits this number; otherwise it connects a new one. */
  phoneNumber?: ApiPhoneNumber | null;
  /** Pre-select an agent when connecting (e.g. from the agent builder). */
  defaultAgentId?: string | null;
  onSaved?: (phoneNumber: ApiPhoneNumber, mode: "created" | "updated") => void;
}

const NO_AGENT = "__none__";

const KNOWN_ERROR_CODES: Record<string, string> = {
  phone_number_exists: "That number is already registered.",
  invalid_phone_number: "That number isn't valid E.164.",
  agent_not_realtime: "Only agents on a realtime model can answer calls.",
};

function friendlyError(err: unknown, fallback: string): string {
  const code = getErrorCode(err);
  const serverMsg = getErrorMessage(err, "");
  if (code && KNOWN_ERROR_CODES[code]) {
    return serverMsg ? `${KNOWN_ERROR_CODES[code]} ${serverMsg}` : KNOWN_ERROR_CODES[code];
  }
  const status = (err as { status?: number } | null)?.status;
  if (status === 409) return serverMsg || "That number is already registered.";
  return serverMsg || fallback;
}

/** Agents whose model is realtime — the only ones that can answer a call. */
export function realtimeAgents(
  agents: ApiAgent[],
  models: { model: string; is_realtime?: boolean }[]
): ApiAgent[] {
  const realtime = new Set(models.filter((m) => m.is_realtime).map((m) => m.model));
  return agents.filter((a) => !!a.model_id && realtime.has(a.model_id));
}

/**
 * "Connect your own Twilio number" (create) / "Edit number" (update) dialog.
 * Create posts `/phone-number`; edit posts `/phone-number/{id}` with the
 * friendly name and an optional set/clear of the Twilio auth token.
 */
export function PhoneNumberDialog({
  open,
  onOpenChange,
  phoneNumber = null,
  defaultAgentId = null,
  onSaved,
}: PhoneNumberDialogProps) {
  const [session, setSession] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) setSession((n) => n + 1);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          isMobile
            ? "fixed inset-0 top-0 left-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 ring-0 data-open:zoom-in-100 data-closed:zoom-out-100"
            : "flex max-h-[min(85vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        }
      >
        <DialogHeader
          className={cn(
            "border-border shrink-0 border-b px-5 py-4",
            isMobile && "px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
          )}
        >
          <DialogTitle>
            {phoneNumber ? "Edit number" : "Connect your own Twilio number"}
          </DialogTitle>
          <DialogDescription>
            {phoneNumber
              ? "Change the label or the Twilio auth token Ajentify uses to verify this number's requests."
              : "Register a number you already own in Twilio. After saving you'll get the webhook URL and credentials to paste into the Twilio Console."}
          </DialogDescription>
        </DialogHeader>
        <PhoneNumberForm
          key={`${phoneNumber?.phone_number_id ?? "new"}:${session}`}
          phoneNumber={phoneNumber}
          defaultAgentId={defaultAgentId}
          isMobile={isMobile}
          submitting={submitting}
          setSubmitting={setSubmitting}
          onSaved={(n, mode) => {
            setSession((s) => s + 1);
            onOpenChange(false);
            onSaved?.(n, mode);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

interface PhoneNumberFormProps {
  phoneNumber: ApiPhoneNumber | null;
  defaultAgentId: string | null;
  isMobile: boolean;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSaved: (phoneNumber: ApiPhoneNumber, mode: "created" | "updated") => void;
}

function PhoneNumberForm({
  phoneNumber,
  defaultAgentId,
  isMobile,
  submitting,
  setSubmitting,
  onSaved,
}: PhoneNumberFormProps) {
  const editing = phoneNumber !== null;
  const agents = useAgentsStore((s) => s.data);
  const ensureAgents = useAgentsStore((s) => s.ensureLoaded);
  const models = useModelsStore((s) => s.data);

  useEffect(() => {
    if (!editing) ensureAgents().catch(() => {});
  }, [editing, ensureAgents]);

  const candidates = useMemo(() => realtimeAgents(agents, models), [agents, models]);

  const [number, setNumber] = useState("");
  const [friendlyName, setFriendlyName] = useState(phoneNumber?.friendly_name ?? "");
  const [authToken, setAuthToken] = useState("");
  const [clearToken, setClearToken] = useState(false);
  const [agentId, setAgentId] = useState<string>(defaultAgentId ?? NO_AGENT);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizePhoneInput(number);
  const numberTouched = number.trim().length > 0;
  const numberValid = isE164(normalized);
  const numberHint =
    numberTouched && !numberValid
      ? "Use E.164 format: a + followed by the country code and number, e.g. +61481613228."
      : null;

  const canSubmit = !submitting && (editing || numberValid);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const name = friendlyName.trim() ? friendlyName.trim() : null;
    const token = authToken.trim();
    try {
      if (editing) {
        const body: UpdatePhoneNumberParams = { friendly_name: name };
        if (clearToken) body.twilio_auth_token = null;
        else if (token) body.twilio_auth_token = token;
        const saved = await phoneNumbersActions.update(phoneNumber.phone_number_id, body);
        toast.success("Number updated");
        setSubmitting(false);
        onSaved(saved, "updated");
      } else {
        const body: CreatePhoneNumberParams = {
          phone_number: normalized,
          friendly_name: name,
        };
        if (token) body.twilio_auth_token = token;
        if (agentId !== NO_AGENT) body.agent_id = agentId;
        const saved = await phoneNumbersActions.create(body);
        toast.success(`Connected ${saved.phone_number}`);
        setSubmitting(false);
        onSaved(saved, "created");
      }
    } catch (err) {
      setError(friendlyError(err, editing ? "Failed to update number" : "Failed to connect number"));
      setSubmitting(false);
    }
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <div
        className={cn(
          "min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4",
          isMobile && "overscroll-contain px-4 py-3"
        )}
      >
        {editing ? (
          <div className="space-y-1">
            <Label>Phone number</Label>
            <p className="text-foreground font-mono text-sm">{phoneNumber.phone_number}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone number</Label>
            <Input
              id="phone-number"
              inputMode="tel"
              autoComplete="off"
              placeholder="+61481613228"
              className="font-mono"
              value={number}
              aria-invalid={numberTouched && !numberValid ? true : undefined}
              onChange={(e) => setNumber(e.target.value)}
            />
            <p className={cn("text-xs", numberHint ? "text-destructive" : "text-muted-foreground")}>
              {numberHint ?? "E.164 format, exactly as it appears in your Twilio Console."}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="phone-friendly-name">Friendly name</Label>
          <Input
            id="phone-friendly-name"
            value={friendlyName}
            onChange={(e) => setFriendlyName(e.target.value)}
            placeholder="Front desk"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone-auth-token">Twilio auth token</Label>
          <PasswordInput
            id="phone-auth-token"
            autoComplete="off"
            value={authToken}
            disabled={clearToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder={
              editing && phoneNumber.has_twilio_auth_token
                ? "Stored — leave blank to keep"
                : "Optional"
            }
          />
          <p className="text-muted-foreground text-xs">
            Optional. Lets Ajentify verify Twilio&apos;s request signatures
            (X-Twilio-Signature) on top of the HTTP Basic credentials. Found in the
            Twilio Console under Account → API keys &amp; tokens.
          </p>
          {editing && phoneNumber.has_twilio_auth_token && (
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="phone-clear-token" className="text-muted-foreground text-xs font-normal">
                Clear the stored token
              </Label>
              <Switch
                id="phone-clear-token"
                checked={clearToken}
                onCheckedChange={(v) => setClearToken(!!v)}
              />
            </div>
          )}
        </div>

        {!editing && (
          <div className="space-y-2">
            <Label htmlFor="phone-agent">Answering agent</Label>
            <Select
              value={agentId}
              onValueChange={(v) => {
                if (typeof v === "string") setAgentId(v);
              }}
            >
              <SelectTrigger id="phone-agent" className="w-full" aria-label="Answering agent">
                <SelectValue>
                  {(value) =>
                    value === NO_AGENT || typeof value !== "string"
                      ? "No agent yet"
                      : (candidates.find((a) => a.agent_id === value)?.agent_name ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_AGENT}>No agent yet</SelectItem>
                {candidates.map((a) => (
                  <SelectItem key={a.agent_id} value={a.agent_id}>
                    {a.agent_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Only agents on a realtime model are listed. You can attach one later from
              the agent builder.
            </p>
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      <DialogFooter
        className={cn(
          "mx-0 mb-0 shrink-0 rounded-b-xl",
          isMobile && "rounded-none pb-[max(1rem,env(safe-area-inset-bottom))]"
        )}
      >
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
            ? editing
              ? "Saving…"
              : "Connecting…"
            : editing
              ? "Save"
              : "Connect"}
        </Button>
      </DialogFooter>
    </form>
  );
}
