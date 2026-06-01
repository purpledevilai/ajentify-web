"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAjChatStore } from "@/lib/stores/aj-chat-store";

export function AjChatToggle() {
  const toggle = useAjChatStore((s) => s.toggle);
  const open = useAjChatStore((s) => s.open);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={open ? "Close Aj chat" : "Open Aj chat"}
      aria-pressed={open}
    >
      <Sparkles className="size-4" />
    </Button>
  );
}
