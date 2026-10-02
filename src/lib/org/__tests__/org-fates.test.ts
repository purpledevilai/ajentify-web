import { describe, it, expect } from "vitest";
import { computeOrgFates, orgFateForUser } from "../org-fates";

describe("orgFateForUser", () => {
  it("deletes an org where the user is the only member", () => {
    expect(orgFateForUser({ org_id: "o1", name: "Solo", users: ["me"] }, "me")).toEqual({
      org_id: "o1",
      name: "Solo",
      action: "delete",
    });
  });

  it("leaves an org that has other members", () => {
    expect(
      orgFateForUser({ org_id: "o2", name: "Team", users: ["me", "ana"] }, "me").action
    ).toBe("leave");
  });

  it("treats an org with no other members (even if the list omits the user) as deleted", () => {
    expect(orgFateForUser({ org_id: "o3", name: "Empty", users: [] }, "me").action).toBe(
      "delete"
    );
  });

  it("ignores duplicate entries of the user", () => {
    expect(
      orgFateForUser({ org_id: "o4", name: "Dup", users: ["me", "me"] }, "me").action
    ).toBe("delete");
  });
});

describe("computeOrgFates", () => {
  it("maps every org, preserving order", () => {
    const fates = computeOrgFates(
      [
        { org_id: "a", name: "A", users: ["me"] },
        { org_id: "b", name: "B", users: ["me", "x"] },
        { org_id: "c", name: "C", users: ["x"] },
      ],
      "me"
    );
    expect(fates.map((f) => `${f.org_id}:${f.action}`)).toEqual([
      "a:delete",
      "b:leave",
      "c:leave",
    ]);
  });
});
