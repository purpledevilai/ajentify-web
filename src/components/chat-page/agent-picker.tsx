"use client";

import { Bot } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ApiAgent } from "@/types/api";

export interface AgentPickerProps {
  agents: ApiAgent[];
  value: string | null;
  onChange: (agentId: string) => void;
  /** True while the agents store is still loading. */
  loading?: boolean;
  className?: string;
}

/** Dropdown of the active org's chat-capable agents. */
export function AgentPicker({
  agents,
  value,
  onChange,
  loading,
  className,
}: AgentPickerProps) {
  if (!loading && agents.length === 0) {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>
        No chat agents in this organization yet.
      </p>
    );
  }
  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) => {
        if (typeof v === "string" && v) onChange(v);
      }}
      disabled={loading}
    >
      <SelectTrigger
        aria-label="Agent"
        className={cn(
          "h-10 min-w-56 rounded-full border-border bg-card px-4 shadow-xs",
          className
        )}
      >
        <Bot className="text-primary size-4" />
        <SelectValue placeholder={loading ? "Loading agents…" : "Choose an agent"} />
      </SelectTrigger>
      <SelectContent align="center">
        {agents.map((a) => (
          <SelectItem key={a.agent_id} value={a.agent_id}>
            <span className="truncate">{a.agent_name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
