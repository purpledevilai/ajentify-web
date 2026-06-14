import type {
  AgentConfig,
  AgentRuntime,
  AnswerSegment,
  ModelMeta,
  PreviewModel,
  PreviewStep,
} from "./types";

export const MODELS: ModelMeta[] = [
  { id: "claude", label: "Claude Sonnet 4.6", vendor: "Anthropic", modelId: "claude-sonnet-4.6" },
  { id: "gpt", label: "GPT-5.2", vendor: "OpenAI", modelId: "gpt-5.2" },
  { id: "gemini", label: "Gemini 2.5", vendor: "Google", modelId: "gemini-2.5" },
];

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

// Server tool: Python whose function name matches the tool name. requests,
// pandas (pd), numpy (np), datetime and json are preloaded — no imports.
const GET_ORDERS_CODE = `def get_orders(context, customer_id: str):
    res = requests.get(
        "https://api.acme.store/orders",
        params={"customer": customer_id},
    )
    return res.json()["orders"]  # returned to the agent`;

// Client tool: no server code. The handler runs in your frontend with the
// user's auth; its return value is posted back to Ajentify for the agent.
const ADD_TO_CART_CODE = `// wire handlers once, on <AjentifyProvider>
const clientSideTools = defineClientSideTools({
  add_to_cart: async ({ sku, qty }) => {
    await api.cart.add(sku, qty);  // your existing API
    return { ok: true };           // -> back to the agent
  },
});`;

const EXTRACT_PROMPT = `Extract the product and the customer's intent
from this message.

Message: MESSAGE`;

export const INITIAL_CONFIG: AgentConfig = {
  name: "Storefront Assistant",
  model: "gpt",
  persona: "warm, concise, never pushy",
  systemPrompt: `You are the Storefront Assistant for Acme.
Help customers find products, check orders, and answer policy questions.

Voice: warm, concise, never pushy.
- Use live_inventory for stock questions.
- Use store_policies for returns, shipping and warranty.
- Use navigate to take the customer straight to a page.

Never invent stock numbers or policies.`,
  tools: [
    {
      id: "t_nav",
      name: "navigate",
      description:
        "Reserved PageTool — provided by @ajentify/chat. Drives your router; attach by name, no code.",
      kind: "builtin",
      enabled: true,
    },
    {
      id: "t_orders",
      name: "get_orders",
      description: "Look up a customer's order history.",
      kind: "server",
      enabled: true,
      language: "python",
      code: GET_ORDERS_CODE,
    },
    {
      id: "t_cart",
      name: "add_to_cart",
      description: "Add an item to the customer's cart, client-side.",
      kind: "client",
      enabled: false,
      language: "javascript",
      code: ADD_TO_CART_CODE,
    },
  ],
  sres: [
    {
      id: "s_extract",
      name: "extract_request",
      description: "Pull structured intent out of a free-text message.",
      promptTemplate: EXTRACT_PROMPT,
      variables: ["MESSAGE"],
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
      enabled: true,
      data: {
        returns: "Returns accepted within 30 days of purchase.",
        shipping: "Free shipping on orders over $50.",
      },
    },
  ],
  dataWindows: [
    {
      id: "d_inv",
      name: "live_inventory",
      description: "A JSON data string synced from your store as orders come in",
      enabled: true,
      data: {
        "Aurora Lamp": { stock: 8, price: 149 },
        "Nimbus Chair": { stock: 3, price: 399 },
      },
    },
  ],
};

const DEMO_QUESTION =
  "How many Aurora Lamps are left, and can I still return one I bought a few weeks ago?";

export const mockRuntime: AgentRuntime = {
  derivePreview(config: AgentConfig): PreviewModel {
    const steps: PreviewStep[] = [];

    const sre = config.sres.find((s) => s.enabled);
    if (sre) {
      steps.push({
        kind: "sre",
        name: sre.name,
        meta: "SRE",
        input: prettyJson({ MESSAGE: DEMO_QUESTION }),
        output: prettyJson({ product: "Aurora Lamp", intent: "stock_and_returns" }),
      });
    }

    const navTool = config.tools.find((t) => t.enabled && t.name === "navigate");
    if (navTool) {
      steps.push({
        kind: "tool",
        name: navTool.name,
        meta: "built-in PageTool",
        input: prettyJson({ path: "/products/aurora-lamp" }),
        output: prettyJson({ navigated: true }),
      });
    }

    const inventory = config.dataWindows.find((d) => d.enabled);
    const aurora = inventory ? asRecord(inventory.data["Aurora Lamp"]) : {};
    const stock = typeof aurora.stock === "number" ? aurora.stock : undefined;

    const policyDoc = config.memDocs.find((m) => m.enabled);
    const returnFact =
      policyDoc && typeof policyDoc.data.returns === "string"
        ? policyDoc.data.returns
        : undefined;

    const answer: AnswerSegment[] = [];

    if (stock !== undefined) {
      answer.push({
        text: `We've got ${stock} Aurora Lamp${stock === 1 ? "" : "s"} in stock right now.`,
        source: "data",
      });
    } else {
      answer.push({
        text: "I don't have live inventory connected, so I can't check stock for you.",
        source: "data",
      });
    }

    if (returnFact) {
      answer.push({ text: ` On returns — ${returnFact}`, source: "memory" });
    } else {
      answer.push({
        text: " For returns, take a look at our policy page to be sure.",
        source: "memory",
      });
    }

    if (navTool) {
      answer.push({ text: " Want me to open that product for you?" });
    }

    return {
      model: config.model,
      personaLabel: config.persona.trim() || "default",
      greeting: `${config.name} here — ${config.persona.trim() || "ready to help"}.`,
      userMessage: DEMO_QUESTION,
      steps,
      answer,
      toolsAvailable: config.tools.filter((t) => t.enabled).map((t) => t.name),
      knowledge: config.memDocs.filter((m) => m.enabled).map((m) => m.name),
      liveData: inventory
        ? { name: inventory.name, json: prettyJson(inventory.data) }
        : null,
    };
  },
};

/**
 * Builds the deploy manifest (ajentify.json) from live config. Built-in
 * PageTools are attached by name but not defined here; only custom tools and
 * SREs appear in the resource maps.
 */
export function buildManifest(config: AgentConfig): string {
  const model = MODELS.find((m) => m.id === config.model) ?? MODELS[0];
  const agentTools = config.tools.filter((t) => t.enabled).map((t) => `"${t.name}"`);

  const toolEntries = config.tools
    .filter((t) => t.enabled && t.kind !== "builtin")
    .map(
      (t) =>
        `    "${t.name}": { "is_client_side_tool": ${t.kind === "client"}, "pass_context": ${t.kind === "server"} }`
    )
    .join(",\n");

  const sreEntries = config.sres
    .filter((s) => s.enabled)
    .map(
      (s) =>
        `    "${s.name}": { "prompt_template": "Extract the product and intent from: MESSAGE", "variable_names": [${s.variables
          .map((v) => `"${v}"`)
          .join(", ")}] }`
    )
    .join(",\n");

  return `{
  "agents": {
    "${slug(config.name)}": {
      "name": "${config.name}",
      "prompt": "./prompts/${slug(config.name)}.md",
      "model_id": "${model.modelId}",
      "tools": [${agentTools.join(", ")}]
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
