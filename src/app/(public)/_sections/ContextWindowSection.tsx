import { CodeBlock } from "@/components/marketing/code-block";
import { SectionLabel } from "@/components/marketing/section-label";
import { Braces, Database, SlidersHorizontal, Variable } from "lucide-react";

const CODE = `# Create a personalized context
context = ajentify.create_context(
    agent_id="agent_123",
    prompt_args={
        "ARG_USER_NAME": "Alice",
        "ARG_COMPANY": "Acme Corp",
    },
    user_defined={
        "user_id": "usr_456",
        "access_token": session.token,
        "api_url": "https://api.example.com",
    },
)

# Add messages or inject system prompts at any time
ajentify.add_messages(context.id, messages=[...])
ajentify.chat.add_ai_message(context.id, system_prompt="...")`;

const FEATURES = [
  {
    icon: Variable,
    title: "Prompt Arguments",
    description:
      "Personalize agent behavior per-user with dynamic prompt templating. Values are injected when creating a context.",
  },
  {
    icon: Braces,
    title: "User-Defined Variables",
    description:
      "Attach user IDs, access tokens, or API URLs to a context. Tools receive these automatically.",
  },
  {
    icon: Database,
    title: "Data Windows",
    description:
      "Real-time cached data injected into the context so the agent sees live information as soon as it's updated.",
  },
  {
    icon: SlidersHorizontal,
    title: "Message Control",
    description:
      "Add, replace, or remove messages at any point. Trigger AI responses with custom system prompts.",
  },
];

export function ContextWindowSection() {
  return (
    <section className="bg-muted/40 border-t border-border/50">
      <div className="container mx-auto max-w-5xl px-6 py-20 md:py-28">
        <SectionLabel index="04">Room to grow</SectionLabel>
        <div className="grid items-start gap-12 md:grid-cols-2">
          <CodeBlock code={CODE} filename="context.py" />

          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              The whole context window is yours — when you&apos;re ready for it
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Start with the defaults; reach for the internals only when your
              agent gets ambitious. Generate, edit, or remove any message,
              inject system prompts mid-conversation, and stream live data in
              with Data Windows. This is the headroom that means you never have
              to migrate off Ajentify.
            </p>
          </div>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-lg border border-border/60 bg-card p-5"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <div className="bg-primary/10 flex size-8 items-center justify-center rounded-md">
                  <Icon className="text-primary size-4" />
                </div>
                <h3 className="font-display text-sm font-semibold">{title}</h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
