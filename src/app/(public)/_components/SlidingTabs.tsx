"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
}

export function SlidingTabs({
  tabs,
  activeTab,
  onTabChange,
  variant = "dark",
  className,
}: {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  variant?: "dark" | "default";
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector(
      `[data-tab-id="${activeTab}"]`
    ) as HTMLElement | null;
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab]);

  useEffect(measure, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const isDark = variant === "dark";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-lg p-1",
        isDark ? "bg-white/[0.06]" : "border border-border/50 bg-muted/60",
        className
      )}
    >
      <div
        className={cn(
          "absolute top-1 h-[calc(100%-0.5rem)] rounded-md transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          isDark ? "bg-white/[0.1]" : "bg-background shadow-sm"
        )}
        style={{ left: indicator.left, width: indicator.width }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab-id={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative z-10 whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
            activeTab === tab.id
              ? isDark
                ? "text-zinc-100"
                : "text-foreground"
              : isDark
                ? "text-zinc-500 hover:text-zinc-300"
                : "text-muted-foreground hover:text-foreground/70"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
