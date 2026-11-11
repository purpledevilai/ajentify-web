import { describe, it, expect } from "vitest";
import {
  ADD_MESSAGE_MAX_CHARS,
  consumeAddMessageParam,
  groupHistoryByDate,
  historyGroupFor,
  lastAgentStorageKey,
  resolveInitialAgentId,
} from "../helpers";

describe("consumeAddMessageParam", () => {
  it("returns no text and the bare pathname when the param is absent", () => {
    expect(consumeAddMessageParam("/app/chat/abc", "")).toEqual({
      strippedUrl: "/app/chat/abc",
    });
    expect(consumeAddMessageParam("/app/chat/abc", "?x=1")).toEqual({
      strippedUrl: "/app/chat/abc?x=1",
    });
  });

  it("extracts the decoded message and strips only that param", () => {
    const r = consumeAddMessageParam(
      "/app/chat/abc",
      "?add_message=a%29%20Mexican%20%F0%9F%8C%AE&tab=x"
    );
    expect(r.text).toBe("a) Mexican 🌮");
    expect(r.strippedUrl).toBe("/app/chat/abc?tab=x");
    expect(r.tooLong).toBeUndefined();
  });

  it("accepts the search with or without the leading '?'", () => {
    expect(consumeAddMessageParam("/p", "add_message=a").text).toBe("a");
    expect(consumeAddMessageParam("/p", "?add_message=a").text).toBe("a");
  });

  it("does not double-decode literal percent signs", () => {
    expect(consumeAddMessageParam("/p", "?add_message=100%2525").text).toBe("100%25");
  });

  it("ignores blank messages", () => {
    expect(consumeAddMessageParam("/p", "?add_message=%20%20")).toEqual({
      strippedUrl: "/p",
    });
  });

  it("flags messages over the cap and still strips the param", () => {
    const long = "x".repeat(ADD_MESSAGE_MAX_CHARS + 1);
    const r = consumeAddMessageParam("/p", `?add_message=${long}`);
    expect(r.text).toBeUndefined();
    expect(r.tooLong).toBe(true);
    expect(r.strippedUrl).toBe("/p");
    // exactly at the cap is fine
    expect(
      consumeAddMessageParam("/p", `?add_message=${"y".repeat(ADD_MESSAGE_MAX_CHARS)}`).text
    ).toHaveLength(ADD_MESSAGE_MAX_CHARS);
  });
});

describe("history grouping", () => {
  // Tue 2026-11-10 15:00 local
  const now = new Date(2026, 10, 10, 15, 0, 0).getTime();
  const sec = (d: Date) => Math.floor(d.getTime() / 1000);

  it("labels by local calendar day, accepting unix seconds or ms", () => {
    expect(historyGroupFor(sec(new Date(2026, 10, 10, 0, 30)), now)).toBe("Today");
    expect(historyGroupFor(new Date(2026, 10, 10, 9).getTime(), now)).toBe("Today");
    expect(historyGroupFor(sec(new Date(2026, 10, 9, 23, 59)), now)).toBe("Yesterday");
    expect(historyGroupFor(sec(new Date(2026, 10, 4, 12)), now)).toBe("Previous 7 days");
    expect(historyGroupFor(sec(new Date(2026, 10, 2, 12)), now)).toBe("Older");
  });

  it("groups in fixed order, newest first within a group, omitting empty groups", () => {
    const items = [
      { id: "old", updated_at: sec(new Date(2026, 9, 1)) },
      { id: "t1", updated_at: sec(new Date(2026, 10, 10, 8)) },
      { id: "t2", updated_at: sec(new Date(2026, 10, 10, 12)) },
      { id: "y", updated_at: sec(new Date(2026, 10, 9, 10)) },
    ];
    const groups = groupHistoryByDate(items, now);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Older"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["t2", "t1"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["y"]);
  });
});

describe("agent preference", () => {
  it("namespaces the storage key by org", () => {
    expect(lastAgentStorageKey("org1")).toBe("ajentify.chat-page.agent:org1");
  });

  it("prefers the remembered agent when still available, else the first", () => {
    const agents = [{ agent_id: "a" }, { agent_id: "b" }];
    expect(resolveInitialAgentId(agents, "b")).toBe("b");
    expect(resolveInitialAgentId(agents, "zzz")).toBe("a");
    expect(resolveInitialAgentId(agents, null)).toBe("a");
    expect(resolveInitialAgentId([], "a")).toBeNull();
  });
});
