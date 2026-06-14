"use client";

import type { RefObject } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The "desktop" behind each demo's windows: an Apple-style scenic photo with
 * a gentle scroll parallax, veiled for legibility and tinted to the brand.
 * The frosted WindowFrames blur this backdrop through their glass.
 */
export function DemoStage({
  image,
  stageRef,
  position = "center",
  className,
  children,
}: {
  image: string;
  stageRef: RefObject<HTMLDivElement | null>;
  position?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? ["0%", "0%"] : ["-7%", "7%"]
  );

  return (
    <div
      ref={stageRef}
      className={cn(
        "ring-border/40 relative h-full w-full overflow-hidden rounded-2xl ring-1",
        className
      )}
    >
      {/* Parallax scenic photo */}
      <motion.img
        src={image}
        alt=""
        aria-hidden
        draggable={false}
        style={{ y, objectPosition: position }}
        className="pointer-events-none absolute inset-x-0 top-[-7%] h-[114%] w-full select-none object-cover"
      />
      {/* Legibility veil — adapts to light / dark theme */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-background/60"
      />
      {/* Brand tint to tie the scene to the palette */}
      <div
        aria-hidden
        className="from-primary/15 to-accent/15 pointer-events-none absolute inset-0 bg-gradient-to-br"
      />
      {children}
    </div>
  );
}
