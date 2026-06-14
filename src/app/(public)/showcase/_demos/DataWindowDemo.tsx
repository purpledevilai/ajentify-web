"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Database, Radio, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowFrame } from "../_components/WindowFrame";
import { Chat, type ChatItem } from "../_components/Chat";

export function DataWindowDemo() {
  const [stock, setStock] = useState(8);
  const [live, setLive] = useState(false);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => {
      if (liveRef.current) setStock((s) => (s <= 1 ? 8 : s - 1));
    }, 1800);
    return () => window.clearInterval(t);
  }, [live]);

  const items: ChatItem[] = [
    { kind: "user", text: "How many Aurora Lamps are left?" },
    {
      kind: "agent",
      text: (
        <span>
          We&apos;ve got{" "}
          <motion.span
            key={stock}
            initial={{ backgroundColor: "rgba(99,102,241,0.25)" }}
            animate={{ backgroundColor: "rgba(99,102,241,0)" }}
            transition={{ duration: 0.8 }}
            className="rounded px-0.5 font-semibold"
          >
            {stock}
          </motion.span>{" "}
          in stock right now.
        </span>
      ),
    },
  ];

  return (
    <WindowFrame title="data window · live_inventory">
      <div className="border-border/50 border-b p-3">
        <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[0.62rem] font-medium uppercase tracking-wider">
          <Database className="size-3" />
          live_inventory.json
          {live && (
            <span className="text-primary ml-1 flex items-center gap-1">
              <span className="bg-primary size-1.5 animate-pulse rounded-full" />
              live
            </span>
          )}
        </div>
        <pre className="text-foreground/75 bg-muted/40 overflow-auto rounded-md p-2.5 font-mono text-[0.7rem] leading-relaxed">
          {`{
  "Aurora Lamp": { "stock": `}
          <motion.span
            key={stock}
            initial={{ color: "var(--primary)" }}
            animate={{ color: "inherit" }}
            transition={{ duration: 0.9 }}
            className="font-semibold"
          >
            {stock}
          </motion.span>
          {`, "price": 149 },
  "Nimbus Chair": { "stock": 3, "price": 399 }
}`}
        </pre>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStock((s) => Math.max(0, s - 1))}
            className="border-border/70 hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
          >
            <ShoppingCart className="size-3.5" />
            Sell one
          </button>
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
              live
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/70 hover:bg-muted"
            )}
          >
            <Radio className={cn("size-3.5", live && "animate-pulse")} />
            {live ? "Live feed on" : "Start live feed"}
          </button>
        </div>
      </div>
      <Chat items={items} />
    </WindowFrame>
  );
}
