/**
 * Display order and UI copy for built-in tool categories. Keys match the
 * category names returned by `/default-tools` (see `ToolRegistry.py`).
 */
export const DEFAULT_TOOL_CATEGORY_ORDER = [
  "Events",
  "Utility",
  "Memory",
  "Web Search",
  "Data Window",
  "Gmail",
  "Outlook",
  "Google Calendar",
  "Google Maps",
  "Web Chat",
] as const;

export type DefaultToolCategory =
  (typeof DEFAULT_TOOL_CATEGORY_ORDER)[number];

export const CUSTOM_TOOLS_TAB = "custom" as const;

export interface ToolCategoryCopy {
  /** Short heading shown above the body copy. Defaults to the tab label. */
  title?: string;
  /** When and why to attach tools from this category. */
  description: string;
}

export const TOOL_CATEGORY_COPY: Record<
  typeof CUSTOM_TOOLS_TAB | DefaultToolCategory,
  ToolCategoryCopy
> = {
  custom: {
    title: "Your tools",
    description:
      "Custom tools you have built for your organization. Attach the ones whose parameters and behavior fit this agent's job — the model will see each tool's name and description when deciding what to call. Create or edit tools from the Tools page if you do not see what you need.",
  },
  Events: {
    description:
      "Emit structured events from conversations — useful for webhooks, CRM updates, or handoff flows when the model decides something important happened. Attach pass_event when you want the agent to signal milestones (for example, a lead qualified or a booking confirmed) without encoding integration logic in the system prompt.",
  },
  Utility: {
    description:
      "General helpers for grounding and reasoning. get_time gives the model an accurate clock, optionally in a specific timezone, for scheduling and time-aware answers. think provides a scratch-pad step for longer reasoning chains before the agent replies or calls other tools.",
  },
  Memory: {
    description:
      "Read and write JSON documents that persist across turns in a conversation — a structured notepad for user profiles, task lists, or session state. Open or create a document with open_memory_window, inspect its shape with view_memory_shape, then use read_memory, append_memory, write_memory, and delete_memory to work with fields. Best for agents that need durable state beyond a single message.",
  },
  "Web Search": {
    description:
      "Search the public web and read page content. Use web_search when the agent needs current information or sources outside its training data; follow up with view_url to fetch and summarize a specific link from the results. Pair with Utility tools when answers should be time-stamped or timezone-aware.",
  },
  "Data Window": {
    description:
      "Open large reference datasets you have uploaded as Data Windows — the agent gets a scoped view without stuffing everything into the prompt. Attach open_data_window when this agent should query or summarize one of your organization's data windows during the conversation.",
  },
  Gmail: {
    description:
      "Full Gmail access for listing, reading, drafting, sending, labeling, and archiving mail through a connected Google integration. Give the agent a focused subset (for example, list, get, and send) rather than every tool unless it truly needs full mailbox management. Ensure Gmail is connected under Integrations before relying on these tools.",
  },
  Outlook: {
    description:
      "Microsoft 365 mail and folders — the Outlook counterpart to Gmail. Includes listing, reading, drafting, replies, folder moves, and lifecycle actions. Connect Outlook in Integrations first, then attach only the operations this agent is allowed to perform.",
  },
  "Google Calendar": {
    description:
      "List calendars and create, read, update, or delete events. Use for scheduling assistants that need to check availability or book meetings. Pair with get_time so the agent knows what \"now\" means. Requires Google Calendar access on your integration.",
  },
  "Google Maps": {
    description:
      "Search places, fetch place details, and compute routes. Use for location-aware agents — travel planning, store finders, or directions. The model passes natural-language queries; results come back as structured place and route data.",
  },
  "Web Chat": {
    description:
      "Let the agent see, act on, and move around whatever app the user is in when your agent is embedded via @ajentify/chat. These are client-side tools — they run inside the host application rather than on our servers. get_page_data returns the current page's JSON snapshot plus the list of actions it exposes; do_page_action invokes one of those actions with arguments; navigate sends the user to a different in-app route (the host app routes it via the AjentifyProvider's clientSideTools handler). Attach them together when you want the agent to inspect screens, pick items, fill forms, move between pages, or trigger UI flows on behalf of the user. They are no-ops unless the host app has mounted the matching useGetPageData / useDoPageAction hooks (and a navigate handler in clientSideTools), so they're safe to leave on for agents that may or may not be used inside a chat-component-enabled app.",
  },
};
