"use client";

import { useParams } from "next/navigation";
import { ChatPage } from "@/components/chat-page/chat-page";
import { useOrgStore } from "@/lib/stores/org-store";

/**
 * Owns the chat page tree for both `/app/chat` and `/app/chat/[context_id]`.
 *
 * It lives in the *layout* on purpose: Next.js remounts page components when
 * the matched segment changes, but layouts persist. Keeping the
 * `AjentifyProvider` (and its WebSocket) here means the first send on a new
 * chat can `router.replace()` to `/app/chat/<id>` without resetting the
 * conversation. `useParams()` sees the child segment's `context_id`, so the
 * pages themselves render nothing.
 *
 * Keyed on the active org: switching org should start the page fresh.
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ context_id?: string }>();
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const contextId =
    typeof params?.context_id === "string" ? params.context_id : undefined;
  return (
    <>
      <ChatPage key={activeOrgId ?? "no-org"} contextId={contextId} />
      {children}
    </>
  );
}
