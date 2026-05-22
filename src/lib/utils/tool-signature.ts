import type { ApiParameterDefinition, ApiTool } from "@/types/api";

export interface ToolParamName {
  name: string;
  optional: boolean;
}

/**
 * Pulls the ordered list of parameter names from a JSON-Schema-shaped object
 * (i.e. one with `properties` and optionally `required`). Required params
 * keep their plain name, optional params get a trailing `?` (e.g. `lat`,
 * `radius?`).
 *
 * Missing / malformed schemas yield an empty list. Used by both custom
 * tools (whose schema lives on a separate ParameterDefinition) and default
 * tools (whose schema is inlined as `parameters`).
 */
export function getParamNamesFromSchema(schema: unknown): ToolParamName[] {
  if (!schema || typeof schema !== "object") return [];
  const s = schema as Record<string, unknown>;
  const props = s.properties;
  if (!props || typeof props !== "object") return [];
  const required = new Set<string>(
    Array.isArray(s.required)
      ? (s.required as unknown[]).filter(
          (v): v is string => typeof v === "string"
        )
      : []
  );
  return Object.keys(props as Record<string, unknown>).map((name) => ({
    name,
    optional: !required.has(name),
  }));
}

/**
 * Pulls parameter names from a custom tool's ParameterDefinition. Returns
 * an empty list if the PD is missing.
 */
export function getToolParamNames(
  pd: ApiParameterDefinition | undefined
): ToolParamName[] {
  return getParamNamesFromSchema(pd?.schema);
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
