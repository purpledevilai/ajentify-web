---
date: 2026-08-21
topic: "Agent chat testing issues: add_message RPC timeout, message persistence timing, preamble/tool-call message grouping, and tool-call UI"
repos_touched: [ajentify-web, ajentify-chat, TokenStreamingServer]
tags: [research, codebase, agent-chat, token-streaming, rpc, websocket, tool-calls, streaming]
status: complete
last_updated: 2026-08-21
last_updated_note: "Added Decisions section resolving the Open Questions"
---

# Research: Agent chat testing issues (RPC timeout, persistence timing, preamble grouping, tool-call UI)

**Date**: 2026-08-21
**Repos touched**: `ajentify-web`, `ajentify-chat`, `TokenStreamingServer`

## Research Question

While testing agents (voice + chat) from the `ajentify-web` front end, four behaviors surfaced. This research documents how the current system produces each one, and where in the stack each behavior lives:

1. Front-end chat error: `[browser] [agent-chat] AjentifyError: RPC 'add_message' timed out after 30000ms`. Unclear whether it originates in the frontend, `ajentify-chat`, or `token-streaming-server`.
2. The token streaming server does not save messages after each new message. If it runs a long list of tool calls and never reaches a final content message, it fails (nothing is persisted).
3. With models that emit preamble messages before tool calls, the `ajentify-chat` view shows the post-tool-call message merged into the pre-tool-call message. Desired end-state (for later): capture the preamble as its own completed message, show the "calling tool" line below it, and split any later preamble/final message into its own bubble.
4. Desired end-state (for later): "calling tool" messages should shimmer, and have a dropdown showing call parameters and response, formatted as JSON when the response is JSON.

> Note: The **Detailed Findings** below describe **what exists today** (file:line evidence across all three repos). The **Open Questions** section lists the decisions that needed making, and the **Decisions (2026-08-21)** section at the end records the resolved answers. If you are reading this with fresh context to run `/plan`: read the **Decisions** section first — it is the source of truth for the intended fixes; the findings above are the supporting evidence.

## Summary

The three repos form one pipeline for the agent-test chat feature:

- **`ajentify-web`** (Next.js) renders the per-agent test chat dialog and mounts the `@ajentify/chat` SDK. It sets almost no SDK options (only `websocketUrl` and `agentSpeaksFirst`), so all RPC/timeout/rendering behavior comes from the SDK defaults.
- **`ajentify-chat`** (the SDK, published as `@ajentify/chat`; source lives in `ajentify-chat/packages/chat`) owns the WebSocket JSON-RPC client, the streaming→message state machine (Zustand store), and all message rendering including the tool-call UI.
- **`TokenStreamingServer`** (FastAPI, "token-streaming-server") owns the JSON-RPC-over-WebSocket handlers, the recursive LLM/tool-call loop, and DynamoDB persistence.

Findings mapped to the four issues:

1. **The 30 s timeout is a whole-turn timeout, not a connection/ack timeout.** The client's `add_message` RPC waits for a JSON-RPC **reply** (`awaitResponse` defaults to `true`) with a 30000 ms timer. The server's `add_message` handler only sends that reply **after the entire streamed turn finishes** (all tokens streamed, all recursive tool calls executed, and the context saved). So any agent turn whose full server-side processing exceeds 30 s triggers the client error — even while tokens are still streaming. The timeout is defined in the SDK; the server-side duration is what exceeds it. This directly interacts with issue 2 (long tool-call chains).
2. **Persistence happens exactly once, at the very end of the turn.** `TokenStreamingServer` accumulates all intermediate AI/tool messages only in memory (`agent.messages`) during the recursive `invoke()` loop and writes the whole context to DynamoDB a single time after the loop returns (`add_message.py:52-53`). There is no per-message or per-tool-call save inside the loop. If the turn never returns to the handler (error, disconnect, or client timeout mid-stream), none of the turn's messages are persisted.
3. **Preamble/tool/final grouping is driven entirely by `response_id` and `on_stop_token`.** Text tokens accumulate into a single `pendingResponse` buffer keyed by `response_id`; the buffer is committed as one bubble on `on_stop_token`. The server emits **one `on_stop_token` at the very end of the whole turn** and reuses **one `response_id`** across preamble text, tool calls, and final text. So on the client, preamble and final text share the same buffer and get concatenated into a single bubble (with tool-call rows appended separately as they arrive). The "split into separate bubbles" behavior the user wants would require either per-segment `response_id`/`on_stop_token` boundaries from the server, or client-side segmentation on tool-call events.
4. **The tool-call UI is currently a minimal inline label.** It renders a wrench icon + "Called/Running <toolName>" + a spinner while running. There is no shimmer, no dropdown, no display of `toolInput`, and `tool_response` messages render `null`. There is no JSON detection/formatting anywhere in the render path. The data needed for the desired UX (tool input and tool output) already flows to the client via `on_tool_call`/`on_tool_response` and is stored on the message objects, but the response is not currently attached to the tool-call message.

