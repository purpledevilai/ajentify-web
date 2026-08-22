---
date: 2026-08-21
topic: "Agent chat testing fixes: beta streaming protocol (fire-and-forget add_message + per-segment messages), per-round persistence, tool-call data model, shimmering tool-call dropdown UI"
research: Prompts/research/2026-08-21-agent-chat-issues.md
repos_touched: [TokenStreamingServer, ajentify-chat, ajentify-web]
status: ready
---

# Agent Chat Testing Fixes — Implementation Plan

## Overview

Fix the four issues surfaced while testing agents from the `ajentify-web` per-agent chat dialog:

1. `RPC 'add_message' timed out after 30000ms` — the client awaits a JSON-RPC reply that the server only sends after the whole turn finishes.
2. Messages are only persisted once, at the very end of the turn — long tool-call chains (or interrupted turns) lose everything.
3. Preamble text and post-tool-call/final text are merged into one bubble — the whole turn uses one `response_id` and one `on_stop_token`.
4. Tool-call rows are a flat inline label — no shimmer, no dropdown, no params/response, no JSON formatting.

Per the research **Decisions** section, the streaming-protocol changes (issues 1 + 3) and per-round persistence (issue 2) are delivered behind a **`beta` opt-in flag** so the existing (classic) path is untouched and already-deployed clients keep working. The tool-call data-model + UI changes (issues 4 + 5) are pure client-side rendering improvements and apply regardless of protocol.

## Execution Notes (read first)

For anyone (including a fresh-context agent) picking this up:

- **This plan is self-contained and is the source of truth.** For the "why", the supporting file:line evidence, and the resolved design questions, see `Prompts/research/2026-08-21-agent-chat-issues.md` (its **Decisions (2026-08-21)** section). You should not need any prior chat context.
- **Repos are siblings** under `/Users/keanuinterone/Projects/Ajentify/`: `TokenStreamingServer/`, `ajentify-chat/` (SDK source in `packages/chat/`), `ajentify-web/`. Line numbers below reflect the code as of 2026-08-21 — re-grep before editing in case they drifted.
- **Do the phases in order** (server → SDK client → SDK UI → app wiring); later phases depend on earlier ones.
- **Hard invariant: never change classic behavior.** All server-side streaming/persistence changes are gated on `connection.beta`; the SDK protocol changes are gated on the `beta` option. A client that does not send `beta: true` must behave exactly as before.
- **SDK build step matters:** `ajentify-web` consumes `@ajentify/chat` from `dist/`. After any SDK source edit you must rebuild (`cd ajentify-chat/packages/chat && npm run build`, or run `npm run dev` in watch mode) for the app to see it.
- **Pause at each phase's "Implementation Note"** for manual confirmation before moving on.

## Current State Analysis

The feature spans one pipeline across three repos:

- **`ajentify-web`** mounts `@ajentify/chat` with minimal config (`src/components/blocks/agent-chat-session-dialog.tsx:104-114`) and consumes the SDK from the registry (`@ajentify/chat@^0.3.2`, `ajentify-web/package.json:16`). The Token Streaming Server URL is derived from `NEXT_PUBLIC_TOKEN_STREAMING_URL` (`src/lib/session/start-agent-session.ts:47-58`), which is currently **commented out** (`.env.local:5`) so the SDK's prod default is used.
- **`ajentify-chat`** (source in `packages/chat`) owns the WebSocket JSON-RPC client (`src/ws/TokenStreamingClient.ts`), the streaming→message state machine (`src/stores/currentContextStore.ts`), and all rendering (`src/components/Message.tsx`, `ChatMessages.tsx`). Config flows: `AjentifyProvider` (`src/provider/AjentifyProvider.tsx:255-276`) → `createStores` (`src/stores/createStores.ts:42-64`) → `createCurrentContextStore` (`currentContextStore.ts:165-298`) → `TokenStreamingClient` → `connect_to_context` params.
- **`TokenStreamingServer`** owns the JSON-RPC transport (`src/lib/JSONRPCPeer.py`), the recursive LLM/tool loop (`src/LLM/TokenStreamingAgentChat.py`), and DynamoDB persistence (`src/Models/Context.py:343-347`).

### Key Discoveries

