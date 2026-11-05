"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Info, Phone, PhoneOff, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BuilderSection } from "@/components/blocks/builder-section";
import { getErrorMessage } from "@/lib/api/errors";
import {
  phoneNumbersActions,
  selectAgentPhoneNumbers,
  selectUnattachedPhoneNumbers,
  usePhoneNumbersStore,
} from "@/lib/stores/phone-numbers-store";
import type { ApiPhoneNumber } from "@/types/api";

export interface AgentPhoneNumberSectionProps {
  agentId: string;
  /**
   * Whether the agent's current model is realtime. `null` while the models
   * list hasn't loaded yet (no hint is shown until we know).
   */
  realtime: boolean | null;
}

function numberLabel(n: ApiPhoneNumber): string {
  return n.friendly_name ? `${n.friendly_name} · ${n.phone_number}` : n.phone_number;
}

/**
 * "Phone number" section of the agent builder: the org's numbers routed to
 * this agent, with attach/detach. Numbers are their own resource (like
 * schedules), so this writes the phone-numbers store directly rather than
 * going through the builder's dirty/save flow.
 */
export function AgentPhoneNumberSection({ agentId, realtime }: AgentPhoneNumberSectionProps) {
  // Filter in a memo rather than in the selector: a selector that returns a
  // fresh array every call would re-render on every store change.
  const data = usePhoneNumbersStore((s) => s.data);
  const attached = useMemo(() => selectAgentPhoneNumbers(agentId)({ data }), [data, agentId]);
  const unattached = useMemo(() => selectUnattachedPhoneNumbers({ data }), [data]);
  const loaded = usePhoneNumbersStore((s) => s.loaded);
  const loading = usePhoneNumbersStore((s) => s.loading);
  const error = usePhoneNumbersStore((s) => s.error);
  const ensureLoaded = usePhoneNumbersStore((s) => s.ensureLoaded);

  useEffect(() => {
    ensureLoaded().catch(() => {
      // Error is recorded on the store and rendered below.
    });
  }, [ensureLoaded]);

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [detachingId, setDetachingId] = useState<string | null>(null);

  const picked = unattached.find((n) => n.phone_number_id === pickedId) ?? null;
  const canAttach = realtime !== false;

  const attach = async () => {
    if (!picked || attaching) return;
    setAttaching(true);
    try {
      const n = await phoneNumbersActions.attach(picked.phone_number_id, agentId);
      toast.success(`Attached ${n.phone_number}`);
      setPickedId(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to attach number"));
    } finally {
      setAttaching(false);
    }
  };

  const detach = async (n: ApiPhoneNumber) => {
    setDetachingId(n.phone_number_id);
    try {
      await phoneNumbersActions.detach(n.phone_number_id);
      toast.success(`Detached ${n.phone_number}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to detach number"));
    } finally {
      setDetachingId(null);
    }
  };

  const showSkeleton = !loaded && loading;

  return (
    <BuilderSection
      title="Phone number"
      description="Route inbound calls on a Twilio number to this agent. Calls use the agent's realtime voice."
      actions={
        <Button asChild type="button" variant="outline" size="sm">
          <Link href="/app/phone-numbers">
            <Phone className="size-4" />
            Manage
          </Link>
        </Button>
      }
    >
      {realtime === false && (
        <div
          className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40"
          data-testid="phone-realtime-hint"
        >
          <Info className="text-blue-600 dark:text-blue-400 mt-0.5 size-4 shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Phone calls need a realtime model. Switch this agent&apos;s model to a
            realtime one (and save) to attach a number.
          </p>
        </div>
      )}

      {showSkeleton ? (
        <div className="space-y-2" data-testid="phone-numbers-loading">
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error && !loaded ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <>
          {attached.length > 0 && (
            <div className="min-w-0 space-y-2">
              {attached.map((n) => (
                <div
                  key={n.phone_number_id}
                  className="border-border flex w-full min-w-0 items-start gap-3 rounded-md border p-3"
                  data-testid={`phone-row-${n.phone_number_id}`}
                >
                  <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                    <Phone className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground font-mono text-sm font-medium break-all">
                        {n.phone_number}
                      </span>
                      <Badge variant="outline">
                        {n.ownership === "byo" ? "Your Twilio" : "Ajentify"}
                      </Badge>
                    </div>
                    {n.friendly_name && (
                      <p className="text-muted-foreground mt-0.5 text-xs">{n.friendly_name}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    disabled={detachingId === n.phone_number_id}
                    onClick={() => void detach(n)}
                  >
                    <PhoneOff className="size-4" />
                    Detach
                  </Button>
                </div>
              ))}
            </div>
          )}

          {loaded && attached.length === 0 && unattached.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No numbers available.{" "}
              <Link
                href="/app/phone-numbers"
                className="text-foreground underline underline-offset-2 hover:text-foreground/80"
              >
                Connect your own Twilio number
              </Link>{" "}
              to give this agent a phone line.
            </p>
          ) : unattached.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={pickedId}
                onValueChange={(v) => setPickedId(typeof v === "string" ? v : null)}
              >
                <SelectTrigger
                  className="w-full sm:flex-1"
                  aria-label="Number to attach"
                  disabled={!canAttach}
                >
                  <SelectValue placeholder="Choose a number…">
                    {(value) => {
                      const n = unattached.find((x) => x.phone_number_id === value);
                      return n ? numberLabel(n) : "Choose a number…";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {unattached.map((n) => (
                    <SelectItem key={n.phone_number_id} value={n.phone_number_id}>
                      {numberLabel(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="sm:h-9 sm:px-4"
                disabled={!picked || !canAttach || attaching}
                onClick={() => void attach()}
              >
                <Plus className="size-4" />
                Attach number
              </Button>
            </div>
          ) : attached.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Every number in this organization is attached to an agent.
            </p>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span title="Buying numbers from Ajentify is coming soon">
          <Button type="button" variant="outline" size="sm" disabled>
            <ShoppingCart className="size-4" />
            Buy a number (coming soon)
          </Button>
        </span>
      </div>
    </BuilderSection>
  );
}
