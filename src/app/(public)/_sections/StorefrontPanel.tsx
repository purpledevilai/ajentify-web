"use client";

import { Bot, Lamp, Lock, Rocket, Sparkles, User, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentConfig, PreviewModel } from "./anatomy/types";

/**
 * The floating white "product" panel: a faux browser window showing an Acme
 * storefront with the agent chat docked in the corner. Light by design — it
 * sits on the always-dark showcase stage. `active` is the config section the
 * visitor is currently scrolled to, used to spotlight the matching UI.
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
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-100 px-3.5 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <div
          className={cn(
            "ml-2 flex flex-1 items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs text-zinc-500 ring-1 ring-zinc-200 transition-all duration-300",
            active === "tools" && "text-zinc-800 ring-2 ring-indigo-400"
          )}
        >
          <Lock className="size-3 text-zinc-400" />
          app.acme.store/products/aurora-lamp
        </div>
      </div>

      {/* App body */}
      <div className="relative flex-1 overflow-hidden bg-white">
        {/* Deploy overlay */}
        {active === "ship" && (
          <div className="animate-in fade-in slide-in-from-top-2 absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg duration-300">
            <Rocket className="size-3.5 text-emerald-400" />
            deployed to <span className="text-indigo-300">dev</span> · 2.1s
          </div>
        )}

        {/* Storefront product page */}
        <div className="grid h-full grid-cols-1 gap-6 p-6 sm:grid-cols-2 sm:items-center">
          <div className="flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200">
            <Lamp className="size-24 text-zinc-400" strokeWidth={1.25} />
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-[0.7rem] font-medium uppercase tracking-wider text-zinc-400">
              Lighting
            </div>
            <h3 className="mt-1 text-2xl font-bold text-zinc-900">Aurora Lamp</h3>
            <div className="mt-1 text-xl text-zinc-700">${price}.00</div>
            <div
              className={cn(
                "mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 transition-all duration-300",
                active === "datawindows" && "scale-110 ring-2 ring-emerald-400"
              )}
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {stock !== null ? `In stock: ${stock}` : "Stock unknown"}
            </div>
            <p className="mt-4 max-w-xs text-sm text-zinc-500">
              A warm, dimmable bedside lamp with a brushed-aluminium base and
              three light temperatures.
            </p>
            <button
              type="button"
              className="mt-5 w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              Add to cart
            </button>
          </div>
        </div>

        {/* Docked chat widget */}
        <DockedChat preview={preview} active={active} />
      </div>
    </div>
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
    <div className="absolute bottom-4 right-4 flex max-h-[78%] w-[19rem] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
      {/* header */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-zinc-100 px-3 py-2.5 transition-all duration-300",
          (active === "agent" || active === "prompt") && "bg-indigo-50"
        )}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500">
          <Bot className="size-3.5 text-white" />
        </span>
        <div className="leading-tight">
          <div className="text-xs font-semibold text-zinc-800">
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
                lit && "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
              )}
            >
              <div className="flex items-center gap-1.5 text-zinc-700">
                {step.kind === "tool" ? (
                  <Wrench className="size-2.5 text-indigo-500" />
                ) : (
                  <Sparkles className="size-2.5 text-violet-500" />
                )}
                {step.name}()
                <span className="ml-auto text-[0.6rem] text-zinc-400">
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
          "max-w-[85%] rounded-xl px-2.5 py-1.5 leading-relaxed",
          isUser ? "bg-zinc-100 text-zinc-700" : "bg-zinc-50 text-zinc-700"
        )}
      >
        {children}
      </div>
    </div>
  );
}
