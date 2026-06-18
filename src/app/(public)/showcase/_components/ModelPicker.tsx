"use client";

import type { ComponentType, SVGProps } from "react";
import {
  AnthropicIcon,
  GeminiIcon,
  OpenAIIcon,
} from "@/components/primitives/brand-icons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Provider = "openai" | "anthropic" | "google";

type ProviderMeta = {
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  icon: string;
  badge: string;
};

const PROVIDERS: Record<Provider, ProviderMeta> = {
  openai: {
    name: "OpenAI",
    Icon: OpenAIIcon,
    icon: "text-emerald-600 dark:text-emerald-400",
    badge:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  anthropic: {
    name: "Anthropic",
    Icon: AnthropicIcon,
    icon: "text-amber-700 dark:text-amber-500",
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  google: {
    name: "Google",
    Icon: GeminiIcon,
    icon: "text-blue-600 dark:text-blue-400",
    badge: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
};

export type Model = {
  id: string;
  label: string;
  provider: Provider;
  input: string;
  output: string;
  context: string;
};

export const MODELS: Model[] = [
  { id: "gpt-5.2", label: "gpt-5.2", provider: "openai", input: "$1.75", output: "$14.00", context: "400K" },
  { id: "gpt-5.2-codex", label: "gpt-5.2-codex", provider: "openai", input: "$1.75", output: "$14.00", context: "400K" },
  { id: "gpt-5.1", label: "gpt-5.1", provider: "openai", input: "$1.25", output: "$10.00", context: "400K" },
  { id: "gpt-5-mini", label: "gpt-5-mini", provider: "openai", input: "$0.25", output: "$2.00", context: "400K" },
  { id: "claude-opus-4-6", label: "claude-opus-4-6", provider: "anthropic", input: "$5.00", output: "$25.00", context: "200K" },
  { id: "claude-sonnet-4-6", label: "claude-sonnet-4-6", provider: "anthropic", input: "$3.00", output: "$15.00", context: "200K" },
  { id: "claude-haiku-4-5", label: "claude-haiku-4-5", provider: "anthropic", input: "$1.00", output: "$5.00", context: "200K" },
  { id: "gemini-2.5-pro", label: "gemini-2.5-pro", provider: "google", input: "$1.25", output: "$10.00", context: "1M" },
];

export const DEFAULT_MODEL = "gpt-5.2";

const BY_ID = new Map(MODELS.map((m) => [m.id, m]));

export function modelLabel(id: string) {
  return BY_ID.get(id)?.label ?? id;
}

function ProviderBadge({ provider }: { provider: Provider }) {
  const p = PROVIDERS[provider];
  return (
    <span
      className={cn(
        "rounded border px-1 py-0.5 text-[0.58rem] font-medium leading-none",
        p.badge
      )}
    >
      {p.name}
    </span>
  );
}

/** Model selector — provider-grouped dropdown with brand icons + pricing.
 *  Shared across the showcase demos. */
export function ModelPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const groups: Provider[] = ["openai", "anthropic", "google"];

  return (
    <Select value={value} onValueChange={(v) => onChange(v as string)}>
      <SelectTrigger size="sm" className={cn("bg-card w-full", className)}>
        <SelectValue>
          {(val) => {
            const m = BY_ID.get(val as string);
            if (!m) return val as string;
            const p = PROVIDERS[m.provider];
            return (
              <span className="flex min-w-0 items-center gap-1.5">
                <p.Icon className={cn("size-3.5 shrink-0", p.icon)} />
                <span className="truncate font-mono text-[0.72rem]">{m.label}</span>
              </span>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-72" alignItemWithTrigger={false}>
        {groups.map((g) => (
          <SelectGroup key={g}>
            <SelectLabel className="flex items-center gap-1.5">
              {PROVIDERS[g].name}
            </SelectLabel>
            {MODELS.filter((m) => m.provider === g).map((m) => {
              const p = PROVIDERS[m.provider];
              return (
                <SelectItem key={m.id} value={m.id} className="py-1.5">
                  <span className="flex w-full flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                      <p.Icon className={cn("size-3.5 shrink-0", p.icon)} />
                      <span className="font-mono text-[0.78rem] font-medium">
                        {m.label}
                      </span>
                      <ProviderBadge provider={m.provider} />
                    </span>
                    <span className="text-muted-foreground flex gap-3 pl-5 text-[0.6rem]">
                      <span>In {m.input}</span>
                      <span>Out {m.output}</span>
                      <span>Ctx {m.context}</span>
                    </span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
