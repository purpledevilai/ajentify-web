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
}

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  /** Client-side tools run in the browser and can drive your app's UI. */
  clientSide: boolean;
  enabled: boolean;
  language: "python" | "javascript";
  /** The actual code that runs when the agent calls this tool. */
  code: string;
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
  variables: string[];
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
