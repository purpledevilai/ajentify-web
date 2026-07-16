"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/marketing/code-block";
import { SlidingTabs, type TabItem } from "../_components/SlidingTabs";
import { CodeWindow } from "../_components/CodeWindow";

const TABS: TabItem[] = [
  { id: "server", label: "Server-side" },
  { id: "client", label: "Client-side" },
  { id: "async", label: "Async" },
];

const EXAMPLES: Record<string, { code: string; insight: string }> = {
  server: {
    code: `{
  "add_contact": {
    "name": "add_contact",
    "description": "Adds a contact to the database",
    "pass_context": true,
    "input_schema": {
      "type": "object",
      "properties": {
        "first_name": {
          "type": "string",
          "description": "The first name of the contact"
        },
        "email": {
          "type": "string",
          "description": "The email of the contact"
        }
      }
    },
    "code": "def add_contact(first_name, email, context):\\n    url = context['api_url']\\n    token = context['access_token']\\n    return requests.post(\\n        f'{url}/contacts',\\n        headers={'Authorization': f'Bearer {token}'},\\n        json={'first_name': first_name, 'email': email}\\n    ).json()"
  }
}`,
    insight:
      "Set variables when you create a context \u2014 access tokens, user IDs, API URLs \u2014 and pass them to tools programmatically. The agent never generates values it shouldn\u2019t.",
  },
  client: {
    code: `{
  "navigate_to_page": {
    "name": "navigate_to_page",
    "description": "Navigates the user to a specific page in the app",
    "is_client_side_tool": true,
    "input_schema": {
      "type": "object",
      "properties": {
        "path": {
          "type": "string",
          "description": "The URL path to navigate to"
        }
      }
    }
  }
}`,
    insight:
      "Client-side tools run where your agent executes, using your own code and auth. Building a web agent? It can piggyback on your logged-in user\u2019s access token and existing API calls \u2014 zero extra backend, zero service accounts.",
  },
  async: {
    code: `{
  "approve_refund": {
    "name": "approve_refund",
    "description": "Requests manager approval for a refund over $500",
    "pass_context": true,
    "is_async": true,
    "input_schema": {
      "type": "object",
      "properties": {
        "order_id": {
          "type": "string",
          "description": "The order to refund"
        },
        "amount": {
          "type": "number",
          "description": "The refund amount in dollars"
        },
        "reason": {
          "type": "string",
          "description": "Why the refund is being requested"
        }
      }
    },
    "code": "def approve_refund(order_id, amount, reason, context):\\n    ticket = approval_queue.create(\\n        type='refund',\\n        order_id=order_id,\\n        amount=amount,\\n        reason=reason,\\n        approver=context['manager_email']\\n    )\\n    return {'status': 'pending_approval', 'ticket_id': ticket.id}"
  }
}`,
    insight:
      "Need a human in the loop? Async tools let the agent call a tool and continue execution \u2014 then add the response later when it\u2019s ready. You or a parent agent can keep querying the agent for updates. Perfect for approvals, many agent threads, and long-running tasks.",
  },
};

export function ToolsPrimitiveSection() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const example = EXAMPLES[activeTab];

  return (
    <section className="border-t border-border/50 bg-muted/40">
      <div className="container mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em]">
          <span className="bg-primary inline-block size-2" />
          <span className="text-primary">02</span>
          <span className="text-border">/</span>
          <span className="text-muted-foreground">The Tool</span>
        </div>

        <div className="grid items-start gap-12 lg:grid-cols-[1.6fr_1fr]">
          <CodeWindow filename="ajentify.json">
            <div className="border-b border-white/10 bg-zinc-900/80 px-4 py-2">
              <SlidingTabs
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
            <CodeBlock code={example.code} className="rounded-none border-0" />
          </CodeWindow>

          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Create tools to{" "}
              <span className="text-gradient-brand">securely access your data</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
              Tools are how agents act on the real world &mdash; and that
              requires real authentication and security. Ajentify adapts to your
              auth standards, giving agents real power only where they're allowed.
            </p>

            <p
              key={activeTab}
              className="mt-8 text-xl font-semibold leading-snug tracking-tight text-foreground"
            >
              {example.insight}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
