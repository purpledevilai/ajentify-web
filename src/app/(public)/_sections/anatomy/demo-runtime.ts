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

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

const NAVIGATE_CODE = `// Runs in the browser. Drives your UI, then posts the
// result back to Ajentify for the agent to use.
ajentify.clientTool("navigate", async ({ path }) => {
  router.push(path);            // your app's router
  return { ok: true, path };    // -> sent back to the agent
});`;

const GET_ORDERS_CODE = `@tool
def get_orders(context, customer_id: str) -> dict:
    orders = db.orders.where(customer_id=customer_id)
    return {"orders": [o.summary() for o in orders]}`;

const CREATE_ORDER_CODE = `@tool
def create_order(context, sku: str, qty: int) -> dict:
    order = db.orders.create(sku=sku, qty=qty)
    return {"order_id": order.id, "status": "confirmed"}`;

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

Never invent stock numbers or policies.`,
  tools: [
    {
      id: "t_nav",
      name: "navigate",
      description: "Open any page in the app for the customer",
      clientSide: true,
      enabled: true,
      language: "javascript",
      code: NAVIGATE_CODE,
    },
    {
      id: "t_orders",
      name: "get_orders",
      description: "Look up the customer's order history",
      clientSide: false,
      enabled: true,
      language: "python",
      code: GET_ORDERS_CODE,
    },
    {
      id: "t_create",
      name: "create_order",
      description: "Place an order on the customer's behalf",
      clientSide: false,
      enabled: false,
      language: "python",
      code: CREATE_ORDER_CODE,
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
      description: "Synced from your store, updated as orders come in",
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
        input: prettyJson({ message: DEMO_QUESTION }),
        output: prettyJson({ product: "Aurora Lamp", intent: "stock_and_returns" }),
      });
    }

    const navTool = config.tools.find((t) => t.enabled && t.clientSide);
    if (navTool) {
      steps.push({
        kind: "tool",
        name: navTool.name,
        meta: "client-side",
        input: prettyJson({ path: "/products/aurora-lamp" }),
        output: prettyJson({ ok: true, path: "/products/aurora-lamp" }),
      });
    }

    const inventory = config.dataWindows.find((d) => d.enabled);
    const aurora = inventory ? asRecord(inventory.data["Aurora Lamp"]) : {};
    const stock =
      typeof aurora.stock === "number" ? aurora.stock : undefined;

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

/** Builds the declarative manifest shown in the Deploy view from live config. */
export function buildManifest(config: AgentConfig): string {
  const tools = config.tools.filter((t) => t.enabled).map((t) => `"${t.name}"`);
  const toolEntries = config.tools
    .filter((t) => t.enabled)
    .map(
      (t) =>
        `    "${t.name}": { "client_side": ${t.clientSide}, "lang": "${t.language}" }`
    )
    .join(",\n");
  const sreEntries = config.sres
    .filter((s) => s.enabled)
    .map(
      (s) =>
        `    "${s.name}": { "variables": [${s.variables
          .map((v) => `"${v}"`)
          .join(", ")}] }`
    )
    .join(",\n");

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