- **Timeout is whole-turn, not connection-level.** `TokenStreamingClient.call` defaults `awaitResponse: true` and starts a 30 s timer (`TokenStreamingClient.ts:242,252-260`); `add_message` uses it (`:214-216`). The server's `JSONRPCPeer` only replies **after the handler returns** (`JSONRPCPeer.py:76-81`), and `add_message` doesn't return until the whole streamed turn + `save_context` completes (`add_message.py:40-53`). `client_side_tool_responses.py:69-88` has the identical pattern.
- **No handler `try/except` for id-less (notification) requests.** `JSONRPCPeer.handle_message` runs id-less handlers with `await handler(**params)` and no error path (`JSONRPCPeer.py:72-74`). So going fire-and-forget means we must surface turn errors with an explicit `on_error` notification.
- **Persistence is a single terminal write.** The recursive `invoke()` loop appends to `self.messages` only (`TokenStreamingAgentChat.py:94-201`, `_process_tool_calls` `:203-275`); the only write is the handler's terminal `save_context` (`add_message.py:49-53`). `TokenStreamingAgentChat` has no `Context`/`Connection` reference, so per-round saving needs a callback wired where the other callbacks (`on_tool_call`/`on_tool_response`) are wired: `connect_to_context.py:88-134`.
- **One flat token stream hides segment boundaries.** The content path streams preamble text, appends it as an `AIMessage`, appends a separate tool-call `AIMessage`, runs tools, then recurses and **forwards recursive tokens through the same generator** (`TokenStreamingAgentChat.py:127-178`). The handler sees a flat `str` stream and can't tell where segments end. The store already starts a new buffer on a new `response_id` (`currentContextStore.ts:349-366`) and commits one bubble per `on_stop_token` (`:368-388`) — so emitting a fresh `response_id` per segment plus per-segment stop boundaries splits bubbles naturally.
- **Tool input/output already reach the client but as two separate messages.** `on_tool_call` pushes a `tool_call` with `toolInput` (`currentContextStore.ts:390-408`); `on_tool_response` pushes a separate `tool_response` with `toolOutput` (`:410-425`). `Message.tsx:71-92` renders the call as a flat label and returns `null` for responses. No shimmer keyframe exists (`styles.css:202-224`).
- **Local TSS runs on port 8084** (`scripts/start_container.sh:5`) and reads config from `.env` (needs `JWT_SECRET` and AWS/DynamoDB access). The `/ws` chat endpoint registers `connect_to_context`, `add_message`, `client_side_tool_responses`, etc. (`src/app.py:60-69`). `Connection` (`src/lib/Connection.py:10-20`) holds `context` + `agent_chat`; we add a `beta` flag there.

## Desired End State

With the beta path enabled end-to-end (local TSS + locally-linked beta SDK + `ajentify-web` opting in via `beta: true` and a local TSS URL):

- Sending a chat message never triggers a client-side RPC timeout, no matter how long the turn runs or how many tool calls it makes.
- Every tool round is persisted as it happens; killing/refreshing mid-turn leaves the already-completed tool calls and text in the saved context.
- Preamble text renders as its own finished bubble, the tool-call rows appear beneath it, and any later/final text renders as a separate bubble.
- Tool-call rows shimmer while running and expand to show pretty-printed parameters and response (JSON pretty-printed when detected, raw text otherwise).
- The classic (non-beta) path behaves exactly as before for any client that does not send `beta: true`.

## What We're NOT Doing

- Not changing the realtime/voice pipeline (`/ws-realtime`, `connect_to_realtime_context`, `media-stream-realtime`).
- Not removing or altering the classic `TokenStreamingAgentChat` streaming/persistence behavior — the beta path is additive and gated.
- Not deploying the beta protocol to production TSS or publishing a new `@ajentify/chat` to the registry in this plan (local end-to-end only; production rollout is a follow-up — see Migration Notes).
- Not migrating already-persisted contexts or changing the DynamoDB schema.
- Not adding streaming of `toolInput` deltas — tool input arrives whole via `on_tool_call`.
- Not building a generic "resume an interrupted turn" feature; per-round persistence just means the saved history is consistent up to the last completed round.

## Implementation Approach

Dependency order is **server → SDK client → SDK UI → app wiring**, because the SDK's new event handlers depend on the server emitting the new notifications, and the app depends on the SDK exposing the `beta` config option.

The **beta streaming protocol** (server↔client contract) is:

- Client → server: `connect_to_context` gains a `beta: boolean` param. When `true`, the server routes to `TokenStreamingAgentChatBeta` and the beta handlers; `add_message` and `client_side_tool_responses` are sent **fire-and-forget** (no `id`).
- Server → client notifications (beta only), interleaved with the existing `on_tool_call`/`on_tool_response`:
  - `on_message_start { response_id }` — a new assistant text segment begins (fresh `response_id`).
  - `on_token { token, response_id }` — token for the current segment (unchanged shape).
  - `on_stop_token { response_id }` — the current text segment is complete (commit that bubble). Now emitted **per segment**, not once per turn.
  - `on_turn_complete { response_id? }` — the entire turn (all segments + tools + recursion) finished; re-enable input.
  - `on_error { message }` — the turn failed server-side (replaces the RPC error reply lost by going fire-and-forget).
- Turn pause for client-side tools is unchanged: instead of `on_turn_complete`, the server sends `on_client_side_tool_calls`; the turn resumes on `client_side_tool_responses`.

**Per-round persistence** is delivered via a new inert `on_progress_save` hook on the base agent class, invoked at the end of `_process_tool_calls`, and wired (beta only) in `connect_to_context`.

---

## Phase 1: TokenStreamingServer — Beta streaming protocol + per-round persistence

### Overview
Add a beta agent-chat class that yields structured segment events and supports per-round saving, a `beta` flag on the connection, beta routing in `connect_to_context`, and beta variants of the three turn-producing handlers that emit the new notifications and are resilient to fire-and-forget (wrapped in `try/except` → `on_error`).

### Changes Required

#### 1. Inert per-round save hook on the base agent
**File**: `TokenStreamingServer/src/LLM/TokenStreamingAgentChat.py`
**Changes**: Add an optional `on_progress_save` async callback stored in `__init__` and invoked at the end of `_process_tool_calls`. No behavior change when it's `None` (classic path).

