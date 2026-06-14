"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A macOS-style desktop window used to frame each showcase demo. Theme-aware
 * (uses tokens) so it works in light and dark.
 */
export function WindowFrame({
  url,
  title,
  className,
  bodyClassName,
  children,
}: {
  url?: string;
  title?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "ring-border/70 flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-[0_30px_80px_-24px_rgba(30,41,90,0.35),0_8px_24px_-12px_rgba(30,41,90,0.18)] ring-1",
        className
      )}
    >
      <div className="border-border/60 bg-muted/50 flex items-center gap-2 border-b px-3.5 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        {url ? (
          <div className="text-muted-foreground ring-border/60 bg-background/70 ml-2 flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs ring-1">
            <Lock className="size-3 opacity-60" />
            {url}
          </div>
        ) : title ? (
          <span className="text-muted-foreground ml-2 flex-1 text-center text-xs font-medium">
            {title}
          </span>
        ) : null}
      </div>
      <div className={cn("relative flex flex-1 flex-col overflow-hidden", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
