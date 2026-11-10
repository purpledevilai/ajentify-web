import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

type Status =
  | "idle"
  | "draft"
  | "connecting"
  | "connected"
  | "streaming"
  | "awaiting_tool_responses"
  | "error"
  | "disconnected";

// `vi.mock` factories are hoisted above imports, so everything they close
// over has to be hoisted too.
const { router, nav, toast, sdk, agents } = vi.hoisted(() => {
  const router = { push: vi.fn(), replace: vi.fn() };
  const nav = { pathname: "/app/chat", search: "" };
  const toast = { error: vi.fn(), success: vi.fn() };
  // Controllable SDK state. Tests mutate `sdk` then `rerender()`.
  const sdk = {
    status: "idle" as Status,
    liveContextId: null as string | null,
    messages: [] as unknown[],
    agent: null as { agent_id: string; agent_name: string } | null,
    history: [] as unknown[],
    send: vi.fn(async () => {}),
    cancel: vi.fn(async () => ({ success: true, cancelled: true })),
    switchTo: vi.fn(async () => {}),
    createNew: vi.fn(async () => {}),
    clearCurrent: vi.fn(),
    deleteContext: vi.fn(async () => {}),
    load: vi.fn(async () => [] as unknown[]),
    ensureLoaded: vi.fn(async () => [] as unknown[]),
  };
  const agents = [
    { agent_id: "ag1", agent_name: "Concierge", model_id: "gpt" },
    { agent_id: "ag2", agent_name: "Voice bot", model_id: "rt" },
  ];
  return { router, nav, toast, sdk, agents };
});

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock("sonner", () => ({ toast }));

vi.mock("@ajentify/chat", () => ({
  AjentifyProvider: ({ children }: { children: ReactNode }) => children,
  useChat: () => ({
    messages: sdk.messages,
    pendingResponse: null,
    status: sdk.status,
    agent: sdk.agent,
    hasContext: !!sdk.liveContextId || sdk.status === "draft",
    error: null,
    isDraft: sdk.status === "draft",
    // Mirrors the real SDK (`creating || isDraft`) — a draft counts as "preparing".
    isPreparingNewChat: sdk.status === "draft",
    isWaitingForResponse: false,
    subagentRuns: {},
    canCancel: sdk.status === "streaming",
    isCancelling: false,
    send: sdk.send,
    cancel: sdk.cancel,
    clearError: vi.fn(),
    disconnect: vi.fn(),
  }),
  useContextHistory: () => ({
    history: sdk.history,
    loading: false,
    error: null,
    loaded: true,
    currentContextId: sdk.liveContextId,
    load: sdk.load,
    ensureLoaded: sdk.ensureLoaded,
    invalidate: vi.fn(),
    switchTo: sdk.switchTo,
    createNew: sdk.createNew,
    clearCurrent: sdk.clearCurrent,
    deleteContext: sdk.deleteContext,
  }),
  useCurrentContext: (sel: (s: { contextId: string | null }) => unknown) =>
    sel({ contextId: sdk.liveContextId }),
  isSubagentToolCall: () => false,
  deriveSubagentCard: () => null,
  linkedSubagentReplyIds: () => new Set(),
  CANCELLED_TOOL_OUTPUT: "cancelled by user",
}));
vi.mock("@ajentify/chat/ui", () => ({ SubagentCard: () => null }));

vi.mock("@/lib/stores/agents-store", () => ({
  useAgentsStore: (sel: (s: unknown) => unknown) =>
    sel({ data: agents, loaded: true, loading: false, ensureLoaded: vi.fn() }),
}));
vi.mock("@/lib/stores/models-store", () => ({
  useModelsStore: (sel: (s: unknown) => unknown) =>
    sel({ data: [{ model: "gpt" }, { model: "rt", is_realtime: true }] }),
}));
vi.mock("@/lib/stores/org-store", () => ({
  useOrgStore: Object.assign(
    (sel: (s: unknown) => unknown) => sel({ activeOrgId: "org1" }),
    { getState: () => ({ activeOrgId: "org1" }) }
  ),
}));
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn() } }));
vi.mock("@/lib/api/contexts", () => ({
  contextsApi: { get: vi.fn(), create: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/api/api-keys", () => ({ apiKeysApi: { generate: vi.fn() } }));

import { ChatPage } from "../chat-page";
import { ApiError } from "@/lib/api/errors";

// jsdom has no matchMedia (used by `useIsMobile`).
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
});

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  toast.error.mockReset();
  sdk.status = "idle";
  sdk.liveContextId = null;
  sdk.messages = [];
  sdk.agent = null;
  sdk.history = [];
  for (const k of ["send", "switchTo", "createNew", "clearCurrent", "load", "ensureLoaded"] as const) {
    sdk[k].mockClear();
  }
  sdk.switchTo.mockImplementation(async () => {});
  nav.pathname = "/app/chat";
  nav.search = "";
  window.localStorage.clear();
});

// ---------------------------------------------------------------------------

