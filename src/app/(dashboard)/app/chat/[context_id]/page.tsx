/**
 * `/app/chat/[context_id]` — an existing conversation. Rendered by the
 * parent `chat/layout.tsx`, which reads `context_id` via `useParams()`; this
 * route only needs to exist so the URL resolves.
 */
export default function ChatConversationPage() {
  return null;
}
