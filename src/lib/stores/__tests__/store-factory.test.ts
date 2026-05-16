import { describe, it, expect, vi } from "vitest";
import { createListStore } from "../store-factory";

interface Foo {
  id: string;
  n: number;
}

describe("createListStore", () => {
  it("coalesces concurrent ensureLoaded calls onto one fetcher invocation", async () => {
    const fetcher = vi.fn(async (): Promise<Foo[]> => {
      await new Promise((r) => setTimeout(r, 10));
      return [{ id: "a", n: 1 }];
    });
    const useFoo = createListStore<Foo, "id">({
      name: "foo",
      fetcher,
      idKey: "id",
    });
    await Promise.all([
      useFoo.getState().ensureLoaded(),
      useFoo.getState().ensureLoaded(),
      useFoo.getState().ensureLoaded(),
    ]);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(useFoo.getState().loaded).toBe(true);
    expect(useFoo.getState().data).toEqual([{ id: "a", n: 1 }]);
  });

  it("awaits dependencies before fetching", async () => {
    const order: string[] = [];
    const dep = createListStore<Foo, "id">({
      name: "dep",
      fetcher: async () => {
        order.push("dep");
        return [];
      },
      idKey: "id",
    });
    const child = createListStore<Foo, "id">({
      name: "child",
      fetcher: async () => {
        order.push("child");
        return [];
      },
      idKey: "id",
      dependencies: [{ ensureLoaded: () => dep.getState().ensureLoaded() }],
    });
    await child.getState().ensureLoaded();
    expect(order).toEqual(["dep", "child"]);
  });

  it("does not refetch when already loaded", async () => {
    const fetcher = vi.fn(async () => [{ id: "a", n: 1 }] as Foo[]);
    const useFoo = createListStore<Foo, "id">({
      name: "foo",
      fetcher,
      idKey: "id",
    });
    await useFoo.getState().ensureLoaded();
    await useFoo.getState().ensureLoaded();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("refresh always re-runs the fetcher", async () => {
    const fetcher = vi.fn(async () => [{ id: "a", n: 1 }] as Foo[]);
    const useFoo = createListStore<Foo, "id">({
      name: "foo",
      fetcher,
      idKey: "id",
    });
    await useFoo.getState().ensureLoaded();
    await useFoo.getState().refresh();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("reset clears state and inflight", async () => {
    const useFoo = createListStore<Foo, "id">({
      name: "foo",
      fetcher: async () => [{ id: "a", n: 1 }],
      idKey: "id",
    });
    await useFoo.getState().ensureLoaded();
    useFoo.getState().reset();
    expect(useFoo.getState().loaded).toBe(false);
    expect(useFoo.getState().data).toEqual([]);
  });

  it("upsert adds new items and replaces existing", () => {
    const useFoo = createListStore<Foo, "id">({
      name: "foo",
      fetcher: async () => [],
      idKey: "id",
    });
    useFoo.getState().upsert({ id: "a", n: 1 });
    useFoo.getState().upsert({ id: "b", n: 2 });
    expect(useFoo.getState().data).toEqual([
      { id: "a", n: 1 },
      { id: "b", n: 2 },
    ]);
    useFoo.getState().upsert({ id: "a", n: 99 });
    expect(useFoo.getState().data).toEqual([
      { id: "a", n: 99 },
      { id: "b", n: 2 },
    ]);
  });

  it("removeById removes items", () => {
    const useFoo = createListStore<Foo, "id">({
      name: "foo",
      fetcher: async () => [],
      idKey: "id",
    });
    useFoo.getState().upsert({ id: "a", n: 1 });
    useFoo.getState().upsert({ id: "b", n: 2 });
    useFoo.getState().removeById("a");
    expect(useFoo.getState().data).toEqual([{ id: "b", n: 2 }]);
  });

  it("getById ensures loaded before searching", async () => {
    const fetcher = vi.fn(async () => [
      { id: "a", n: 1 },
      { id: "b", n: 2 },
    ] as Foo[]);
    const useFoo = createListStore<Foo, "id">({
      name: "foo",
      fetcher,
      idKey: "id",
    });
    const item = await useFoo.getState().getById("b");
    expect(fetcher).toHaveBeenCalledOnce();
    expect(item).toEqual({ id: "b", n: 2 });
  });

  it("records error and rethrows on fetcher failure", async () => {
    const useFoo = createListStore<Foo, "id">({
      name: "foo",
      fetcher: async () => {
        throw new Error("boom");
      },
      idKey: "id",
    });
    await expect(useFoo.getState().ensureLoaded()).rejects.toThrow("boom");
    expect(useFoo.getState().error).toBe("boom");
    expect(useFoo.getState().loaded).toBe(false);
    expect(useFoo.getState().loading).toBe(false);
  });
});