describe("ChatPage — new chat (/app/chat)", () => {
  it("starts a draft, shows the hero and only chat-capable agents", async () => {
    render(<ChatPage />);
    expect(sdk.clearCurrent).toHaveBeenCalled();
    expect(sdk.createNew).toHaveBeenCalledTimes(1);
    expect(sdk.ensureLoaded).toHaveBeenCalled();
    expect(screen.getByText("What can I help with?")).toBeInTheDocument();
    // Realtime agent is excluded; first chat agent is preselected.
    const picker = screen.getByRole("combobox", { name: "Agent" });
    expect(picker).toHaveTextContent("Concierge");
    expect(picker).not.toHaveTextContent("Voice bot");
    expect(sdk.switchTo).not.toHaveBeenCalled();
  });

  it("lets the user send the first message while in draft (the send materialises the context)", async () => {
    sdk.status = "draft";
    render(<ChatPage />);
    const box = screen.getByRole("textbox", { name: "Message" });
    expect(box).not.toBeDisabled();
    fireEvent.change(box, { target: { value: "hello" } });
    const sendBtn = screen.getByRole("button", { name: "Send message" });
    expect(sendBtn).not.toBeDisabled();
    fireEvent.click(sendBtn);
    expect(sdk.send).toHaveBeenCalledWith("hello");
  });

  it("moves the URL to /app/chat/<id> once the draft materialises, without remounting", () => {
    sdk.status = "draft";
    const { rerender } = render(<ChatPage />);
    expect(router.replace).not.toHaveBeenCalled();

    // First send → SDK binds the new context id.
    sdk.liveContextId = "new1";
    sdk.status = "streaming";
    rerender(<ChatPage />);
    expect(router.replace).toHaveBeenCalledWith("/app/chat/new1");
    expect(sdk.load).toHaveBeenCalled(); // rail refresh

    // URL catches up — must NOT re-switch to the context we're already on.
    nav.pathname = "/app/chat/new1";
    rerender(<ChatPage contextId="new1" />);
    expect(sdk.switchTo).not.toHaveBeenCalled();
    expect(sdk.createNew).toHaveBeenCalledTimes(1);
  });
});

describe("ChatPage — existing conversation (/app/chat/[id])", () => {
  it("switches to the route's context exactly once and shows a skeleton while connecting", () => {
    nav.pathname = "/app/chat/ctx1";
    const { rerender } = render(<ChatPage contextId="ctx1" />);
    expect(sdk.switchTo).toHaveBeenCalledTimes(1);
    expect(sdk.switchTo).toHaveBeenCalledWith("ctx1");
    expect(sdk.createNew).not.toHaveBeenCalled();
    expect(screen.queryByText("What can I help with?")).toBeNull();

    sdk.liveContextId = "ctx1";
    sdk.status = "connecting";
    rerender(<ChatPage contextId="ctx1" />);
    expect(sdk.switchTo).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("textbox", { name: "Message" })).toBeNull();

    sdk.status = "connected";
    sdk.agent = { agent_id: "ag1", agent_name: "Concierge" };
    rerender(<ChatPage contextId="ctx1" />);
    expect(screen.getByRole("textbox", { name: "Message" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Concierge");
  });

  it("shows 'Conversation not found' when the context 404s", async () => {
    nav.pathname = "/app/chat/missing";
    sdk.switchTo.mockImplementation(async () => {
      throw new Error("get_context callback failed", {
        cause: new ApiError(404, { error: "not found" }),
      });
    });
    render(<ChatPage contextId="missing" />);
    expect(await screen.findByText("Conversation not found")).toBeInTheDocument();
    // The empty state's own CTA, in addition to the rail's "New chat".
    expect(screen.getAllByRole("button", { name: /New chat/ }).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("textbox", { name: "Message" })).toBeNull();
  });

  it("starts a fresh draft when navigating back to /app/chat", () => {
    nav.pathname = "/app/chat/ctx1";
    sdk.liveContextId = "ctx1";
    sdk.status = "connected";
    const { rerender } = render(<ChatPage contextId="ctx1" />);
    expect(sdk.createNew).not.toHaveBeenCalled();

    nav.pathname = "/app/chat";
    rerender(<ChatPage />);
    expect(sdk.clearCurrent).toHaveBeenCalled();
    expect(sdk.createNew).toHaveBeenCalledTimes(1);
    // Must not bounce the user back to the old conversation.
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("ChatPage — ?add_message deep link", () => {
  it("sends once after the context is connected, then strips the param", async () => {
    nav.pathname = "/app/chat/ctx1";
    nav.search = "add_message=a%29%20Mexican";
    const { rerender } = render(<ChatPage contextId="ctx1" />);
    // Still connecting: nothing sent yet.
    expect(sdk.send).not.toHaveBeenCalled();

    sdk.liveContextId = "ctx1";
    sdk.status = "connected";
    await act(async () => {
      rerender(<ChatPage contextId="ctx1" />);
    });
    expect(sdk.send).toHaveBeenCalledTimes(1);
    expect(sdk.send).toHaveBeenCalledWith("a) Mexican");
    expect(router.replace).toHaveBeenCalledWith("/app/chat/ctx1");

    // Re-renders (status churn, StrictMode-style) never resend.
    sdk.status = "streaming";
    rerender(<ChatPage contextId="ctx1" />);
    sdk.status = "connected";
    rerender(<ChatPage contextId="ctx1" />);
    expect(sdk.send).toHaveBeenCalledTimes(1);
  });

  it("does not send a wrong context's message (URL and live id must match)", () => {
    nav.pathname = "/app/chat/ctx2";
    nav.search = "add_message=hi";
    sdk.liveContextId = "ctx1"; // stale live context from before navigation
    sdk.status = "connected";
    render(<ChatPage contextId="ctx2" />);
    expect(sdk.send).not.toHaveBeenCalled();
    expect(sdk.switchTo).toHaveBeenCalledWith("ctx2");
  });

  it("ignores over-long payloads with a toast and still strips the param", async () => {
    nav.pathname = "/app/chat/ctx1";
    nav.search = `add_message=${"x".repeat(2001)}`;
    sdk.liveContextId = "ctx1";
    sdk.status = "connected";
    render(<ChatPage contextId="ctx1" />);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(sdk.send).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/app/chat/ctx1");
  });
});