```python
# __init__ signature — add parameter and store it
def __init__(
    self,
    llm: BaseChatModel,
    prompt: str,
    tools: List[AgentTool] = None,
    messages: List[BaseMessage] = [],
    context: dict = {},
    on_tool_call: Optional[Callable[[str, str, dict], Awaitable[None]]] = None,
    on_tool_response: Optional[Callable[[str, str, str], Awaitable[None]]] = None,
    on_response: Optional[Callable] = None,
    on_progress_save: Optional[Callable[[], Awaitable[None]]] = None,  # NEW
    prompt_arg_names: List[str] = [],
):
    ...
    self.on_progress_save = on_progress_save  # NEW
```

```python
# end of _process_tool_calls, after the tool loop and client_side handling
        if client_side_calls:
            self.pending_client_side_tool_calls = client_side_calls

        # Persist progress after every tool round so long tool-call chains and
        # interrupted turns still leave consistent saved history.
        if self.on_progress_save:
            try:
                await self.on_progress_save()
            except Exception as e:
                print(f"[on_progress_save] failed: {e}")
```

#### 2. Beta agent chat class (structured-event generator)
**File**: `TokenStreamingServer/src/LLM/TokenStreamingAgentChatBeta.py` (new)
**Changes**: Subclass `TokenStreamingAgentChat`, overriding only `invoke` so the content path yields structured events instead of raw strings. Tool execution / persistence / recursion logic is inherited (`_process_tool_calls`, `add_human_message_and_invoke`, `_chunk_to_ai_message`, `_refresh_data_windows`). The yielded event dicts are `{"type": "message_start"}`, `{"type": "token", "token": str}`, `{"type": "message_end"}`.

```python
from LLM.TokenStreamingAgentChat import TokenStreamingAgentChat
from LLM.ContentNormalizer import normalize_content
from langchain_core.messages import AIMessage


class TokenStreamingAgentChatBeta(TokenStreamingAgentChat):
    """Beta variant. Identical tool/persistence semantics as the base class,
    but `invoke()` yields structured segment events so the handler can emit
    per-segment `on_message_start` / `on_token` / `on_stop_token` boundaries."""

    async def invoke(self, load_data_windows: bool = True):
        self.should_abort_invocation = False
        self.is_generating = True

        if load_data_windows:
            self._refresh_data_windows()

        accumulated_response = None
        try:
            response_generator = self.prompt_chain.astream({"messages": self.messages})
        except Exception:
            self.is_generating = False
            raise

        try:
            async for chunk in response_generator:
                accumulated_response = chunk if accumulated_response is None else accumulated_response + chunk

                # Content path — only if there is actual user-facing text.
                if normalize_content(chunk.content):
                    on_response_cb = self.on_response

                    async def async_response_generator():
                        nonlocal accumulated_response
                        ai_message = ''

                        yield {"type": "message_start"}
                        first_text = normalize_content(chunk.content)
                        ai_message += first_text
                        yield {"type": "token", "token": first_text}

                        async for res_chunk in response_generator:
                            if self.should_abort_invocation:
                                break
                            accumulated_response = accumulated_response + res_chunk
                            chunk_text = normalize_content(res_chunk.content)
                            if chunk_text:
                                ai_message += chunk_text
                                yield {"type": "token", "token": chunk_text}

                        self.is_generating = False

                        if self.should_abort_invocation:
                            self.should_abort_invocation = False
                            yield {"type": "message_end"}
                            return

                        if on_response_cb:
                            on_response_cb(accumulated_response)

                        self.messages.append(AIMessage(
                            content=ai_message,
                            usage_metadata=accumulated_response.usage_metadata if not accumulated_response.tool_calls else None,
                            response_metadata=accumulated_response.response_metadata,
                            id=accumulated_response.id,
                        ))

                        # Segment complete (preamble or final).
                        yield {"type": "message_end"}

                        if accumulated_response.tool_calls:
                            self.messages.append(AIMessage(
                                content='',
                                tool_calls=accumulated_response.tool_calls,
                                usage_metadata=accumulated_response.usage_metadata,
                                response_metadata=accumulated_response.response_metadata,
                                additional_kwargs=accumulated_response.additional_kwargs,
                            ))
                            await self._process_tool_calls(accumulated_response.tool_calls)  # fires callbacks + on_progress_save
                            if not self.pending_client_side_tool_calls:
                                recursive_gen = await self.invoke(load_data_windows=True)
                                if recursive_gen:
                                    async for ev in recursive_gen:
                                        yield ev

                    return async_response_generator()

        except Exception:
            self.is_generating = False
            raise

        # Tool-only path — no text streamed this round.
        if not accumulated_response or not accumulated_response.tool_calls:
            self.is_generating = False
            return None

        if self.on_response:
            self.on_response(accumulated_response)

        self.messages.append(self._chunk_to_ai_message(accumulated_response))
        await self._process_tool_calls(accumulated_response.tool_calls)  # fires callbacks + on_progress_save
        if self.pending_client_side_tool_calls:
            self.is_generating = False
            return None
        return await self.invoke(load_data_windows=True)
```

#### 3. `beta` flag on the connection
**File**: `TokenStreamingServer/src/lib/Connection.py`
**Changes**: Add `self.beta = False` in `__init__` (after `agent_chat`).

```python
        self.agent_chat: TokenStreamingAgentChat = None
        self.beta: bool = False  # NEW — set by connect_to_context(beta=...)
```

