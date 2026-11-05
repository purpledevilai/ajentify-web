"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/primitives/button";
import { CopyButton } from "@/components/blocks/copy-button";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api/errors";
import { telephonySecretApi } from "@/lib/api/phone-numbers";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import {
  SECRET_PENDING,
  twilioSetupSteps,
  type SetupField,
} from "@/lib/telephony/instructions";
import { cn } from "@/lib/utils";
import type { ApiPhoneNumber, ApiTelephonySecret } from "@/types/api";

const MASK = "••••••••••••••••";

export interface TwilioSetupInstructionsProps {
  orgId: string;
  /** When set, the intro names the number being configured. */
  phoneNumber?: ApiPhoneNumber | null;
}

/**
 * Step list for pointing a customer-owned Twilio number at Ajentify: webhook
 * URL + method, HTTP Basic credentials (org id / telephony secret, fetched
 * here with reveal + copy + rotate), the legacy credentials-in-URL form, the
 * optional auth-token hint and a final "call it" step.
 */
export function TwilioSetupInstructions({ orgId, phoneNumber = null }: TwilioSetupInstructionsProps) {
  // Keyed by org so switching orgs flips back to "loading" without a
  // setState in the effect body.
  const [loadedSecret, setLoadedSecret] = useState<ApiTelephonySecret | null>(null);
  const [loadErr, setLoadErr] = useState<{ orgId: string; message: string } | null>(null);
  const secret = loadedSecret && loadedSecret.org_id === orgId ? loadedSecret : null;
  const error = loadErr && loadErr.orgId === orgId ? loadErr.message : null;
  const [rotateOpen, setRotateOpen] = useState(false);
  const [rotating, setRotating] = useState(false);
  // Bumped by Retry so the effect below re-runs the fetch.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    telephonySecretApi
      .get(orgId)
      .then((row) => {
        if (cancelled) return;
        setLoadedSecret(row);
        setLoadErr(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadErr({ orgId, message: getErrorMessage(err, "Failed to load the telephony secret") });
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, attempt]);

  const rotate = async () => {
    setRotating(true);
    try {
      setLoadedSecret(await telephonySecretApi.rotate(orgId));
      toast.success("Telephony secret rotated", {
        description: "Update the password on every connected Twilio number.",
      });
      setRotateOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to rotate the telephony secret"));
    } finally {
      setRotating(false);
    }
  };

  const steps = twilioSetupSteps({ orgId, secret: secret?.secret ?? null });
  const loadingSecret = secret === null && !error;
  const retry = () => {
    setLoadErr(null);
    setAttempt((n) => n + 1);
  };

  return (
    <div className="space-y-5" data-testid="twilio-setup-instructions">
      <p className="text-muted-foreground text-sm">
        {phoneNumber ? (
          <>
            Configure{" "}
            <span className="text-foreground font-mono font-medium">{phoneNumber.phone_number}</span>{" "}
            in your Twilio account so calls reach Ajentify.
          </>
        ) : (
          "Configure your Twilio number so calls reach Ajentify."
        )}
      </p>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm">
          <span className="text-destructive">{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3" data-testid={`setup-step-${i + 1}`}>
            <span className="bg-muted text-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-foreground text-sm font-medium">{step.title}</h3>
              <p className="text-muted-foreground text-xs">{step.description}</p>
              {step.fields.length > 0 && (
                <div className="space-y-2">
                  {step.fields.map((f) => (
                    <SetupFieldRow
                      key={f.label}
                      field={f}
                      pending={loadingSecret && f.value === SECRET_PENDING}
                      trailing={
                        f.label.startsWith("Password") ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground h-7 px-2"
                            disabled={!secret}
                            onClick={() => setRotateOpen(true)}
                          >
                            <RefreshCw className="size-3.5" />
                            Rotate
                          </Button>
                        ) : null
                      }
                    />
                  ))}
                </div>
              )}
              {step.note && <p className="text-muted-foreground text-xs">{step.note}</p>}
            </div>
          </li>
        ))}
      </ol>

      <ConfirmDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        title="Rotate the telephony secret?"
        description="A new secret is issued and the current one stops working immediately. Every Twilio number you have connected must be updated with the new password or its calls will be rejected."
        confirmLabel="Rotate"
        loadingLabel="Rotating"
        loading={rotating}
        onConfirm={rotate}
      />
    </div>
  );
}

interface SetupFieldRowProps {
  field: SetupField;
  pending: boolean;
  trailing?: React.ReactNode;
}

function SetupFieldRow({ field, pending, trailing }: SetupFieldRowProps) {
  const [revealed, setRevealed] = useState(false);
  const masked = !!field.secret && !revealed;
  const display = masked ? MASK : field.value;

  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs">{field.label}</div>
      <div className="border-border bg-muted/40 flex min-w-0 items-center gap-1 rounded-md border px-2 py-1.5">
        {pending ? (
          <Skeleton className="h-4 flex-1" data-testid="setup-field-pending" />
        ) : (
          <span
            className={cn(
              "text-foreground min-w-0 flex-1 truncate text-sm",
              field.mono && "font-mono text-xs"
            )}
            title={masked ? undefined : field.value}
            data-testid={`setup-field-${field.label}`}
          >
            {display}
          </span>
        )}
        {field.secret && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? `Hide ${field.label}` : `Reveal ${field.label}`}
            aria-pressed={revealed}
            disabled={pending}
            className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-50"
          >
            {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        )}
        {!pending && <CopyButton value={field.value} label={`Copy ${field.label}`} />}
        {trailing}
      </div>
    </div>
  );
}

export interface TwilioSetupInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  phoneNumber?: ApiPhoneNumber | null;
}

/** The same steps inside a viewport-bounded dialog (see ScheduleDialog). */
export function TwilioSetupInstructionsDialog({
  open,
  onOpenChange,
  orgId,
  phoneNumber = null,
}: TwilioSetupInstructionsDialogProps) {
  const isMobile = useIsMobile();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isMobile
            ? "fixed inset-0 top-0 left-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 ring-0 data-open:zoom-in-100 data-closed:zoom-out-100"
            : "flex max-h-[min(85vh,760px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        }
      >
        <DialogHeader
          className={cn(
            "border-border shrink-0 border-b px-5 py-4",
            isMobile && "px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
          )}
        >
          <DialogTitle>Twilio setup instructions</DialogTitle>
          <DialogDescription>
            Four steps in the Twilio Console. You can come back to these from the
            number&apos;s menu at any time.
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-5 py-4",
            isMobile && "overscroll-contain px-4 py-3"
          )}
        >
          {open && <TwilioSetupInstructions orgId={orgId} phoneNumber={phoneNumber} />}
        </div>
        <DialogFooter
          className={cn(
            "mx-0 mb-0 shrink-0 rounded-b-xl",
            isMobile && "rounded-none pb-[max(1rem,env(safe-area-inset-bottom))]"
          )}
        >
          <DialogClose
            render={
              <Button type="button" variant="solid" size="md">
                Done
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
