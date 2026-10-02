"use client";

import { ArrowRight, Building2, Check, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/primitives/button";
import { CopyButton } from "@/components/blocks/copy-button";
import { cn } from "@/lib/utils";

export interface OrgCardProps {
  org: { id: string; name: string };
  /** Undefined while loading / unavailable. */
  memberCount?: number;
  active?: boolean;
  onOpen: (orgId: string) => void;
}

export function OrgCard({ org, memberCount, active, onOpen }: OrgCardProps) {
  return (
    <div
      className={cn(
        "bg-card border-border flex flex-col gap-4 rounded-lg border p-5 transition-colors",
        active ? "border-primary/50" : "hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-muted text-primary shrink-0 rounded-md p-2">
            <Building2 className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium" title={org.name}>
              {org.name}
            </div>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <span className="truncate font-mono" title={org.id}>
                {org.id.slice(0, 8)}…
              </span>
              <CopyButton value={org.id} label="Copy organization ID" />
            </div>
          </div>
        </div>
        {active && (
          <Badge variant="secondary">
            <Check />
            Current
          </Badge>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Users className="size-3.5" />
          {memberCount === undefined
            ? "—"
            : `${memberCount} member${memberCount === 1 ? "" : "s"}`}
        </span>
        <Button
          variant={active ? "solid" : "outline"}
          size="sm"
          onClick={() => onOpen(org.id)}
        >
          Open
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
