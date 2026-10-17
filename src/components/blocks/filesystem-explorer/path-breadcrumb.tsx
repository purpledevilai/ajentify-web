"use client";

import { ChevronRight } from "lucide-react";
import { CopyButton } from "@/components/blocks/copy-button";
import { breadcrumbs, externalPath } from "@/lib/filesystems/paths";
import { cn } from "@/lib/utils";

/**
 * `/<filesystem_id>/…` breadcrumb. Every segment navigates; the copy button
 * copies the full agent path for the current node.
 */
export function PathBreadcrumb({
  filesystemId,
  path,
  onNavigate,
  className,
}: {
  filesystemId: string;
  path: string;
  onNavigate: (path: string) => void;
  className?: string;
}) {
  const crumbs = breadcrumbs(path);
  const full = externalPath(filesystemId, path);
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-0.5 font-mono text-xs",
        className
      )}
      aria-label="Path"
    >
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          const label = i === 0 ? `/${filesystemId}` : c.name;
          return (
            <span key={c.path} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight className="text-muted-foreground/60 size-3 shrink-0" />}
              <button
                type="button"
                onClick={() => onNavigate(c.path)}
                disabled={last}
                title={i === 0 ? "Filesystem root" : c.path}
                className={cn(
                  "rounded px-1 py-0.5 transition-colors",
                  last
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  i === 0 && "max-w-[11rem] truncate"
                )}
              >
                {label}
              </button>
            </span>
          );
        })}
      </div>
      <CopyButton value={full} label="Copy agent path" className="shrink-0" />
    </div>
  );
}
