"use client";

import type { RefObject } from "react";
import { motion, useDragControls } from "framer-motion";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A macOS-style desktop window. When `draggable`, it can be dragged by its
 * title bar (the body stays fully interactive) and is constrained to
 * `constraintsRef` — its parent "desktop" stage.
 */
export function WindowFrame({
  url,
  title,
  draggable,
  constraintsRef,
  className,
  bodyClassName,
  children,
}: {
  url?: string;
  title?: string;
  draggable?: boolean;
  constraintsRef?: RefObject<HTMLElement | null>;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const controls = useDragControls();
  const dragProps = draggable
    ? {
        drag: true,
        dragControls: controls,
        dragListener: false,
        dragMomentum: false,
        dragElastic: 0.04,
        dragConstraints: constraintsRef,
        whileDrag: { zIndex: 50, boxShadow: "0 40px 90px -20px rgba(30,41,90,0.45)" },
      }
    : {};

  return (
    <motion.div
      {...dragProps}
      className={cn(
        "ring-border/70 flex flex-col overflow-hidden rounded-xl bg-card shadow-[0_30px_80px_-24px_rgba(30,41,90,0.35),0_8px_24px_-12px_rgba(30,41,90,0.18)] ring-1",
        className
      )}
    >
      <div
        onPointerDown={draggable ? (e) => controls.start(e) : undefined}
        className={cn(
          "border-border/60 bg-muted/50 flex items-center gap-2 border-b px-3.5 py-2.5",
          draggable && "cursor-grab touch-none select-none active:cursor-grabbing"
        )}
      >
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
      <div className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", bodyClassName)}>
        {children}
      </div>
    </motion.div>
  );
}