#### 4. Beta routing + per-round save wiring in `connect_to_context`
**File**: `TokenStreamingServer/src/handlers/connect_to_context.py`
**Changes**: Accept `beta: bool = False`; store on the connection; when beta, build `TokenStreamingAgentChatBeta` with an `on_progress_save` callback; branch `send_first_message` on beta.

```python
from LLM.TokenStreamingAgentChatBeta import TokenStreamingAgentChatBeta  # NEW

async def connect_to_context(connection_id: str, context_id: str, access_token: str = None, beta: bool = False):
    ...
    connection.beta = beta  # NEW (set once we have the connection)
    ...
    # after tools/on_tool_call/on_tool_response are defined:
    if beta:
        async def on_progress_save():
            # Re-read user_defined so a tool's DB write isn't clobbered, then
            # persist the current message list.
            connection.context.user_defined = Context.get_context(connection.context.context_id).user_defined
            connection.context.messages = base_messages_to_dict_messages(connection.agent_chat.messages)
            Context.save_context(connection.context)

        agent_chat = TokenStreamingAgentChatBeta(
            create_llm(context.model_id, for_streaming=True),
            agent.prompt,
            messages=dict_messages_to_base_messages(context.messages),
            tools=tools,
            context=context_dict,
            on_tool_call=on_tool_call,
            on_tool_response=on_tool_response,
            on_response=build_tracking_callback(agent.org_id, context.model_id),
            on_progress_save=on_progress_save,
            prompt_arg_names=agent.prompt_arg_names if agent.prompt_arg_names else [],
        )
    else:
        agent_chat = TokenStreamingAgentChat( ...unchanged... )

    connection.context = context
    connection.agent_chat = agent_chat
    ...
    if generate_first_message:
        asyncio.create_task(send_first_message(connection))
```

`send_first_message` (same file) branches on `connection.beta`: beta consumes the event stream via the shared helper (below) and sends `on_turn_complete`/`on_client_side_tool_calls`; classic is unchanged.

#### 5. Shared beta emit helper
**File**: `TokenStreamingServer/src/handlers/beta_streaming.py` (new)
**Changes**: One helper that translates the beta event stream into notifications and returns the last `response_id`.

```python
import uuid
from lib.Connection import Connection


async def stream_beta_turn(connection: Connection, event_stream) -> str | None:
    """Translate the beta agent's structured event stream into on_message_start /
    on_token / on_stop_token notifications. Returns the last response_id used."""
    response_id = None
    if event_stream:
        async for ev in event_stream:
            etype = ev.get("type")
            if etype == "message_start":
                response_id = str(uuid.uuid4())
                await connection.peer.call(method="on_message_start", params={"response_id": response_id})
            elif etype == "token":
                await connection.peer.call(method="on_token", params={"token": ev["token"], "response_id": response_id})
            elif etype == "message_end":
                await connection.peer.call(method="on_stop_token", params={"response_id": response_id})
    return response_id
```

#### 6. Beta branch in `add_message`
**File**: `TokenStreamingServer/src/handlers/add_message.py`
**Changes**: If `connection.beta`, run the beta flow (fire-and-forget-safe: wrap in `try/except` → `on_error`, emit `on_turn_complete` when the turn truly ends). Classic body unchanged.

```python
from handlers.beta_streaming import stream_beta_turn  # NEW

async def add_message(connection_id: str, message: str):
    connection: Connection = CONNECTIONS[connection_id]
    if connection.beta:
        return await _add_message_beta(connection, message)
    # ---- existing classic body unchanged ----


async def _add_message_beta(connection: Connection, message: str):
    try:
        if connection.context is None:
            raise Exception("No context set for connection")
        if connection.agent_chat is None:
            raise Exception("No agent_chat set for connection")
        if message is None:
            raise Exception("No message provided")

        agent = connection.agent_chat
        connection.context = Context.get_context(connection.context.context_id)
        connection.context = Context.process_async_tool_response_queue(connection.context)
        agent.messages = dict_messages_to_base_messages(connection.context.messages)

        event_stream = await agent.add_human_message_and_invoke(message)
        response_id = await stream_beta_turn(connection, event_stream)

        # Terminal catch-all save (per-round saves already ran inside the loop).
        connection.context.user_defined = Context.get_context(connection.context.context_id).user_defined
        connection.context.messages = base_messages_to_dict_messages(agent.messages)
        Context.save_context(connection.context)

        if agent.pending_client_side_tool_calls:
            await connection.peer.call(
                method="on_client_side_tool_calls",
                params={"tool_calls": agent.pending_client_side_tool_calls, "response_id": response_id},
            )
        else:
            await connection.peer.call(method="on_turn_complete", params={"response_id": response_id})

        if agent.context.get("events"):
            await connection.peer.call(method="on_events", params={"events": agent.context["events"], "response_id": response_id})
            agent.context["events"] = []
    except Exception as e:
        print(f"[add_message beta] error: {e}")
        await connection.peer.call(method="on_error", params={"message": str(e)})
```

#### 7. Beta branch in `client_side_tool_responses`
**File**: `TokenStreamingServer/src/handlers/client_side_tool_responses.py`
**Changes**: Mirror the `add_message` beta branch — validate + append `ToolMessage`s (existing logic), then `event_stream = await agent.invoke()`, `stream_beta_turn(...)`, terminal save, then `on_client_side_tool_calls` (another round) or `on_turn_complete`, all wrapped in `try/except` → `on_error`. Classic body unchanged.

