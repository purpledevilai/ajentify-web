import type { ApiParameterDefinition, ApiTool } from "@/types/api";

/**
 * Pulls the ordered list of parameter names from a parameter definition's
 * JSON-Schema-shaped `schema` object. Required params keep their plain name,
 * optional params get a trailing `?` (e.g. `lat`, `radius?`).
 *
 * Missing / malformed schemas yield an empty list.
 */
export function getToolParamNames(pd: ApiParameterDefinition | undefined): {
  name: string;
  optional: boolean;
}[] {
  if (!pd?.schema || typeof pd.schema !== "object") return [];
  const schema = pd.schema as Record<string, unknown>;
  const props = schema.properties;
  if (!props || typeof props !== "object") return [];
  const required = new Set<string>(
    Array.isArray(schema.required)
      ? (schema.required as unknown[]).filter(
          (s): s is string => typeof s === "string"
        )
      : []
  );
  return Object.keys(props as Record<string, unknown>).map((name) => ({
    name,
    optional: !required.has(name),
  }));
}

/**
 * Renders a tool as a function signature, e.g. `get_weather(lat, radius?)`.
 * Returns just the tool name when no parameter definition is available.
 */
export function formatToolSignature(
  tool: ApiTool,
  paramDefs: ApiParameterDefinition[]
): string {
  if (!tool.pd_id) return `${tool.name}()`;
  const pd = paramDefs.find((p) => p.pd_id === tool.pd_id);
  const params = getToolParamNames(pd);
  if (params.length === 0) return `${tool.name}()`;
  const inner = params.map((p) => (p.optional ? `${p.name}?` : p.name)).join(", ");
  return `${tool.name}(${inner})`;
}
