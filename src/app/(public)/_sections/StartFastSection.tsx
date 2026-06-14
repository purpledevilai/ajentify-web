import { CodeBlock } from "@/components/marketing/code-block";
import { CopyPromptDialog } from "@/components/marketing/copy-prompt-dialog";

const CODE = `# Point the SDK at your Ajentify org, then:

# 1 · Create a context for this user
context = ajentify.create_context(agent_id="agent_123")

# 2 · Send a message — storage, tools, and the
#     agentic loop are already handled for you
reply = ajentify.chat.add_human_message(
    context.id,
    "Book me a demo for Friday",
)

print(reply.message)  # -> the agent's response`;

const POINTS = [
  "Hosted agentic loop — no queues or servers to run",
  "Tools are plain functions in TypeScript or Python",
  "A working chat (and voice) endpoint, instantly",
];

export function StartFastSection() {
  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="container mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="text-primary mb-3 text-sm font-semibold uppercase tracking-wider">
          Start fast
        </div>
        <div className="grid items-start gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              From idea to a working agent in minutes
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              No infra to provision, no glue code, no agent framework to learn.
              Create an agent, give it tools, and Ajentify runs the loop —
              storage, orchestration, and context handled.
            </p>
            <ul className="text-muted-foreground mt-6 space-y-3 text-[0.95rem]">
              {POINTS.map((point) => (
                <li key={point} className="flex gap-3">
                  <span className="text-primary mt-1 shrink-0">&#x2713;</span>
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <CopyPromptDialog label="Copy a starter prompt for Claude Code" />
              <p className="text-muted-foreground mt-3 text-sm">
                Paste it into your AI editor and it scaffolds the whole agent.
              </p>
            </div>
          </div>

          <CodeBlock code={CODE} filename="quickstart.py" />
        </div>
      </div>
    </section>
  );
}