#### 8. Register-time note
**File**: `TokenStreamingServer/src/app.py`
**Changes**: None required — handlers are already registered by name (`app.py:65-69`); the beta branch lives inside them keyed on `connection.beta`. (`connect_to_context` gains the `beta` param via `**params` passthrough in `Connection.on` / `JSONRPCPeer`.)

### Success Criteria

#### Automated Verification:
- [x] Python imports/syntax OK: verified via `py_compile` on all edited files + a one-off container import of `handlers.add_message, handlers.client_side_tool_responses, handlers.connect_to_context, handlers.beta_streaming, LLM.TokenStreamingAgentChat, LLM.TokenStreamingAgentChatBeta` → `IMPORT_OK`.
- [x] Existing test suite: no `tests/` dir present — skipped.
- [x] Container starts (existing image + `src` volume mount + `--reload`) and `curl -s localhost:8084/health` returns `{"status":"ok","num_connections":0}`.

#### Manual Verification:
- [ ] With a WebSocket smoke client (or the beta SDK from Phase 4), `connect_to_context(..., beta=true)` succeeds and `add_message` streams `on_message_start`/`on_token`/`on_stop_token` per segment then `on_turn_complete`.
- [ ] A multi-tool turn writes to DynamoDB after each round (verify `updated_at` advances / messages grow mid-turn), not just at the end.
- [ ] A classic client (`beta` omitted) still gets the old single-`response_id`, single-`on_stop_token` behavior and a normal RPC reply.
- [ ] Forcing a server error mid-turn (e.g. bad tool) emits `on_error` rather than hanging.

**Implementation Note**: After this phase and all automated verification passes, pause for manual confirmation before proceeding.

---

## Phase 2: ajentify-chat — Beta protocol client

### Overview
Thread a `beta` option through the config → stores → client chain, send it in `connect_to_context`, make `add_message`/`client_side_tool_responses` fire-and-forget in beta, and add store/event handling for `on_message_start`, `on_turn_complete`, and `on_error`.

### Changes Required

#### 1. Client options + fire-and-forget + new events
**File**: `ajentify-chat/packages/chat/src/ws/TokenStreamingClient.ts`
**Changes**:
- Add `beta?: boolean` to `TokenStreamingClientOptions` and to the resolved `opts` (default `false`).
- Send `beta` in the `connect_to_context` params (`openAndConnectToContext`, `:288-291`).
- Make `addMessage` and `sendClientSideToolResponses` fire-and-forget when beta.
- Add the three new events to `TokenStreamingEvents` and dispatch them in `handleIncoming`.

```ts
export interface TokenStreamingEvents {
  ...
  on_message_start: (params: { response_id: string }) => void;      // NEW
  on_turn_complete: (params: { response_id?: string }) => void;     // NEW
  on_error: (params: { message: string }) => void;                  // NEW
}
```

```ts
// options + opts
requestTimeoutMs?: number;
beta?: boolean;              // NEW
// in constructor opts:
beta: options.beta ?? false,
```

```ts
// openAndConnectToContext
result = await this.call('connect_to_context', {
  context_id: this.opts.contextId,
  access_token: accessToken,
  beta: this.opts.beta,     // NEW
});
```

```ts
async addMessage(message: string): Promise<void> {
  await this.call('add_message', { message }, { awaitResponse: !this.opts.beta });
}

async sendClientSideToolResponses(toolResponses: ClientSideToolResponse[]): Promise<void> {
  await this.call('client_side_tool_responses', { tool_responses: toolResponses }, { awaitResponse: !this.opts.beta });
}
```

```ts
// handleIncoming notification switch — add cases
case 'on_message_start':
  this.emit('on_message_start', notification.params as never);
  break;
case 'on_turn_complete':
  this.emit('on_turn_complete', notification.params as never);
  break;
case 'on_error':
  this.emit('on_error', notification.params as never);
  break;
```

#### 2. Thread `beta` through the config chain
**Files**:
- `ajentify-chat/packages/chat/src/provider/AjentifyProvider.tsx` — add `beta?: boolean` to `AjentifyConfig` and pass `beta: config.beta` into `createStores` (`:255-274`).
- `ajentify-chat/packages/chat/src/stores/createStores.ts` — add `beta?` to `CreateStoresOptions` and forward to `createCurrentContextStore` (`:51-61`).
- `ajentify-chat/packages/chat/src/stores/currentContextStore.ts` — add `beta?: boolean` to `CurrentContextStoreOptions`; pass `beta: options.beta` when constructing `TokenStreamingClient` (`:291-298`).

#### 3. Store handlers for the new events + adjusted status machine
**File**: `ajentify-chat/packages/chat/src/stores/currentContextStore.ts`
**Changes**: Register new handlers; make `on_stop_token` keep `status: 'streaming'` in beta (turn continues), and let `on_turn_complete` finish the turn.

```ts
client.on('on_message_start', ({ response_id }) => {
  if (isStale()) return;
  set({ pendingResponse: { responseId: response_id, text: '' }, status: 'streaming' });
});
```