## Detailed Findings

### Issue 1 — `RPC 'add_message' timed out after 30000ms`

**Where the error string is produced (SDK):** `ajentify-chat/packages/chat/src/ws/TokenStreamingClient.ts:237-264`. The generic `call()` starts a `setTimeout(requestTimeoutMs)` when it sends the request and rejects with `AjentifyError("RPC '<method>' timed out after <ms>ms", 'transport')` if no matching reply arrives.

```237:264:packages/chat/src/ws/TokenStreamingClient.ts
  async call(
    method: string,
    params: Record<string, unknown>,
    options: { awaitResponse?: boolean } = {}
  ): Promise<Record<string, unknown>> {
    const awaitResponse = options.awaitResponse ?? true;
    ...
    const id = uid('req');
    return await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new AjentifyError(
            `RPC '${method}' timed out after ${this.opts.requestTimeoutMs}ms`,
            'transport'
          )
        );
      }, this.opts.requestTimeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      this.sendRaw({ method, params, id });
    });
  }
```

**`add_message` awaits the reply.** `addMessage` calls `call('add_message', { message })` with no options, so `awaitResponse` defaults to `true` (`ajentify-chat/packages/chat/src/ws/TokenStreamingClient.ts:214-216`, `:242`). The timer resolves only when a frame with the matching `id` arrives (resolution path in `handleIncoming`, `TokenStreamingClient.ts:392-431`).

**The timeout value (30000 ms) is an SDK default, never overridden by the app.** `requestTimeoutMs: options.requestTimeoutMs ?? 3e4` — the built SDK in `ajentify-web/node_modules/@ajentify/chat/dist/index.js:39`. `ajentify-web` never sets `requestTimeoutMs`; the per-agent chat dialog only sets `websocketUrl`, `agentSpeaksFirst`, `clientSideTools`, `themeBridge`, and `onError` (`ajentify-web/src/components/blocks/agent-chat-session-dialog.tsx:104-114`).

**The `[agent-chat]` tag = the per-agent test chat dialog** (not the dashboard "Aj" assistant, which logs `[ajentify]`):

```111:111:ajentify-web/src/components/blocks/agent-chat-session-dialog.tsx
      onError: (err: unknown) => console.error("[agent-chat]", err),
```

**The server only replies after the whole turn.** The server-side `add_message` handler streams all tokens, runs the recursive tool loop, saves the context, and then implicitly returns (which causes the peer to send the `{id, result}` reply because the request carried an `id`):

```7:53:src/handlers/add_message.py
async def add_message(connection_id: str, message: str):
    ...
    token_stream = await agent.add_human_message_and_invoke(message)
    response_id = str(uuid.uuid4())
    if token_stream:
        async for token in token_stream:
            await connection.peer.call(method="on_token", params={"token": token, "response_id": response_id})
    await connection.peer.call(method="on_stop_token", params={"response_id": response_id})
    ...
    Context.save_context(connection.context)
```

The reply is sent by the peer after the handler returns (`TokenStreamingServer/src/lib/JSONRPCPeer.py:78-84`: `result = await handler(**params); await self.sender({id, result})`). Because the handler doesn't return until the entire recursive `invoke()` finishes and the context is saved, the **client's 30 s clock races the full turn duration** (LLM streaming + every tool execution + two DynamoDB reads + final write). Slow/long turns exceed 30 s and the client rejects even though the socket is healthy and `on_token`s may still be arriving.

