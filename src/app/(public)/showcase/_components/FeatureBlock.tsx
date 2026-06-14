"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function FeatureBlock({
  index,
  eyebrow,
  title,
  body,
  points,
  reverse,
  children,
}: {
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  points?: string[];
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border/50 border-t">
      <div className="container mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div
          className={cn(
            "grid items-center gap-12 xl:gap-14",
            reverse
              ? "xl:grid-cols-[800px_minmax(0,1fr)]"
              : "xl:grid-cols-[minmax(0,1fr)_800px]"
          )}
        >
          {/* Copy */}
          <motion.div
            className={cn(
              "xl:row-start-1",
              reverse ? "xl:col-start-2" : "xl:col-start-1"
            )}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="fig-label text-muted-foreground mb-4 flex items-center gap-2">
              <span className="bg-primary inline-block size-2" />
              <span className="text-primary">{index}</span>
              <span className="text-border">/</span>
              {eyebrow}
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-[2.5rem] md:leading-[1.05]">
              {title}
            </h2>
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
              {body}
            </p>
            {points && (
              <ul className="mt-6 space-y-2.5">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[0.95rem]">
                    <span className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                      <Check className="size-3" />
                    </span>
                    <span className="text-foreground/80">{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* Demo stage — min 800×600 so the windows stay readable */}
          <div
            className={cn(
              "overflow-x-auto xl:row-start-1",
              reverse ? "xl:col-start-1" : "xl:col-start-2"
            )}
          >
            <motion.div
              className="relative h-[600px] w-full min-w-[800px]"
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {children}
            </motion.div>
            <p className="fig-label text-muted-foreground/50 mt-3.5 text-center">
              drag the windows to rearrange ↔
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
