import { describe, it, expect } from "vitest";
import {
  nodeToSchema,
  schemaToNode,
  schemaToRoot,
} from "../schema-conversion";
import { makeNode } from "../types";
import {
  EDITS_SCHEMA,
  EDITS_TYPE_MARKER,
  editsParamNames,
  isEditsSchema,
} from "@/lib/constants/edits-schema";

/** Plain-JSON copy of the canonical schema (strips `as const` readonly-ness). */
const canonical = (): Record<string, unknown> =>
  JSON.parse(JSON.stringify(EDITS_SCHEMA));

describe("edits pseudo-type", () => {
  it("EDITS_SCHEMA matches the api contract shape", () => {
    expect(EDITS_SCHEMA.type).toBe("array");
    expect(EDITS_SCHEMA.minItems).toBe(1);
    expect(EDITS_SCHEMA[EDITS_TYPE_MARKER]).toBe("edits");
    expect(EDITS_SCHEMA.items.additionalProperties).toBe(false);
    expect(EDITS_SCHEMA.items.required).toEqual(["operation"]);
    expect(EDITS_SCHEMA.items.properties.operation.enum).toEqual([
      "replace",
      "insert_before",
      "insert_after",
      "delete",
    ]);
    expect(Object.keys(EDITS_SCHEMA.items.properties)).toEqual([
      "operation",
      "target",
      "anchor",
      "content",
    ]);
  });

  it("nodeToSchema of an edits node deep-equals EDITS_SCHEMA", () => {
    const node = makeNode({ name: "edits", type: "edits" });
    expect(node.items).toBeUndefined();
    expect(node.properties).toBeUndefined();
    expect(nodeToSchema(node)).toEqual(canonical());
  });

  it("nodeToSchema keeps the user's description override", () => {
    const node = makeNode({
      name: "edits",
      type: "edits",
      description: "Edits to apply to the system prompt.",
    });
    const expected = canonical();
    expected.description = "Edits to apply to the system prompt.";
    expect(nodeToSchema(node)).toEqual(expected);
  });

  it("nodeToSchema never lets extra override the contract", () => {
    const node = makeNode({
      name: "edits",
      type: "edits",
      extra: { title: "Edits", type: "string", minItems: 0 },
    });
    const out = nodeToSchema(node);
    expect(out.title).toBe("Edits");
    expect(out.type).toBe("array");
    expect(out.minItems).toBe(1);
  });

  it("round-trips edits node → schema → node", () => {
    const original = makeNode({
      name: "edits",
      type: "edits",
      description: "Custom",
      required: true,
    });
    const schema = nodeToSchema(original);
    const back = schemaToNode("edits", schema, true);
    expect(back.type).toBe("edits");
    expect(back.description).toBe("Custom");
    expect(back.required).toBe(true);
    expect(back.items).toBeUndefined();
    expect(back.extra).toBeUndefined();
    // And serialising again is stable.
    expect(nodeToSchema(back)).toEqual(schema);
  });

  it("a saved schema with the marker loads as edits (items ignored)", () => {
    const saved = canonical();
    // Even if items were hand-mangled, the marker wins and items are reset.
    saved.items = { type: "string" };
    const node = schemaToNode("edits", saved);
    expect(node.type).toBe("edits");
    expect(nodeToSchema(node)).toEqual(canonical());
  });

  it("an array without the marker still loads as array", () => {
    const plain = canonical();
    delete plain[EDITS_TYPE_MARKER];
    const node = schemaToNode("list", plain);
    expect(node.type).toBe("array");
    expect(node.items?.type).toBe("object");
    expect(node.minItems).toBe(1);
  });

  it("works inside a root tool-input schema", () => {
    const root = schemaToRoot({
      type: "object",
      properties: {
        agent_id: { type: "string" },
        edits: canonical(),
      },
      required: ["edits"],
    });
    const child = root.properties?.find((p) => p.name === "edits");
    expect(child?.type).toBe("edits");
    expect(child?.required).toBe(true);
    const out = nodeToSchema(root);
    const props = out.properties as Record<string, unknown>;
    expect(props.edits).toEqual(canonical());
    expect(editsParamNames(out)).toEqual(["edits"]);
  });

  it("isEditsSchema / editsParamNames helpers", () => {
    expect(isEditsSchema(canonical())).toBe(true);
    expect(isEditsSchema({ type: "array" })).toBe(false);
    expect(isEditsSchema(null)).toBe(false);
    expect(isEditsSchema([])).toBe(false);
    expect(editsParamNames(undefined)).toEqual([]);
    expect(
      editsParamNames({ properties: { a: { type: "string" } } })
    ).toEqual([]);
  });
});
