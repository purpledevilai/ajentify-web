import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ApiContext } from "@/types/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ context_id: "ctx1" }),
}));

vi.mock("@ajentify/chat", () => ({ useGetPageData: () => {} }));

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: (...a: unknown[]) => toastError(...a) },
}));

// The voice dialog pulls in the voice SDK UI; it only mounts on demand.
vi.mock("@/components/blocks/context-voice-session-dialog", () => ({
  ContextVoiceSessionDialog: () => null,
}));

const ensureLoaded = vi.fn();
vi.mock("@/lib/stores/models-store", () => ({
  useModelsStore: (sel: (s: unknown) => unknown) => sel({ data: [], ensureLoaded }),
}));
vi.mock("@/lib/stores/agents-store", () => ({
  useAgentsStore: (sel: (s: unknown) => unknown) => sel({ data: [], ensureLoaded }),
}));

const get = vi.fn();
vi.mock("@/lib/api/contexts", () => ({
  contextsApi: { get: (...a: unknown[]) => get(...a) },
}));

import ContextDetailPage from "../page";

function context(over: Partial<ApiContext> = {}): ApiContext {
  return {
    context_id: "ctx1",
    agent_id: "ag1",
    client_id: "c1",
    model_id: "gpt",
    system_prompt: "",
    messages: [{ sender: "human", message: "hello" }],
    created_at: 1,
    updated_at: 1,
    ...over,
  } as ApiContext;
}

beforeEach(() => {
  get.mockReset();
  toastError.mockReset();
});

describe("ContextDetailPage refresh", () => {
  it("renders top and bottom Refresh buttons that re-fetch the context", async () => {
    get.mockResolvedValueOnce(context());
    render(<ContextDetailPage />);

    expect(await screen.findByText("hello")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("ctx1", true);

    const buttons = screen.getAllByRole("button", { name: "Refresh" });
    expect(buttons).toHaveLength(2);

    // Bottom button: re-fetches and renders the new message.
    get.mockResolvedValueOnce(
      context({
        messages: [
          { sender: "human", message: "hello" },
          { sender: "ai", message: "world" },
        ],
      })
    );
    fireEvent.click(buttons[1]);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("world")).toBeInTheDocument();
    expect(screen.getByText("Messages (2)")).toBeInTheDocument();

    // Top button: same fetch.
    get.mockResolvedValueOnce(context());
    fireEvent.click(screen.getAllByRole("button", { name: "Refresh" })[0]);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));
    expect(toastError).not.toHaveBeenCalled();
  });

  it("links the Chat button to the full chat page for text contexts", async () => {
    get.mockResolvedValueOnce(context());
    render(<ContextDetailPage />);
    await screen.findByText("hello");

    const chat = screen.getByRole("link", { name: "Chat" });
    expect(chat).toHaveAttribute("href", "/app/chat/ctx1");
    expect(screen.queryByRole("button", { name: "Voice call" })).toBeNull();
  });

  it("toasts and keeps the stale view when a refresh fails", async () => {
    get.mockResolvedValueOnce(context());
    render(<ContextDetailPage />);
    await screen.findByText("hello");

    get.mockRejectedValueOnce({ status: 500, body: { error: "boom" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Refresh" })[0]);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("boom"));
    expect(screen.getByText("hello")).toBeInTheDocument();
    for (const b of screen.getAllByRole("button", { name: "Refresh" })) {
      expect(b).toBeEnabled();
    }
  });
});