```ts
// on_stop_token: commit the segment bubble; DON'T force 'connected' in beta.
client.on('on_stop_token', ({ response_id }) => {
  if (isStale()) return;
  const pending = get().pendingResponse;
  if (pending && pending.responseId === response_id && pending.text) {
    const aiMessage: TextMessage = {
      kind: 'text', localId: uid('msg'), sender: 'ai',
      content: pending.text, responseId: response_id, createdAt: Date.now(),
    };
    set({
      messages: [...get().messages, aiMessage],
      pendingResponse: null,
      status: options.beta ? 'streaming' : 'connected',
    });
  } else {
    set({ pendingResponse: null, status: options.beta ? 'streaming' : 'connected' });
  }
});
```

```ts
client.on('on_turn_complete', () => {
  if (isStale()) return;
  set({ pendingResponse: null, status: 'connected' });
});

client.on('on_error', ({ message }) => {
  if (isStale()) return;
  const e = new AjentifyError(message, 'rpc');
  set({ status: 'error', error: message });
  emitError(e);
});
```

`sendMessage` needs no change: in beta, `await wsClient.addMessage()` resolves immediately (fire-and-forget), server-side failures now arrive via `on_error`, and the synchronous "WS not open" throw is still caught.

#### 4. Tests
**File**: `ajentify-chat/packages/chat/src/stores/currentContextStore.test.ts`
**Changes**: Add beta cases — `on_message_start`→`on_token`×N→`on_stop_token` twice under different `response_id`s yields two committed bubbles and stays `streaming` until `on_turn_complete`; `on_error` sets `status:'error'`. Keep existing classic assertions green.

### Success Criteria

#### Automated Verification:
- [x] Type check passes: `npm run typecheck` → clean.
- [x] Unit tests pass: `npm test` → 26 passed (incl. 3 new beta tests: connect sends `beta:true` + fire-and-forget `add_message`, two-segment split, `on_error`).
- [~] Lint: `eslint` is not installed in this environment (no binary/config) so `npm run lint` can't run; substituted IDE linter (`ReadLints`) on all edited files → no errors.
- [x] Build succeeds: `npm run build` → tsup build success.

#### Manual Verification:
- [ ] Against local beta TSS, sending a message shows preamble and final text as **separate** bubbles with tool rows between them.
- [ ] No `RPC 'add_message' timed out` error even on long/slow turns.
- [ ] Input re-enables only after `on_turn_complete` (not between segments).

**Implementation Note**: Pause for manual confirmation before proceeding.

---

## Phase 3: ajentify-chat — Tool-call data model + shimmering dropdown UI

### Overview
Attach the tool response onto the tool-call message (by `toolCallId`) so each tool call is one expandable item, then render it as a shimmering-while-running, expandable row showing pretty-printed params and response. Not beta-gated (works for classic and beta).

### Changes Required

#### 1. Data model
**File**: `ajentify-chat/packages/chat/src/types/index.ts`
**Changes**: Add `toolOutput?: string` to `ToolCallMessage` (`:54-64`). Keep `ToolResponseMessage` for backward compatibility but it is no longer emitted by live/hydration paths.

```ts
export interface ToolCallMessage {
  kind: 'tool_call';
  localId: string;
  toolCallId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput?: string;   // NEW — filled in when the response arrives
  clientSide?: boolean;
  createdAt: number;
}
```

#### 2. Merge responses onto the call (live + hydration)
**File**: `ajentify-chat/packages/chat/src/stores/currentContextStore.ts`
**Changes**:
- `on_tool_response` (`:410-425`): update the matching `tool_call` message in place instead of pushing a `tool_response`.
- `on_client_side_tool_calls` response handling (`:452-460`): merge `toolOutput` onto the matching `tool_call` instead of pushing `respMsgs`.
- `filteredMessagesToChatMessages` (`:129-163`): when a `tool_response` entry is encountered, set `toolOutput` on the previously-emitted `tool_call` with the same `tool_call_id` rather than emitting a separate message.

```ts
client.on('on_tool_response', (params) => {
  if (isStale()) return;
  set({
    messages: get().messages.map((m) =>
      m.kind === 'tool_call' && m.toolCallId === params.tool_call_id
        ? { ...m, toolOutput: params.tool_output ?? '' }
        : m
    ),
  });
});
```

#### 3. Running-state derivation
**File**: `ajentify-chat/packages/chat/src/components/ChatMessages.tsx`
**Changes**: Replace `respondedToolCallIds` (built from separate `tool_response` messages, `:112-118`) with "a tool_call is running when it has no `toolOutput`". Pass that to `Message` for the shimmer; keep `hideToolRunningIndicator` honored.

```ts
const toolRunning =
  !hideToolRunningIndicator && m.kind === 'tool_call' && !m.toolOutput;
```

#### 4. Expandable, shimmering tool-call renderer
**File**: `ajentify-chat/packages/chat/src/components/Message.tsx`
**Changes**: Replace the flat `tool_call` block (`:71-86`) with an expandable control (chevron + wrench + name, shimmer while running) and a details panel showing pretty-printed params and response. Add a JSON-pretty-print helper. `tool_response` continues to render `null`.

