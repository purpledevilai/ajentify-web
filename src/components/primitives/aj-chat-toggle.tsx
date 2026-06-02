"use client";

import { Sparkles } from "lucide-react";
import { useChatPanel } from "@ajentify/chat";
import { Button } from "@/components/ui/button";

/**
 * Top-bar button that toggles the dashboard's docked Aj chat panel.
 *
 * `useChatPanel()` reads/writes the chat provider's built-in panel slice,
 * so we don't need a separate dashboard-owned store — any button anywhere
 * in the dashboard can flip the same state via this hook (or via the
 * SDK's `<ChatToggleButton />` if you don't need the dashboard's own
 * styling).
 */
export function AjChatToggle() {
  const { open, toggle } = useChatPanel();

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
