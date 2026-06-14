/**
 * Types for the interactive agent demo.
 *
 * Integration seam: the preview is produced by an `AgentRuntime`. We ship
 * `mockRuntime` (see ./demo-runtime.ts) which derives a config-driven preview
 * with no backend. Implement `AgentRuntime` on top of `@ajentify/chat` to make
 * the preview a real agent — nothing else changes.
 */

export type ModelId = "claude" | "gpt" | "gemini";

export interface ModelMeta {
  id: ModelId;
  label: string;
  vendor: string;
  /** The real model_id string sent to the API. */
  modelId: string;
}

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  /**
   * server  — Python `code` runs sandboxed on Ajentify.
   * client  — no server code; a frontend handler (defineClientSideTools) runs
   *           in your app and its return value is sent back to the agent.
   * builtin — a reserved PageTool (navigate / get_page_data / do_page_action)
   *           provided by @ajentify/chat; attach by name, no code.
   */
  kind: "server" | "client" | "builtin";
  enabled: boolean;
  language?: "python" | "javascript";
  code?: string;
}

export interface SREField {
  name: string;
  type: "string" | "number" | "boolean" | "enum";
}

/** Structured Response Endpoint — a typed, reusable LLM call. */
export interface SREConfig {
  id: string;
  name: string;
  description: string;
  /** Prompt template containing the variable names, replaced at runtime. */
  promptTemplate: string;
  /** Variable names that appear literally in the template. */
  variables: string[];
  /** The output schema (a parameter definition / JSON schema). */
  outputFields: SREField[];
  enabled: boolean;
}

/** Memory document — a JSON document the agent reads as knowledge. */
export interface MemDocConfig {
  id: string;
  name: string;
  enabled: boolean;
  data: Record<string, unknown>;
}

/** Data Window — a live JSON document injected into the context. */
export interface DataWindowConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  data: Record<string, unknown>;
}

export interface AgentConfig {
  name: string;
  model: ModelId;
  persona: string;
  systemPrompt: string;
  tools: ToolConfig[];
  sres: SREConfig[];
  memDocs: MemDocConfig[];
  dataWindows: DataWindowConfig[];
}

/** A tool/SRE call the agent makes mid-turn, shown as an expandable trace. */
export interface PreviewStep {
  kind: "tool" | "sre";
  name: string;
  meta: string;
  /** JSON-stringified call input and result. */
  input: string;
  output: string;
}

export interface AnswerSegment {
  text: string;
  source?: "data" | "memory" | "persona";
}

export interface PreviewModel {
  model: ModelId;
  personaLabel: string;
  greeting: string;
  userMessage: string;
  steps: PreviewStep[];
  answer: AnswerSegment[];
  toolsAvailable: string[];
  knowledge: string[];
  /** The Data Window the agent is reading, as pretty JSON. */
  liveData: { name: string; json: string } | null;
}

export interface AgentRuntime {
  derivePreview(config: AgentConfig): PreviewModel;
}