```tsx
import { Wrench, Loader2, ChevronRight, ChevronDown } from 'lucide-react';

function formatMaybeJson(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  const s = String(value);
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}

// inside Message(), replacing the tool_call branch:
if (message.kind === 'tool_call') {
  const running = toolRunning && !message.toolOutput;
  const [open, setOpen] = React.useState(false);
  const hasDetails =
    (message.toolInput && Object.keys(message.toolInput).length > 0) || message.toolOutput != null;
  return (
    <div className={cn('aj-tool-call', running && 'aj-tool-call--running', classNames?.toolBubble)}>
      <button
        type="button"
        className="aj-tool-call-header"
        onClick={() => hasDetails && setOpen((o) => !o)}
        aria-expanded={open}
        disabled={!hasDetails}
      >
        {hasDetails ? (open ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />) : <Wrench aria-hidden />}
        <span className={cn('aj-tool-call-label', running && 'aj-shimmer-text')}>
          {running ? 'Running ' : 'Called '}
          <span className="aj-tool-call-name">{message.toolName}</span>
        </span>
        {running ? <Loader2 className="aj-spin aj-tool-call-spin" aria-hidden /> : null}
      </button>
      {open && hasDetails ? (
        <div className="aj-tool-call-details">
          {message.toolInput && Object.keys(message.toolInput).length > 0 ? (
            <div className="aj-tool-call-section">
              <div className="aj-tool-call-section-title">Parameters</div>
              <pre className="aj-tool-call-pre">{formatMaybeJson(message.toolInput)}</pre>
            </div>
          ) : null}
          <div className="aj-tool-call-section">
            <div className="aj-tool-call-section-title">Response</div>
            <pre className="aj-tool-call-pre">
              {message.toolOutput != null ? formatMaybeJson(message.toolOutput) : 'Running…'}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

> Note: `React.useState` inside `Message` is safe because each message renders as its own component instance in the list; if lint flags conditional hook ordering, extract a small `ToolCallMessageView` component so hooks are unconditional.

#### 5. Shimmer keyframe + tool-call styles
**File**: `ajentify-chat/packages/chat/src/styles.css`
**Changes**: Add an `aj-shimmer` keyframe (near `:202-224`) and styles for the header/label/details/pre (replacing/extending `.aj-tool-call*` at `:625-641`).

```css
@keyframes aj-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.aj-shimmer-text {
  background: linear-gradient(
    90deg,
    var(--aj-muted-foreground) 0%,
    var(--aj-foreground) 20%,
    var(--aj-muted-foreground) 40%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: aj-shimmer 1.6s linear infinite;
}
.aj-tool-call-header {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--aj-muted-foreground);
  cursor: pointer;
}
.aj-tool-call-header:disabled { cursor: default; }
.aj-tool-call-header svg { width: 0.875rem; height: 0.875rem; flex-shrink: 0; }
.aj-tool-call-spin { width: 0.75rem; height: 0.75rem; }
.aj-tool-call-details {
  margin: 0.35rem 0 0.1rem 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.aj-tool-call-section-title {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--aj-muted-foreground);
  margin-bottom: 0.15rem;
}
.aj-tool-call-pre {
  font-family: var(--aj-font-mono);
  font-size: 0.75rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  background-color: color-mix(in oklab, var(--aj-muted) 80%, transparent);
  border-radius: 0.4rem;
  padding: 0.5rem 0.625rem;
  margin: 0;
  max-height: 16rem;
  overflow: auto;
}
```

### Success Criteria

#### Automated Verification:
- [x] Type check passes: `npm run typecheck` → clean.
- [x] Unit tests pass: `npm test` → 27 passed (added `on_tool_response` merge test).
- [~] Lint: `eslint` not installed in this environment; substituted IDE linter (`ReadLints`) on all edited files → no errors.
- [x] Build succeeds: `npm run build` → tsup build success.

#### Manual Verification:
- [ ] Tool-call rows shimmer while running and stop when the response arrives.
- [ ] Clicking a tool row expands params + response; JSON responses are pretty-printed, non-JSON shown raw.
- [ ] Hydrated (history) contexts show tool calls with their responses attached (no orphan/blank rows).

**Implementation Note**: Pause for manual confirmation before proceeding.

---

## Phase 4: ajentify-web — Local wiring & end-to-end verification

### Overview
Point the app at the local beta TSS, consume the locally-built beta SDK, and opt into the beta protocol.

### Changes Required

#### 1. Consume the local SDK build
**File**: `ajentify-web/package.json`
**Changes**: Repoint the dependency to the local package and reinstall.

```json
"@ajentify/chat": "file:../ajentify-chat/packages/chat"
```

Then: build the SDK (`cd ajentify-chat/packages/chat && npm run build`, or `npm run dev` to watch) and `cd ajentify-web && npm install`. The app consumes `dist/`, so rebuild the SDK after each change (watch mode recommended).

#### 2. Point the app at the local TSS
**File**: `ajentify-web/.env.local`
**Changes**: Set the TSS base URL to the local container (chat SDK appends `/ws` → `ws://localhost:8084/ws`).

```
NEXT_PUBLIC_TOKEN_STREAMING_URL=ws://localhost:8084
```

#### 3. Opt into the beta protocol
**File**: `ajentify-web/src/components/blocks/agent-chat-session-dialog.tsx`
**Changes**: Add `beta: true` to the provider `config` (`:104-114`) and its `useMemo` deps.

```tsx
const config = useMemo(
  () => ({
    onAjentifyProxyRequest,
    websocketUrl: chatWebsocketUrl(),
    agentSpeaksFirst,
    clientSideTools,
    themeBridge: "shadcn" as const,
    beta: true,                                   // NEW
    onError: (err: unknown) => console.error("[agent-chat]", err),
  }),
  [onAjentifyProxyRequest, agentSpeaksFirst, clientSideTools]
);
```

