"use client";

import {
  Bot,
  Heart,
  Lock,
  Rocket,
  ShoppingBag,
  Sparkles,
  Star,
  User,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentConfig, PreviewModel } from "./anatomy/types";

/**
 * The floating white "product" panel: a faux browser window showing a designed
 * Acme storefront product page with the agent chat docked in the corner.
 * `active` is the config section in view, used to spotlight the matching UI.
 */
export function StorefrontPanel({
  config,
  preview,
  active,
}: {
  config: AgentConfig;
  preview: PreviewModel;
  active: string;
}) {
  const dw = config.dataWindows.find((d) => d.enabled);
  const aurora = dw
    ? (dw.data["Aurora Lamp"] as Record<string, unknown> | undefined)
    : undefined;
  const stock = typeof aurora?.stock === "number" ? aurora.stock : null;
  const price = typeof aurora?.price === "number" ? aurora.price : 149;

  return (
    <div className="ring-border/70 flex h-full flex-col overflow-hidden rounded-[1.25rem] bg-white shadow-[0_30px_80px_-20px_rgba(30,41,90,0.25),0_8px_24px_-12px_rgba(30,41,90,0.18)] ring-1">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-zinc-200/80 bg-zinc-50 px-4 py-3">
        <span className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <div
          className={cn(
            "ml-2 flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs text-zinc-500 ring-1 ring-zinc-200 transition-all duration-300",
            active === "tools" &&
              "text-zinc-800 shadow-sm ring-2 ring-indigo-400/70"
          )}
        >
          <Lock className="size-3 text-zinc-400" />
          app.acme.store/products/aurora-lamp
        </div>
      </div>

      {/* App body */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-white">
        {/* Store header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3.5">
          <span className="text-sm font-bold tracking-tight text-zinc-900">
            acme<span className="text-indigo-500">.</span>
          </span>
          <nav className="hidden gap-6 text-xs font-medium text-zinc-400 md:flex">
            <span>New</span>
            <span className="text-zinc-900">Lighting</span>
            <span>Furniture</span>
            <span>Decor</span>
          </nav>
          <div className="relative">
            <ShoppingBag className="size-[1.15rem] text-zinc-700" />
            <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-indigo-500 text-[0.55rem] font-bold text-white">
              1
            </span>
          </div>
        </div>

        {/* Deploy overlay */}
        {active === "ship" && (
          <div className="animate-in fade-in slide-in-from-top-2 absolute left-1/2 top-16 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-xl duration-300">
            <Rocket className="size-3.5 text-emerald-400" />
            deployed to <span className="text-indigo-300">dev</span> · 2.1s
          </div>
        )}

        {/* Product */}
        <div className="grid flex-1 grid-cols-1 gap-7 overflow-hidden p-6 md:grid-cols-[1fr_1.04fr] md:items-start md:p-8">
          {/* Gallery */}
          <div className="flex flex-col items-center gap-3 md:order-2">
            <LampScene />
            <div className="flex w-full max-w-[320px] gap-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "flex aspect-square flex-1 items-center justify-center rounded-xl ring-1 ring-zinc-200",
                    i === 0 && "ring-2 ring-zinc-900"
                  )}
                  style={{
                    background:
                      i === 0
                        ? "radial-gradient(120% 100% at 50% 0%, #fffaf2, #f4ebde)"
                        : i === 1
                          ? "radial-gradient(120% 100% at 50% 0%, #fdfdfd, #eef1f4)"
                          : "radial-gradient(120% 100% at 50% 0%, #f6f9ff, #e6eefb)",
                  }}
                >
                  <MiniLamp />
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col md:order-1">
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-indigo-500">
              Lighting
            </div>
            <h3 className="mt-1.5 text-[1.6rem] font-bold leading-tight tracking-tight text-zinc-900">
              Aurora Lamp
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    className="size-3.5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <span className="text-xs text-zinc-400">4.8 · 216 reviews</span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-2xl font-bold text-zinc-900">${price}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 transition-all duration-300",
                  active === "datawindows" &&
                    "scale-110 shadow-sm ring-2 ring-emerald-400"
                )}
              >
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {stock !== null ? `In stock: ${stock}` : "Stock unknown"}
              </span>
            </div>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
              A warm, dimmable bedside lamp with a brushed-aluminium base and
              three light temperatures.
            </p>

            {/* Temperature swatches */}
            <div className="mt-5">
              <div className="mb-2 text-[0.7rem] font-medium uppercase tracking-wider text-zinc-400">
                Light temperature
              </div>
              <div className="flex gap-2.5">
                {[
                  { c: "#f7b94e", on: true },
                  { c: "#f3ede0", on: false },
                  { c: "#cfe0f2", on: false },
                ].map((s, i) => (
                  <span
                    key={i}
                    className={cn(
                      "size-7 rounded-full ring-1 ring-black/10",
                      s.on && "ring-2 ring-offset-2 ring-zinc-900"
                    )}
                    style={{ backgroundColor: s.c }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2.5">
              <button
                type="button"
                className="flex-1 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                Add to cart · ${price}
              </button>
              <button
                type="button"
                aria-label="Save"
                className="flex size-11 items-center justify-center rounded-xl text-zinc-500 ring-1 ring-zinc-200 transition-colors hover:text-rose-500"
              >
                <Heart className="size-4" />
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Free shipping over $50 · 30-day returns
            </p>
          </div>

          {/* Docked chat */}
          <DockedChat preview={preview} active={active} />
        </div>
      </div>
    </div>
  );
}

function LampScene() {
  return (
    <div
      className="relative flex aspect-square w-full max-w-[320px] items-center justify-center overflow-hidden rounded-2xl ring-1 ring-zinc-100"
      style={{
        background:
          "radial-gradient(120% 95% at 50% 0%, #fffaf2 0%, #fbf1e3 45%, #f0eae1 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[24%] h-44 w-60 -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,190,110,0.55), rgba(255,190,110,0))",
        }}
      />
      <svg viewBox="0 0 240 280" className="relative z-10 h-[80%]">
        <defs>
          <linearGradient id="aj-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fdfaf4" />
            <stop offset="1" stopColor="#e7d9c2" />
          </linearGradient>
          <linearGradient id="aj-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#9aa1ab" />
            <stop offset="0.5" stopColor="#dde2e8" />
            <stop offset="1" stopColor="#9aa1ab" />
          </linearGradient>
          <radialGradient id="aj-bulb" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffd79a" />
            <stop offset="1" stopColor="#ffd79a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M70 122 L170 122 L208 244 L32 244 Z" fill="url(#aj-bulb)" opacity="0.45" />
        <rect x="118" y="48" width="4" height="20" rx="2" fill="url(#aj-metal)" />
        <circle cx="120" cy="64" r="6" fill="url(#aj-metal)" />
        <path
          d="M84 70 L156 70 L176 122 L64 122 Z"
          fill="url(#aj-shade)"
          stroke="#d9cdb6"
          strokeWidth="1"
        />
        <ellipse cx="120" cy="122" rx="40" ry="7" fill="url(#aj-bulb)" />
        <rect x="116" y="122" width="8" height="108" rx="3" fill="url(#aj-metal)" />
        <ellipse cx="120" cy="236" rx="46" ry="11" fill="url(#aj-metal)" />
        <ellipse cx="120" cy="231" rx="46" ry="10" fill="#eef1f4" />
      </svg>
      <div className="absolute bottom-6 left-1/2 h-3 w-40 -translate-x-1/2 rounded-[100%] bg-black/10 blur-md" />
    </div>
  );
}

function MiniLamp() {
  return (
    <svg viewBox="0 0 240 280" className="h-[62%] opacity-80">
      <path d="M84 70 L156 70 L176 122 L64 122 Z" fill="#e7d9c2" />
      <rect x="116" y="122" width="8" height="108" rx="3" fill="#b9bfc8" />
      <ellipse cx="120" cy="236" rx="46" ry="11" fill="#b9bfc8" />
    </svg>
  );
}

function DockedChat({
  preview,
  active,
}: {
  preview: PreviewModel;
  active: string;
}) {
  return (
    <div className="absolute bottom-4 right-4 flex max-h-[66%] w-[13.5rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_18px_50px_-12px_rgba(30,41,90,0.3)] sm:bottom-5 sm:right-5 sm:w-[18.5rem]">
      {/* header */}
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-zinc-100 px-3.5 py-3 transition-colors duration-300",
          (active === "agent" || active === "prompt") && "bg-indigo-50/70"
        )}
      >
        <span className="relative flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500">
          <Bot className="size-4 text-white" />
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <div className="leading-tight">
          <div className="text-[0.8rem] font-semibold text-zinc-900">
            Storefront Assistant
          </div>
          <div className="text-[0.65rem] text-zinc-400">
            {preview.personaLabel}
          </div>
        </div>
      </div>

      {/* messages */}
      <div className="flex flex-col gap-2 overflow-y-auto p-3 text-[0.72rem]">
        <ChatBubble role="agent">{preview.greeting}</ChatBubble>
        <ChatBubble role="user">{preview.userMessage}</ChatBubble>

        {preview.steps.map((step) => {
          const lit =
            (step.kind === "sre" && active === "sres") ||
            (step.kind === "tool" && active === "tools");
          return (
            <div
              key={step.kind + step.name}
              className={cn(
                "rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 font-mono text-[0.66rem] transition-all duration-300",
                lit && "border-indigo-300 bg-indigo-50 shadow-sm ring-1 ring-indigo-200"
              )}
            >
              <div className="flex items-center gap-1.5 text-zinc-700">
                {step.kind === "tool" ? (
                  <Wrench className="size-2.5 text-indigo-500" />
                ) : (
                  <Sparkles className="size-2.5 text-violet-500" />
                )}
                {step.name}()
                <span className="ml-auto text-[0.58rem] text-zinc-400">
                  {step.meta}
                </span>
              </div>
              <div className="mt-1 truncate text-zinc-500">
                → {step.output.replace(/\s+/g, " ")}
              </div>
            </div>
          );
        })}

        <ChatBubble role="agent">
          {preview.answer.map((seg, i) => (
            <span
              key={i}
              className={cn(
                "transition-all duration-300",
                seg.source === "memory" &&
                  active === "memdocs" &&
                  "rounded bg-amber-100 px-0.5 ring-1 ring-amber-200"
              )}
            >
              {seg.text}
            </span>
          ))}
        </ChatBubble>
      </div>

      {/* faux input */}
      <div className="border-t border-zinc-100 p-2.5">
        <div className="flex items-center justify-between rounded-full bg-zinc-100 px-3.5 py-2 text-[0.7rem] text-zinc-400">
          Ask anything…
          <span className="flex size-5 items-center justify-center rounded-full bg-zinc-900 text-white">
            ↑
          </span>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  role,
  children,
}: {
  role: "agent" | "user";
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-1.5", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-zinc-200"
            : "bg-gradient-to-br from-indigo-500 to-violet-500"
        )}
      >
        {isUser ? (
          <User className="size-3 text-zinc-500" />
        ) : (
          <Bot className="size-3 text-white" />
        )}
      </span>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-2.5 py-1.5 leading-relaxed",
          isUser ? "bg-zinc-100 text-zinc-700" : "bg-zinc-50 text-zinc-700"
        )}
      >
        {children}
      </div>
    </div>
  );
}