**Note on `response_id`:** the `response_id` used for `on_token`/`on_stop_token` is generated fresh in the handler (`add_message.py:34`) and is **unrelated** to the RPC `id` used for the timeout. The RPC `id` is created by the client (`TokenStreamingClient.ts:250`).

Cross-repo path for this issue: `ajentify-web` (mounts SDK, no override) → `ajentify-chat` (30 s timer on `add_message` awaiting reply) → `TokenStreamingServer` (reply deferred until whole turn completes).

### Issue 2 — Messages not saved until the end of the turn

**The recursive loop holds state in memory only.** `TokenStreamingAgentChat.invoke()` streams one LLM response, appends messages to `self.messages`, executes tool calls, and recurses — with **no `save_context` anywhere inside the loop** (`TokenStreamingServer/src/LLM/TokenStreamingAgentChat.py:94-201`). Tool execution appends `ToolMessage`s to `self.messages` in `_process_tool_calls` (`TokenStreamingAgentChat.py:203-275`), again without persisting.

- Tool-only round (no text): appends the AI tool-call message and recurses (`TokenStreamingAgentChat.py:189-201`).
- Content round that also has tool calls: appends the streamed text as an `AIMessage`, appends a separate tool-call `AIMessage`, executes tools, recurses (`TokenStreamingAgentChat.py:153-178`).

**Persistence is a single whole-item write after the loop returns.** In the handler, only after the stream generator is fully drained is the context saved:

```49:53:src/handlers/add_message.py
    connection.context.user_defined = Context.get_context(connection.context.context_id).user_defined
    connection.context.messages = base_messages_to_dict_messages(connection.agent_chat.messages)
    Context.save_context(connection.context)
```

`save_context` does a full-row DynamoDB `put_item` (`TokenStreamingServer/src/Models/Context.py:343-347`, `TokenStreamingServer/src/AWS/DynamoDB.py:53-57`).