### Success Criteria

#### Automated Verification:
- [x] App type-checks with the linked SDK: `pnpm typecheck` → clean. Local `@ajentify/chat` linked via pnpm `file:` (symlink → local `dist/`). Dev server (`pnpm dev`) boots and serves 200s. (Full `next build` not run — heavy/prod-env; typecheck + dev compile stand in.)
- [~] Lint: `pnpm lint` reports only **pre-existing** `react-hooks/set-state-in-effect` errors in unrelated files (`mobile-sidebar.tsx`, `delete-stage-dialog.tsx`, etc.); the edited `agent-chat-session-dialog.tsx` is clean (`ReadLints` → no errors; 0 lint matches for that file).

#### Manual Verification:
- [ ] **Prerequisite:** local TSS `.env` uses the **same DynamoDB tables and `JWT_SECRET` as the staging REST API** (`NEXT_PUBLIC_API_BASE_URL=https://staging.api.ajentify.com`), so the context created via staging REST is readable by local TSS and the client token validates. Confirm `connect_to_context` succeeds (no 403 / "context not found").
- [ ] End-to-end in the per-agent chat dialog: no timeout error; preamble/final split into separate bubbles; tool rows shimmer + expand with params/response.
- [ ] Kill the local TSS mid-tool-chain, restart, reopen the context via history → previously-completed tool rounds are present (per-round persistence).
- [ ] Client-side tools still work (manual tool responder round-trips and the turn continues).
- [ ] Voice/realtime path is unaffected (smoke test one realtime session).

**Implementation Note**: This is the final phase; confirm all manual checks before closing out.

---

## Testing Strategy

### Unit Tests (ajentify-chat)
- Beta store: two-segment stream commits two bubbles; status stays `streaming` between `on_stop_token`s and flips to `connected` only on `on_turn_complete`; `on_error` → `status:'error'`.
- Classic store: unchanged single-bubble / single-`on_stop_token` → `connected` behavior still passes.
- `on_tool_response` merges `toolOutput` onto the matching `tool_call`; hydration attaches responses to calls.
- `formatMaybeJson`: object → pretty JSON; JSON string → pretty JSON; plain string → unchanged.

### Integration / Server
- If a TSS test harness exists, add a beta-path test: `connect_to_context(beta=true)` → `add_message` yields the expected notification sequence and writes context per round. Otherwise verify via the WebSocket smoke client in Phase 1 manual checks.

### Manual Testing Steps
1. Start local beta TSS (port 8084, staging DynamoDB + `JWT_SECRET`).
2. `npm run dev` the beta SDK watcher and `ajentify-web`.
3. Open a per-agent chat, send a message that triggers a preamble + multiple tool calls + a final answer.
4. Verify: no timeout, split bubbles, shimmering/expandable tool rows, per-round persistence after a mid-turn restart.

## Performance Considerations

- Per-round `save_context` adds one `get_context` (for `user_defined`) + one `put_item` per tool round. For long chains this is more DynamoDB traffic than the single terminal write, but it's bounded by round count and is the intended durability trade-off. The `get_context` re-read mirrors the existing terminal-save pattern (`add_message.py:49`).
- The beta event stream adds `on_message_start` per segment; negligible extra frames versus the token volume.

## Migration Notes

- **Backward compatibility is preserved by the `beta` flag.** Classic clients (no `beta`) keep the old contract (single `response_id`, single `on_stop_token`, id-bearing `add_message` reply, terminal-only save). The beta agent class, per-round save hook, and new notifications are additive.
- **Production rollout (follow-up, out of scope here):** deploy the beta-capable TSS first (safe — classic path unchanged), then publish a beta-capable `@ajentify/chat` version, then flip consumers to `beta: true`. Because segmentation emits multiple `response_id`s, an *old* SDK talking to a *beta-enabled* server would lose earlier segments — so only opt a client into `beta: true` once it runs the beta-capable SDK. The server only enters the beta path when the client sends `beta: true`, so mixed fleets are safe.
- **Local dependency repoint:** `ajentify-web/package.json` `file:` link and the `.env.local` TSS URL are local-testing changes; revert (or gate by environment) before shipping `ajentify-web` to staging/prod.

## References

- Research: `Prompts/research/2026-08-21-agent-chat-issues.md` (see the **Decisions (2026-08-21)** section)
- Timeout mechanism: `ajentify-chat/packages/chat/src/ws/TokenStreamingClient.ts:214-264`; `TokenStreamingServer/src/lib/JSONRPCPeer.py:72-90`
- Deferred reply / terminal save: `TokenStreamingServer/src/handlers/add_message.py:40-53`; `client_side_tool_responses.py:69-88`
- Recursive loop / segmentation source: `TokenStreamingServer/src/LLM/TokenStreamingAgentChat.py:94-201`
- Persistence primitive: `TokenStreamingServer/src/Models/Context.py:343-347`
- Streaming→message store: `ajentify-chat/packages/chat/src/stores/currentContextStore.ts:349-425`
- Tool-call rendering + styles: `ajentify-chat/packages/chat/src/components/Message.tsx:71-92`; `styles.css:202-224,625-641`
- App integration: `ajentify-web/src/components/blocks/agent-chat-session-dialog.tsx:104-114`; `src/lib/session/start-agent-session.ts:47-58`; `.env.local:5`
