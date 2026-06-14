import type {
  AgentConfig,
  AgentRuntime,
  AnswerSegment,
  ModelMeta,
  PreviewModel,
  PreviewStep,
} from "./types";

export const MODELS: ModelMeta[] = [
  { id: "claude", label: "Claude", vendor: "Anthropic" },
  { id: "gpt", label: "GPT-4o", vendor: "OpenAI" },
  { id: "gemini", label: "Gemini", vendor: "Google" },
];

/**
 * The agent the showcase opens with: an in-app assistant for a fictional
 * storefront. Chosen because every primitive has an obvious job — which makes
 * editing any one of them visibly change the agent's answer.
 */
export const INITIAL_CONFIG: AgentConfig = {
  name: "Storefront Assistant",
  model: "claude",
  persona: "warm, concise, never pushy",
  systemPrompt: `You are the Storefront Assistant for Acme.
Help customers find products, check orders, and answer policy questions.

Voice: warm, concise, never pushy.
- Use live_inventory for stock questions.
- Use store_policies for returns, shipping and warranty.
- Offer to take the customer straight to what they need.

Never invent stock numbers or policies. If you can't see the
data, say so.`,
  tools: [
    {
      id: "t_nav",
      name: "navigate",
      description: "Open any page in the app for the customer",
      clientSide: true,
      enabled: true,
    },
    {
      id: "t_orders",
      name: "get_orders",
      description: "Look up the customer's order history",
      clientSide: false,
      enabled: true,
    },
    {
      id: "t_create",
      name: "create_order",
      description: "Place an order on the customer's behalf",
      clientSide: false,
      enabled: false,
    },
  ],
  sres: [
    {
      id: "s_extract",
      name: "extract_request",
      description: "Pull structured intent out of a free-text message",
      variables: ["message"],
      outputFields: [
        { name: "product", type: "string" },
        { name: "intent", type: "enum" },
      ],
      enabled: true,
    },
  ],
  memDocs: [
    {
      id: "m_pol",
      name: "store_policies",
      facts: [
        "Returns accepted within 30 days of purchase.",
        "Free shipping on orders over $50.",
      ],
      enabled: true,
    },
  ],
  dataWindows: [
    {
      id: "d_inv",
      name: "live_inventory",
      description: "Synced from your store every 60s",
      rows: [
        { key: "Aurora Lamp", value: "8" },
        { key: "Nimbus Chair", value: "3" },
      ],
      enabled: true,
    },
  ],
};

const DEMO_QUESTION =
  "How many Aurora Lamps are left, and can I still return one I bought a few weeks ago?";

/**
 * mockRuntime — derives a preview transcript purely from the current config,
 * with no network. Every branch below is wired to a primitive so toggling or
 * editing that primitive changes what the agent says.
 *
 * Swap this for a live implementation (same `AgentRuntime` interface) to make
 * the preview a real agent. See ./types.ts.
 */
export const mockRuntime: AgentRuntime = {
  derivePreview(config: AgentConfig): PreviewModel {
    const steps: PreviewStep[] = [];

    const sre = config.sres.find((s) => s.enabled);
    if (sre) {
      steps.push({
        kind: "sre",
        label: `${sre.name}()`,
        detail: `→ { product: "Aurora Lamp", intent: "stock_and_returns" }`,
      });
    }

    const navTool = config.tools.find((t) => t.enabled && t.clientSide);
    if (navTool) {
      steps.push({
        kind: "tool",
        label: `${navTool.name}()`,
        detail: "client-side · drives your UI",
      });
    }

    const inventory = config.dataWindows.find((d) => d.enabled);
    const stockRow =
      inventory?.rows.find((r) => r.key.toLowerCase().includes("aurora")) ??
      inventory?.rows[0];

    const policyDoc = config.memDocs.find((m) => m.enabled);
    const returnFact =
      policyDoc?.facts.find((f) => /return/i.test(f)) ?? policyDoc?.facts[0];

    const answer: AnswerSegment[] = [];

    if (inventory && stockRow) {
      answer.push({
        text: `We've got ${stockRow.value} ${stockRow.key}${
          stockRow.value === "1" ? "" : "s"
        } in stock right now.`,
        source: "data",
      });
    } else {
      answer.push({
        text: "I don't have live inventory connected, so I can't check stock for you.",
        source: "data",
      });
    }

    if (policyDoc && returnFact) {
      answer.push({ text: ` On returns — ${returnFact}`, source: "memory" });
    } else {
      answer.push({
        text: " For returns, take a look at our policy page to be sure.",
        source: "memory",
      });
    }

    if (navTool) {
      answer.push({
        text: " Want me to open that product for you?",
      });
    }

    return {
      model: config.model,
      personaLabel: config.persona.trim() || "default",
      greeting: `${config.name} here — ${
        config.persona.trim() || "ready to help"
      }.`,
      userMessage: DEMO_QUESTION,
      steps,
      answer,
      toolsAvailable: config.tools.filter((t) => t.enabled).map((t) => t.name),
      knowledge: config.memDocs.filter((m) => m.enabled).map((m) => m.name),
      liveData: inventory
        ? { name: inventory.name, rows: inventory.rows }
        : null,
    };
  },
};

/** Builds the declarative manifest shown in the "Deploy" tab from live config. */
export function buildManifest(config: AgentConfig): string {
  const toolEntries = config.tools
    .filter((t) => t.enabled)
    .map(
      (t) =>
        `    "${t.name}": { "client_side": ${t.clientSide}, "description": "${t.description}" }`
    )
    .join(",\n");

  const sreEntries = config.sres
    .filter((s) => s.enabled)
    .map(
      (s) =>
        `    "${s.name}": { "variables": [${s.variables
          .map((v) => `"${v}"`)
          .join(", ")}], "output_schema": { ${s.outputFields
          .map((f) => `"${f.name}": "${f.type}"`)
          .join(", ")} } }`
    )
    .join(",\n");

  const tools = config.tools.filter((t) => t.enabled).map((t) => `"${t.name}"`);

  return `{
  "stage": "dev",
  "agents": {
    "${slug(config.name)}": {
      "name": "${config.name}",
      "model": "${config.model}",
      "prompt": "./prompts/${slug(config.name)}.md",
      "tools": [${tools.join(", ")}]
    }
  },
  "tools": {
${toolEntries || "    "}
  },
  "sres": {
${sreEntries || "    "}
  }
}`;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
