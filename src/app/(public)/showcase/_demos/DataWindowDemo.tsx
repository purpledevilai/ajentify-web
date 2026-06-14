"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Radio, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowFrame } from "../_components/WindowFrame";
import { JsonField } from "../_components/JsonField";
import { Chat, type ChatItem } from "../_components/Chat";

const INITIAL = {
  "Aurora Lamp": { stock: 8, price: 149 },
  "Nimbus Chair": { stock: 3, price: 399 },
};

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function DataWindowDemo() {
  const [data, setData] = useState<Record<string, unknown>>(INITIAL);
  const [live, setLive] = useState(false);
  const liveRef = useRef(live);
  liveRef.current = live;
  const stageRef = useRef<HTMLDivElement>(null);

  const stock = (() => {
    const s = rec(data["Aurora Lamp"]).stock;
    return typeof s === "number" ? s : 0;
  })();

  function sell() {
    setData((d) => {
      const a = { ...rec(d["Aurora Lamp"]) };
      const s = typeof a.stock === "number" ? a.stock : 0;
      a.stock = s <= 1 ? 8 : s - 1;
      return { ...d, "Aurora Lamp": a };
    });
  }

  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => liveRef.current && sell(), 1700);
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
    <div ref={stageRef} className="relative h-full w-full">
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        title="data window · live_inventory"
        className="absolute left-[3%] top-0 z-10 h-[94%] w-[94%]"
      >
        <div className="flex min-h-0 flex-1">
          <div className="border-border/50 flex w-[50%] shrink-0 flex-col border-r">
            <div className="text-muted-foreground border-border/50 flex items-center gap-1.5 border-b px-3 py-2 text-[0.6rem] font-medium uppercase tracking-wider">
              live_inventory.json · editable
              {live && (
                <span className="text-primary flex items-center gap-1">
                  <span className="bg-primary size-1.5 animate-pulse rounded-full" />
                  live
                </span>
              )}
            </div>
            <JsonField
              value={data}
              onChange={setData}
              minHeight="100%"
              className="min-h-0 flex-1 [&>div]:h-full [&>div]:rounded-none [&>div]:border-0"
            />
            <div className="border-border/50 flex flex-wrap gap-2 border-t p-2.5">
              <button
                type="button"
                onClick={sell}
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
                {live ? "Live on" : "Live feed"}
              </button>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <Chat items={items} header={{ name: "Storefront Assistant", sub: "reading live_inventory" }} />
          </div>
        </div>
      </WindowFrame>
    </div>
  );
}
