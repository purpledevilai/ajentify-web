import { CodeBlock } from "@/components/marketing/code-block";

const CODE = `from ajentify_testing import SimAgent, TargetContext, run_conversation

name = "property_lookup"
description = "Agent should look up property details when asked"

def run(session):
    sim = SimAgent(session,
        persona="A buyer asking about a 3-bedroom house",
        first_message="What's the price for 42 Smith St?",
    )
    target = TargetContext(session, agent_id=session.env("AGENT_ID"))

    run_conversation(sim, target, max_turns=15)

    # Deterministic assertions — instant, zero-cost
    target.assert_called_tool("lookup_property")
    target.assert_message_contains("price guide")

    # LLM-powered assessments — semantic, subjective
    target.assess_true("Gave the user a price guide")
    target.assess_score("Professional sales approach", min=0.7)`;

export function TestingFrameworkSection() {
  return (
    <section className="border-t border-border/50">
      <div className="container mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="text-primary mb-3 text-sm font-semibold uppercase tracking-wider">
          Agent Testing
        </div>
        <div className="grid items-start gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Test your agents like you test your code
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              The{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                ajentify-testing
              </code>{" "}
              framework lets you write automated tests for your agents using
              simulated conversations, deterministic assertions, and LLM-powered
              assessments. Catch regressions before they reach production.
            </p>
            <p className="text-muted-foreground mt-3 text-[0.95rem]">
              And because your tests run on the same platform as your agent,
              they assert against the very same context window — no separate
              trace pipeline, no glue code.
            </p>
            <ul className="text-muted-foreground mt-6 space-y-3 text-[0.95rem]">
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0">&#x2713;</span>
                SimAgent role-plays real user scenarios against your agent
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0">&#x2713;</span>
                <span>
                  <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">assert_*</code> checks
                  for tool calls, message content, turn counts — instant and
                  deterministic
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0">&#x2713;</span>
                <span>
                  <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">assess_*</code> uses
                  LLM evaluation for subjective quality checks
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0">&#x2713;</span>
                Results saved as markdown reports, ready for CI integration
              </li>
            </ul>
          </div>

          <CodeBlock code={CODE} filename="test_property_lookup.py" />
        </div>
      </div>
    </section>
  );
}
