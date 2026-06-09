"use client";

import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DeployResponse, ResourceOp } from "@/types/api";
import { cn } from "@/lib/utils";

const OP_VARIANT: Record<
  ResourceOp["op"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  noop: "outline",
};

export interface PlanResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  response: DeployResponse | null;
  /** Whether the response is from a real deploy (vs. a dry-run plan). */
  applied?: boolean;
}

export function PlanResultModal({
  open,
  onOpenChange,
  response,
  applied = false,
}: PlanResultModalProps) {
  if (!response) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant={applied ? "default" : "secondary"}>
              {applied ? "Deployed" : "Plan"}
            </Badge>
            <span className="font-mono">{response.stage_name}</span>
            {response.stage_created && (
              <Badge variant="outline" className="text-xs">
                Stage created
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4">
            <SummaryStat label="Create" count={response.summary.create} className="text-green-600 dark:text-green-400" />
            <SummaryStat label="Update" count={response.summary.update} className="text-blue-600 dark:text-blue-400" />
            <SummaryStat label="Delete" count={response.summary.delete} className="text-destructive" />
            <SummaryStat label="No-op" count={response.summary.noop} className="text-muted-foreground" />
          </div>

          <div className="border-border border-t pt-4">
            {response.operations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No operations.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {response.operations.map((op, idx) => (
                  <div
                    key={`${op.kind}:${op.logical_name}:${idx}`}
                    className="bg-muted/50 flex items-center gap-3 rounded-md p-3"
                  >
                    <Badge variant={OP_VARIANT[op.op]} className="uppercase text-[10px]">
                      {op.op}
                    </Badge>
                    <span className="text-muted-foreground font-mono text-xs">
                      {op.kind}
                    </span>
                    <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                      {op.logical_name}
                    </code>
                    {op.diff_summary && (
                      <span className="text-muted-foreground flex-1 truncate text-xs">
                        {op.diff_summary}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryStat({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("text-lg font-semibold tabular-nums", className)}>
        {count}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