**Consequence documented by the code:** if a turn runs many tool calls and never reaches the final content message — or the turn is interrupted (exception, disconnect, or the client's 30 s timeout while the server keeps working) — the handler's terminal `save_context` is never reached, so **none of that turn's messages (AI tool-call messages, tool responses, or partial text) are persisted**. The same single-save pattern is used by the other turn-producing handlers: `send_first_message` (`TokenStreamingServer/src/handlers/connect_to_context.py:175-177`) and `client_side_tool_responses` (`TokenStreamingServer/src/handlers/client_side_tool_responses.py:87-88`).

This is the same underlying long-turn scenario as Issue 1: a long tool-call chain both (a) delays the RPC reply past 30 s and (b) delays the only persistence write until the very end.

### Issue 3 — Preamble text merged with post-tool-call text into one bubble

**Client-side merge rule (keyed by `response_id`).** In the SDK store, `on_token` appends to a single `pendingResponse` buffer when the incoming `response_id` matches the buffer; otherwise it starts a new buffer:

```349:366:packages/chat/src/stores/currentContextStore.ts
      client.on('on_token', ({ token, response_id }) => {
        if (isStale()) return;
        const current = get().pendingResponse;
        if (!current || current.responseId !== response_id) {
          set({ pendingResponse: { responseId: response_id, text: token }, status: 'streaming' });
        } else {
          set({ pendingResponse: { responseId: response_id, text: current.text + token }, status: 'streaming' });
        }
      });
```

**Commit rule (one bubble per `on_stop_token`).** `on_stop_token` flushes the current buffer into exactly one new `TextMessage`:

```368:388:packages/chat/src/stores/currentContextStore.ts
      client.on('on_stop_token', ({ response_id }) => {
        if (isStale()) return;
        const pending = get().pendingResponse;
        if (pending && pending.responseId === response_id && pending.text) {
          const aiMessage: TextMessage = { kind: 'text', localId: uid('msg'), sender: 'ai', content: pending.text, responseId: response_id, createdAt: Date.now() };
          set({ messages: [...get().messages, aiMessage], pendingResponse: null, status: 'connected' });
        } else {
          set({ pendingResponse: null, status: 'connected' });
        }
      });
```

**Server emits one `response_id` and one `on_stop_token` for the whole turn.** In `add_message.py:34-44`, a single `response_id` is generated and used for every `on_token` across the entire recursive turn, and `on_stop_token` is sent once, after the loop. On the server, the content path streams preamble text, then executes tools, then recurses and **forwards the recursive generator's tokens through the same generator** (`TokenStreamingServer/src/LLM/TokenStreamingAgentChat.py:171-177`). So preamble tokens and final-answer tokens are emitted as one continuous `on_token` stream under one `response_id`.

**Net effect on the UI:** because preamble and final text share one `response_id` and there is only one `on_stop_token`, the client concatenates them into a single `pendingResponse` buffer and commits **one** AI bubble. The only interleaving signal is that `on_tool_call`/`on_tool_response` arrive between the text segments and are pushed as separate `tool_call`/`tool_response` messages (`currentContextStore.ts:390-425`). Tool-call messages are appended to the `messages` array immediately, while the surrounding text stays in the single pending buffer until the final `on_stop_token` — which is why the finished bubble shows text that spans before and after the tool calls.

**Server persists the segments separately even though the stream doesn't split them.** On the persistence side the server does append the streamed text and the tool-call message as distinct `AIMessage`s (`TokenStreamingAgentChat.py:153-170`), so the split exists in stored history; it just isn't reflected as separate `response_id`/`on_stop_token` boundaries in the live stream.

**Where the desired split would be implemented:** either (a) `TokenStreamingServer` emits a new `response_id` and an `on_stop_token` per text segment (before/after each tool-call batch), or (b) `ajentify-chat` flushes the current `pendingResponse` buffer into a committed bubble when an `on_tool_call` arrives, then starts a fresh buffer for subsequent tokens. Both surfaces are documented above.

**Rendering path for reference:** the pending buffer is rendered as a synthetic trailing AI message by `ChatMessages.tsx:93-107`; committed messages render through `Message.tsx:102-137` (`TypingText` while streaming, `Markdown` when finalized).

### Issue 4 — Tool-call UI (shimmer, dropdown, params/response, JSON)

**Current tool-call rendering is a single inline label.** `ajentify-chat/packages/chat/src/components/Message.tsx:71-86`:

```71:86:packages/chat/src/components/Message.tsx
  if (message.kind === 'tool_call') {
    return (
      <div className={cn('aj-tool-call', classNames?.toolBubble)}>
        <Wrench aria-hidden />
        <span>
          {toolRunning ? 'Running ' : 'Called '}
          <span className="aj-tool-call-name">{message.toolName}</span>
          {toolRunning ? (
            <span className="aj-tool-call-status"><Loader2 className="aj-spin" aria-hidden /></span>
          ) : null}
        </span>
      </div>
    );
  }
```

Current state vs. desired:
- **Shimmer:** none. The only animation is `Loader2` with `aj-spin` (a 1 s rotation). `ajentify-chat/packages/chat/src/styles.css` has keyframes `aj-slide-in-right`, `aj-slide-out-right`, `aj-fade-in`, `aj-blink`, `aj-dot-bounce`, `aj-spin`, `aj-toast-in` — **no shimmer keyframe** exists yet (`styles.css:202-226`, `:760`). Tool-call styles are at `styles.css:625-641`.
- **Dropdown / expansion:** none. The row is flat and non-interactive.
- **Call parameters:** `message.toolInput` exists on the `ToolCallMessage` but is **never rendered**.
- **Response:** `tool_response` messages render `null` (`Message.tsx:88-92`, comment: "Tool responses are intentionally collapsed to avoid noise"). The `tool_response` message stores `toolOutput` (`types/index.ts:67-74`) but it is not shown, and it is a **separate message** from the `tool_call` (not attached to it).
- **JSON detection/formatting:** none anywhere in the render path. AI text goes straight to `ReactMarkdown`; `toolInput`/`toolOutput` are never formatted. `JSON.parse`/`stringify` usages in the SDK are all for transport/persistence, not display.

**The data needed for the desired UX already arrives on the client.** The tool input and output both flow over the wire and into the store:

```43:56:packages/chat/src/ws/TokenStreamingClient.ts
  on_tool_call: (params: { tool_call_id: string; tool_name: string; tool_input: Record<string, unknown>; }) => void;
  on_tool_response: (params: { tool_call_id: string; tool_name: string; tool_output: string; }) => void;
```

- `on_tool_call` → pushes a `tool_call` message carrying `toolInput` (`currentContextStore.ts:390-408`).
- `on_tool_response` → pushes a separate `tool_response` message carrying `toolOutput` (`currentContextStore.ts:410-425`).
- The two are correlated by `toolCallId` (already used to compute the "running" state in `ChatMessages.tsx:187-193`).

The server produces these via the `on_tool_call`/`on_tool_response` callbacks (`TokenStreamingServer/src/handlers/connect_to_context.py:88-109`), fired from `_process_tool_calls` (`TokenStreamingAgentChat.py:236-272`).

**Message data model (for reference):** `ajentify-chat/packages/chat/src/types/index.ts:40-74` defines `TextMessage`, `ToolCallMessage` (`toolInput: Record<string, unknown>`), and `ToolResponseMessage` (`toolOutput: string`), unified as `ChatMessage` (`types/index.ts:76`).

## Code References

**ajentify-web**
- `ajentify-web/src/components/blocks/agent-chat-session-dialog.tsx:104-114` — SDK config for the test chat; `onError` uses the `[agent-chat]` tag; no `requestTimeoutMs` override.
- `ajentify-web/src/components/blocks/agent-chat-session-dialog.tsx:53-88` — proxy handlers: `create_context`, `generate_access_token`, `get_context`.
- `ajentify-web/src/app/(dashboard)/app/agents/[agent_id]/page.tsx:454-456,1004-1025` — realtime-vs-chat selection and dialog mounting.
- `ajentify-web/src/lib/session/start-agent-session.ts:43-58` — TSS URL derivation (`NEXT_PUBLIC_TOKEN_STREAMING_URL` → `${base}/ws`).
- `ajentify-web/.env.local:1-5` — `NEXT_PUBLIC_TOKEN_STREAMING_URL` is commented out ⇒ SDK prod-default TSS is used even though the REST API points at staging.
- `ajentify-web/node_modules/@ajentify/chat/dist/index.js:39` — built SDK default `requestTimeoutMs ?? 3e4`.

**ajentify-chat (SDK source; published as `@ajentify/chat`)**
- `ajentify-chat/packages/chat/src/ws/TokenStreamingClient.ts:214-216` — `addMessage` → `call('add_message', ...)` (awaits reply).
- `ajentify-chat/packages/chat/src/ws/TokenStreamingClient.ts:237-264` — generic `call` with `requestTimeoutMs` timer producing the error string.
- `ajentify-chat/packages/chat/src/ws/TokenStreamingClient.ts:38-61,392-431` — event types + incoming frame dispatch (reply vs notification).
- `ajentify-chat/packages/chat/src/stores/currentContextStore.ts:349-366` — `on_token` append-vs-new (keyed by `response_id`).
- `ajentify-chat/packages/chat/src/stores/currentContextStore.ts:368-388` — `on_stop_token` commits one bubble.
- `ajentify-chat/packages/chat/src/stores/currentContextStore.ts:390-425` — `on_tool_call`/`on_tool_response` push separate messages.
- `ajentify-chat/packages/chat/src/components/ChatMessages.tsx:93-107,187-193` — synthetic pending bubble; `toolRunning` derivation.
- `ajentify-chat/packages/chat/src/components/Message.tsx:71-92,102-137` — tool-call label, `null` tool_response, text rendering.
- `ajentify-chat/packages/chat/src/types/index.ts:40-76` — message data model.
- `ajentify-chat/packages/chat/src/styles.css:202-226,625-641,760` — animations (no shimmer) and tool-call styles.

**TokenStreamingServer (token-streaming-server)**
- `TokenStreamingServer/src/handlers/add_message.py:7-69` — full `add_message` flow (reply deferred to end; single `save_context`).
- `TokenStreamingServer/src/lib/JSONRPCPeer.py:22-90` — JSON-RPC transport; reply sent after handler returns.
- `TokenStreamingServer/src/LLM/TokenStreamingAgentChat.py:94-201` — recursive `invoke()` loop (no intermediate persistence).
- `TokenStreamingServer/src/LLM/TokenStreamingAgentChat.py:203-275` — `_process_tool_calls` (fires `on_tool_call`/`on_tool_response`, appends `ToolMessage`s in memory).
- `TokenStreamingServer/src/LLM/TokenStreamingAgentChat.py:153-178` — content path: streams preamble text, appends separate tool-call AIMessage, recurses forwarding tokens under same generator.
- `TokenStreamingServer/src/Models/Context.py:343-347` — `save_context` (full-row `put_item`).
- `TokenStreamingServer/src/AWS/DynamoDB.py:53-57` — `put_item` primitive.
- `TokenStreamingServer/src/handlers/connect_to_context.py:88-109,175-177` — tool-call/response callbacks; `send_first_message` single save.
- `TokenStreamingServer/src/handlers/client_side_tool_responses.py:87-88` — single save at end.
- `TokenStreamingServer/src/docs/WEBSOCKET_API.md:150-191,318-471` — documented `add_message` + notification protocol.

## Cross-repo touch points

- **Chat WebSocket:** `ajentify-web` derives `${NEXT_PUBLIC_TOKEN_STREAMING_URL}/ws` and hands it to the `@ajentify/chat` SDK, which opens the socket to `TokenStreamingServer`'s `/ws` endpoint (`TokenStreamingServer/src/app.py:60-75`). With the env var commented out, the SDK prod default `wss://token-streaming-server.prod.token-streaming.ajentify.com/ws` is used.
- **JSON-RPC protocol boundary:** `ajentify-chat`'s `TokenStreamingClient` (client) ↔ `TokenStreamingServer`'s `JSONRPCPeer` (server). Client → server calls: `connect_to_context`, `add_message`, `client_side_tool_responses`. Server → client notifications: `on_token`, `on_stop_token`, `on_tool_call`, `on_tool_response`, `on_client_side_tool_calls`, `on_events`, `agent_connected`.
- **Timeout boundary (Issue 1):** the 30 s timer lives in `ajentify-chat`; the duration it measures is `TokenStreamingServer`'s whole-turn processing time. Neither the app nor the server currently sends an early ack for `add_message`.
- **REST boundary (session setup):** `ajentify-web` calls the platform REST API (`/context`, `/generate-api-key`) to create a context and mint a client-scoped token; the token is passed to `connect_to_context` over the socket.
- **Persistence boundary (Issue 2):** only `TokenStreamingServer` writes messages, to DynamoDB, once per turn at the end. The frontend/SDK do not persist history; they hydrate it via `get_context`.

## Architecture Documentation

- **Streaming protocol:** JSON-RPC-like over WebSocket. Requests with an `id` expect a `{id, result}` reply; requests without an `id` are fire-and-forget notifications. Server→client streaming uses fire-and-forget notifications (`on_token`, etc.), while `add_message` itself is an id-bearing request whose reply is deferred until the turn completes.
- **Turn lifecycle:** `add_message` → refresh context from DynamoDB → `invoke()` recursion (LLM stream + tool execution) → stream `on_token`s → one `on_stop_token` → `save_context` → RPC reply. A single `response_id` spans the whole turn.
- **Client state machine:** Zustand store (`currentContextStore.ts`) maps stream events to a `messages[]` array plus a single `pendingResponse` buffer; statuses include `connecting`, `connected`, `streaming`, `awaiting_tool_responses`, etc. Bubble boundaries are defined solely by `response_id` changes and `on_stop_token`.
- **Rendering:** `ChatMessages.tsx` renders committed messages plus a synthetic pending bubble; `Message.tsx` renders text via `ReactMarkdown` (or `TypingText` while streaming), tool calls as an inline label, and hides tool responses.
- **Persistence model:** whole-context `put_item` to DynamoDB; intermediate turn state is in-memory only until the terminal save.
- **App integration:** `ajentify-web` mounts the SDK with minimal config (mostly SDK defaults), which is why RPC timeout and rendering behavior are governed by `ajentify-chat`.

## Related Research

None found. This is the first document in `ajentify-web/Prompts/research/`. Sibling repos use the same convention (e.g. `Ajentify/ajentify-app/Prompts/research/`).

## Open Questions

These are the decisions to resolve before planning fixes (the research above shows both the frontend and server surfaces involved in each):

1. **Issue 1 (timeout) — which surface owns the fix?** Options implied by the code: (a) have `TokenStreamingServer` send an early ack/reply for `add_message` so the RPC resolves quickly and streaming continues via notifications; (b) make the SDK treat `add_message` as fire-and-forget (`awaitResponse: false`) and rely on `on_stop_token`; (c) raise `requestTimeoutMs` (app can pass it in `agent-chat-session-dialog.tsx`). Which contract is desired?
2. **Issue 2 (persistence) — where should incremental saving happen?** The only writer is `TokenStreamingServer`. Should `save_context` be called inside the `invoke()`/`_process_tool_calls` loop (per tool round), and how should partial/interrupted turns be handled to avoid inconsistent history?
3. **Issue 3 (preamble split) — server-driven or client-driven?** Either the server emits per-segment `response_id`/`on_stop_token` boundaries (before/after each tool-call batch), or the client flushes the pending buffer on `on_tool_call`. Which layer should own message segmentation?
4. **Issue 4 (tool-call UI) — attach response to the call?** The desired dropdown needs the `tool_response` (`toolOutput`) correlated to the `tool_call` (`toolInput`) by `toolCallId`. Should the SDK attach the response onto the tool-call message (vs. keeping them separate), and what is the JSON-detection rule (attempt `JSON.parse` of `toolOutput`/`toolInput` and pretty-print on success)?
5. **Env alignment:** `ajentify-web/.env.local` points the REST API at **staging** but leaves the TSS at the **prod** SDK default (env var commented out). Is testing intended to hit prod TSS with staging-created contexts, or should a staging/local TSS URL be set?

## Decisions (2026-08-21)

Resolutions to the Open Questions above, to be carried into planning.

1. **Issue 1 (timeout) — make `add_message` fire-and-forget.** Send the `add_message` request **without an `id`** so the client does not await a reply and the 30 s RPC timer never applies. Replace the "await the whole turn" contract with explicit **message start / finish events that carry metadata**, so the client learns when each message begins and ends from notifications rather than from the RPC reply. (This dovetails with Decision 3: those start/finish events are the per-segment boundaries.)
   - Client surface: `ajentify-chat` (`TokenStreamingClient.addMessage` → `call('add_message', ..., { awaitResponse: false })`, plus handling for the new start/finish events).
   - Server surface: `TokenStreamingServer` `add_message` handler stops relying on its deferred return as the signal; emits start/finish notifications instead.

2. **Issue 2 (persistence) — save per round.** `TokenStreamingServer` should persist inside the `invoke()` loop after each tool round / each new message (not only once at the end), so a long tool-call chain or an interrupted turn still leaves saved history. (Selected: save per round.)

3. **Issue 3 (preamble split) — server-driven segmentation.** The server emits a **new `response_id` and message start/finish boundary per text segment** (before/after each tool-call batch), so preamble text and final text become distinct bubbles. This reuses the same start/finish event mechanism introduced in Decision 1. Client keeps its existing "new `response_id` ⇒ new buffer" rule, which will then naturally split the bubbles.

4. **Issue 4 (tool-call UI) — full treatment.** Tool-call rows should **shimmer while running** and provide a **dropdown** showing call **parameters and response**, with the value **pretty-printed as JSON when detected** (attempt `JSON.parse`; fall back to raw text on failure). Implemented in `ajentify-chat` (`Message.tsx` + `styles.css`, new shimmer keyframe).

5. **Issue 4 (data model) — attach response to the tool-call message.** The SDK should correlate `on_tool_response` (`toolOutput`) onto the matching `tool_call` message by `toolCallId`, producing a single expandable item that holds both `toolInput` and `toolOutput` (rather than two separate messages). Update the message model in `ajentify-chat/packages/chat/src/types/index.ts` and the `on_tool_response` store handler.

6. **Env alignment — point testing at a local TSS.** For testing, set `NEXT_PUBLIC_TOKEN_STREAMING_URL` in `ajentify-web/.env.local` to a **localhost** instance of `TokenStreamingServer` (so both frontend changes and server-side changes above can be exercised end-to-end locally).
