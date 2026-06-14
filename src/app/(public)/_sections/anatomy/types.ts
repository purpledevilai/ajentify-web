/**
 * Types for the interactive "Anatomy of an Agent" showcase.
 *
 * The showcase lets a visitor edit a live agent's configuration (system prompt,
 * tools, SREs, mem-docs, Data Windows) and watch a preview react in real time.
 *
 * IMPORTANT — integration seam for the live agent:
 * The preview is produced by an `AgentRuntime`. Today we ship `mockRuntime`
 * (see ./demo-runtime.ts), which derives a scripted-but-config-driven preview
 * with zero backend. To make the preview a *real* agent, implement
 * `AgentRuntime` on top of `@ajentify/chat` (create a context from `AgentConfig`,
 * send the demo turn, stream tool calls + the answer back) and pass it to
 * <AnatomySection runtime={...} />. No other component needs to change.
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

/** Memory document — JSON knowledge the agent reads. */
export interface MemDocConfig {
  id: string;
  name: string;
  facts: string[];
  enabled: boolean;
}

/** A single editable key/value row inside a Data Window. */
export interface DataRow {
  key: string;
  value: string;
}

/** Data Window — real-time cached data injected into the context. */
export interface DataWindowConfig {
  id: string;
  name: string;
  description: string;
  rows: DataRow[];
  enabled: boolean;
}

export interface AgentConfig {
  name: string;
  model: ModelId;
  /** Short persona label surfaced in the preview header. */
  persona: string;
  systemPrompt: string;
  tools: ToolConfig[];
  sres: SREConfig[];
  memDocs: MemDocConfig[];
  dataWindows: DataWindowConfig[];
}

export type PrimitiveKey =
  | "agent"
  | "prompt"
  | "tools"
  | "sres"
  | "memdocs"
  | "datawindows"
  | "deploy";

/** A step the agent takes mid-turn (tool/SRE call), rendered as an animated chip. */
export interface PreviewStep {
  kind: "tool" | "sre";
  label: string;
  detail: string;
}

/**
 * A segment of the agent's answer. `source` ties the value back to the config
 * primitive that produced it, so the preview can flash-highlight the exact
 * words that change when you edit that primitive.
 */
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
  liveData: { name: string; rows: DataRow[] } | null;
}

/**
 * The swappable runtime. `mockRuntime` implements this with no backend;
 * a live implementation would call `@ajentify/chat` under the hood.
 */
export interface AgentRuntime {
  derivePreview(config: AgentConfig): PreviewModel;
}
