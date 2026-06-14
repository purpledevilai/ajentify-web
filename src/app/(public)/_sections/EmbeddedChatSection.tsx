import { CodeBlock } from "@/components/marketing/code-block";
import { MessageSquare } from "lucide-react";

const CODE = `import { AjentifyProvider, defineClientSideTools } from '@ajentify/chat';
import { ChatPanel } from '@ajentify/chat/ui';

const tools = defineClientSideTools({
  navigate: ({ path }) => {
    navigate(path);
    return { ok: true, path };
  },
  create_product: async ({ name, price }) => {
    const product = await api.createProduct({ name, price });
    return { ok: true, product };
  },
});

<AjentifyProvider config={{ onAjentifyProxyRequest, tools }}>
  <ChatPanel title="Assistant">
    <YourApp />
  </ChatPanel>
</AjentifyProvider>`;

const PROMPTS = [
  "Where do I configure my billing settings?",
  "Create a new product called 'Summer Sale Bundle'",
  "Show me all users who signed up this week",
];

export function EmbeddedChatSection() {
  return (
    <section className="border-t border-border/50">
      <div className="container mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="text-primary mb-3 text-sm font-semibold uppercase tracking-wider">
          Frontend SDK
        </div>
        <div className="grid items-start gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              An agent that actually drives your app
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">@ajentify/chat</code>{" "}
              drops an AI assistant into your product that can navigate routes,
              read live page data, fill forms, and control UI state — through
              client-side tools you write in plain TypeScript. Not a chatbot in
              a corner. A copilot that operates your app like your best user
              would.
            </p>
            <ul className="text-muted-foreground mt-6 space-y-3 text-[0.95rem]">
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0">&#x2713;</span>
                Navigate users to any page or setting
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0">&#x2713;</span>
                Read and act on visible page data
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0">&#x2713;</span>
                Fill forms and trigger actions on behalf of the user
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0">&#x2713;</span>
                Available 24/7 — knows the platform as well as the developers do
              </li>
            </ul>

            <div className="mt-10 space-y-3">
              {PROMPTS.map((prompt) => (
                <div
                  key={prompt}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3"
                >
                  <MessageSquare className="text-primary size-4 shrink-0" />
                  <span className="text-sm text-foreground/80">{prompt}</span>
                </div>
              ))}
            </div>
          </div>

          <CodeBlock code={CODE} filename="App.tsx" />
        </div>
      </div>
    </section>
  );
}
