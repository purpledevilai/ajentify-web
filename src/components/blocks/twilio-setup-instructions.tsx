"use client";

import { Button } from "@/components/primitives/button";
import { CopyButton } from "@/components/blocks/copy-button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { twilioSetupSteps, type SetupField } from "@/lib/telephony/instructions";
import { cn } from "@/lib/utils";
import type { ApiPhoneNumber } from "@/types/api";

export interface TwilioSetupInstructionsProps {
  /** When set, the intro names the number being configured. */
  phoneNumber?: ApiPhoneNumber | null;
  /** Opens the number's edit dialog so the user can replace the auth token. */
  onReplaceToken?: (phoneNumber: ApiPhoneNumber) => void;
}

/**
 * Step list for pointing a customer-owned Twilio number at Ajentify: the
 * auth token is stored at connect time, the voice webhook is a plain URL
 * (Twilio signs every request; Ajentify verifies with the token) and a
 * final "call it" step.
 */
export function TwilioSetupInstructions({
  phoneNumber = null,
  onReplaceToken,
}: TwilioSetupInstructionsProps) {
  const steps = twilioSetupSteps();

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

      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3" data-testid={`setup-step-${i + 1}`}>
            <span className="bg-muted text-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-foreground text-sm font-medium">{step.title}</h3>
              <p className="text-muted-foreground text-xs">{step.description}</p>
              {i === 0 && phoneNumber && onReplaceToken && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReplaceToken(phoneNumber)}
                >
                  Replace token
                </Button>
              )}
              {step.fields.length > 0 && (
                <div className="space-y-2">
                  {step.fields.map((f) => (
                    <SetupFieldRow key={f.label} field={f} />
                  ))}
                </div>
              )}
              {step.note && <p className="text-muted-foreground text-xs">{step.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SetupFieldRow({ field }: { field: SetupField }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs">{field.label}</div>
      <div className="border-border bg-muted/40 flex min-w-0 items-center gap-1 rounded-md border px-2 py-1.5">
        <span
          className={cn(
            "text-foreground min-w-0 flex-1 truncate text-sm",
            field.mono && "font-mono text-xs"
          )}
          title={field.value}
          data-testid={`setup-field-${field.label}`}
        >
          {field.value}
        </span>
        <CopyButton value={field.value} label={`Copy ${field.label}`} />
      </div>
    </div>
  );
}

export interface TwilioSetupInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber?: ApiPhoneNumber | null;
  onReplaceToken?: (phoneNumber: ApiPhoneNumber) => void;
}

/** The same steps inside a viewport-bounded dialog (see ScheduleDialog). */
export function TwilioSetupInstructionsDialog({
  open,
  onOpenChange,
  phoneNumber = null,
  onReplaceToken,
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
            Three steps. You can come back to these from the number&apos;s menu at
            any time.
          </DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-5 py-4",
            isMobile && "overscroll-contain px-4 py-3"
          )}
        >
          {open && (
            <TwilioSetupInstructions phoneNumber={phoneNumber} onReplaceToken={onReplaceToken} />
          )}
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
