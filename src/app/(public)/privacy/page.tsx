import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Ajentify",
  description:
    "What data Ajentify collects, how it is used, who it is shared with, and the controls you have over it.",
};

const LAST_UPDATED = "October 7, 2026";
const CONTACT_EMAIL = "keanu@ajentify.com";
const LINK = "text-primary underline-offset-4 hover:underline";

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "how-we-use-it", label: "How we use it" },
  { id: "ai-providers", label: "AI model providers" },
  { id: "connected-services", label: "Connected services" },
  { id: "google", label: "Google services" },
  { id: "sharing", label: "Who we share data with" },
  { id: "retention", label: "Retention and deletion" },
  { id: "security", label: "Security" },
  { id: "your-controls", label: "Your controls and rights" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-6 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-primary mb-3 font-mono text-xs uppercase tracking-[0.18em]">
          Legal
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Last updated: {LAST_UPDATED}
        </p>
        <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
          Ajentify is a platform for building and running AI agents. Agents
          only work if you trust us with the data that flows through them, so
          this page spells out what we collect, what we do with it, who else
          sees it, and how you get rid of it.
        </p>
      </header>

      <nav
        aria-label="Table of contents"
        className="border-border/60 bg-card/40 mb-14 rounded-xl border p-6"
      >
        <p className="text-foreground mb-3 text-sm font-semibold">Contents</p>
        <ol className="text-muted-foreground grid gap-1.5 text-sm sm:grid-cols-2">
          {TOC.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="hover:text-foreground inline-flex gap-2 transition-colors"
              >
                <span className="text-primary/70 w-5 shrink-0 font-mono text-xs leading-5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-14">
        <Section id="overview" title="Overview">
          <P>
            Ajentify is operated by <Strong>Ajentify, Inc.</Strong>{" "}
            (&quot;Ajentify&quot;, &quot;we&quot;, &quot;us&quot;). This policy
            covers the Ajentify platform at{" "}
            <ExtLink href="https://ajentify.com">ajentify.com</ExtLink>, the
            API at{" "}
            <ExtLink href="https://api.ajentify.com">api.ajentify.com</ExtLink>,
            and our SDKs and client libraries.
          </P>
          <P>Three things hold throughout:</P>
          <ul className="space-y-2">
            <Bullet>
              <Strong>Your data is yours.</Strong> We store it to run your
              agents and bill you for usage. Nothing else.
            </Bullet>
            <Bullet>
              <Strong>We do not train AI models.</Strong> Not on your data, not
              on anyone&apos;s. We only route your agents to model providers
              whose terms prohibit training on API traffic.
            </Bullet>
            <Bullet>
              <Strong>We do not sell data</Strong> or share it with advertisers,
              data brokers, or analytics vendors.
            </Bullet>
          </ul>
          <P>
            We are the data controller for the account and billing information
            you give us directly, and a processor for the content your agents
            handle on your behalf. If you build a product on Ajentify for your
            own users, you are responsible for your own privacy disclosures to
            them.
          </P>
        </Section>

        <Section id="what-we-collect" title="What we collect">
          <Sub>Account information</Sub>
          <P>
            Your name and email address when you sign up. If you sign in with
            Google or Microsoft we receive your name, email address, and
            profile picture from that provider and nothing more. We never see
            your password for those accounts.
          </P>

          <Sub>Content you create on the platform</Sub>
          <P>Everything below is scoped to your organization:</P>
          <ul className="space-y-2">
            <Bullet>
              <Strong>Agents</Strong>: prompts, the model you picked, tool
              lists, voice settings.
            </Bullet>
            <Bullet>
              <Strong>Tools, integrations, and MCP connections</Strong>: tool
              definitions, any custom tool code you write, and the OAuth tokens
              needed to call services you connect.
            </Bullet>
            <Bullet>
              <Strong>Contexts</Strong>: the message history of each
              conversation, including tool calls and the results that come back
              from connected services.
            </Bullet>
            <Bullet>
              <Strong>Documents, data windows, and structured outputs</Strong>:
              memory and schemas you store for agents to read and write.
            </Bullet>
          </ul>

          <Sub>Usage and billing</Sub>
          <P>
            Token counts, model used, timestamps, and your transaction history.
            Payments are handled by Stripe; we never see or store your card
            number.
          </P>

          <Sub>Server logs</Sub>
          <P>
            Request metadata (timestamps, endpoint, status, request IDs, error
            messages) for debugging, security, and abuse prevention. Logs are
            kept for 30 days. We run no third-party analytics or advertising
            trackers on the platform.
          </P>
        </Section>

        <Section id="how-we-use-it" title="How we use it">
          <P>We use the data above to:</P>
          <ul className="space-y-2">
            <Bullet>run your agents: send conversations to the model you selected, execute tools, and store the results so the agent has continuity;</Bullet>
            <Bullet>authenticate you and keep one organization&apos;s data separate from another&apos;s;</Bullet>
            <Bullet>meter usage and bill you;</Bullet>
            <Bullet>keep the service secure and fix things when they break;</Bullet>
            <Bullet>email you about your account (sign-in codes, invitations, billing, incidents).</Bullet>
          </ul>
          <P>
            We do not use your content for advertising, profiling, market
            research, or to build datasets. We do not read it, except with your
            permission for a specific support request, to investigate abuse, or
            where the law requires.
          </P>
        </Section>

        <Section id="ai-providers" title="AI model providers">
          <P>
            Ajentify does not run its own models. When an agent takes a turn,
            the system prompt, conversation, tool definitions, and tool results
            are sent over TLS to the provider hosting the model you selected,
            and the reply is streamed back. That is a real-time inference call;
            the provider does not keep the data to train on.
          </P>
          <P>
            We only offer models from providers whose commercial API terms
            prohibit training on customer inputs and outputs. Today that is:
          </P>
          <Table
            head={["Provider", "Training on API data", "Retention"]}
            rows={[
              [
                <ExtLink
                  key="openai"
                  href="https://developers.openai.com/api/docs/guides/your-data"
                >
                  OpenAI
                </ExtLink>,
                "Not used to train or improve models unless the customer opts in. We have not opted in.",
                "Abuse-monitoring logs up to 30 days, then deleted.",
              ],
              [
                <ExtLink
                  key="anthropic"
                  href="https://www.anthropic.com/legal/commercial-terms"
                >
                  Anthropic
                </ExtLink>,
                "Commercial Terms: \u201CAnthropic may not train models on Customer Content from Services.\u201D",
                "Inputs and outputs deleted within 30 days.",
              ],
            ]}
          />
          <P>
            We call each provider&apos;s API directly from our servers using
            open-source client libraries. There is no aggregator, gateway, or
            model hub in between, and we do not use any hosted tracing or
            observability service, so prompts and completions go to the model
            provider and nowhere else. We have not opted in to any
            data-sharing or &quot;improve the model&quot; program with any
            provider.
          </P>
          <P>
            If we add a provider in future, it will be held to the same
            standard: a contractual commitment not to train on API traffic. You
            choose which provider sees a given agent&apos;s data by choosing
            its model.
          </P>
        </Section>

        <Section id="connected-services" title="Connected services">
          <P>
            Agents become useful when they can act on your behalf in the tools
            you already use. You can connect an agent to a service such as
            Google Workspace, Microsoft 365, Atlassian Jira, or any server that
            speaks the Model Context Protocol (MCP). Connecting always goes
            through that service&apos;s own sign-in and consent screen, which
            shows you exactly which permissions are being requested.
          </P>
          <P>The same rules apply to every connected service:</P>
          <ul className="space-y-2">
            <Bullet>
              <Strong>Nothing is accessed until you connect it</Strong>, and
              afterwards only what the tools you enabled on an agent need.
            </Bullet>
            <Bullet>
              <Strong>Data is fetched on demand</Strong> when a tool runs. We
              do not sync, mirror, index, or cache your mailbox, calendar,
              files, or tickets.
            </Bullet>
            <Bullet>
              <Strong>Tool results live in the conversation context</Strong>{" "}
              and are sent to your selected model provider so the agent can
              decide what to do next. That is the full extent of where the
              data goes.
            </Bullet>
            <Bullet>
              <Strong>OAuth tokens are stored encrypted</Strong>, scoped to your
              organization, and deleted when you disconnect the service, delete
              your organization, or revoke access from the provider&apos;s
              side.
            </Bullet>
            <Bullet>
              <Strong>Connected-service data is never used to train models</Strong>,
              sold, or used for advertising, by us or by the model providers we
              route it to.
            </Bullet>
          </ul>
          <P>
            Each service is also governed by its provider&apos;s own terms and
            privacy policy.
          </P>
        </Section>

        <Section id="google" title="Google services">
          <P>
            Google asks apps that access Google user data to describe that
            access specifically, so this section does. Everything in{" "}
            <a href="#connected-services" className={LINK}>
              Connected services
            </a>{" "}
            applies here too.
          </P>

          <Sub>What Google user data we access</Sub>
          <P>
            Signing in with Google gives us your name, email address, and
            profile picture (the <Code>openid</Code>, <Code>email</Code>, and{" "}
            <Code>profile</Code> scopes). Beyond that, Google data is only
            accessed if you connect a Google Workspace service to an agent:
          </P>
          <Table
            head={["Service", "What an agent can access"]}
            rows={[
              [
                "Gmail",
                "Messages and threads (headers, body, labels, read state), drafts, and labels. Tools can search and read mail, create and send drafts and messages, apply labels, archive, and trash.",
              ],
              [
                "Google Calendar",
                "Your calendars, events (title, time, attendees, description, location), and free/busy availability. Tools can list, search, create, update, delete, and respond to events.",
              ],
              [
                "Google Drive, Docs, Sheets, Slides",
                "Metadata and contents of files the agent searches for or you point it at. Tools can search, read, create, copy, and update files.",
              ],
              [
                "Google Chat",
                "Spaces, memberships, messages, and read state. Tools can read conversations and send messages.",
              ],
              [
                "Google Contacts",
                "Your contacts and your organization\u2019s directory.",
              ],
            ]}
          />
          <P className="text-sm">
            The exact permissions for a connection are listed on Google&apos;s
            consent screen when you connect, and you can review or revoke them
            at any time from your{" "}
            <ExtLink href="https://myaccount.google.com/permissions">
              Google Account permissions
            </ExtLink>
            .
          </P>

          <Sub>How we use it</Sub>
          <P>
            Only to carry out the actions you, or the user of an agent you
            built, ask the agent to perform. When an agent calls a Google tool
            we fetch the result with the token you granted, add it to the
            conversation context, and send the conversation to the model you
            selected so it can produce the next reply. Google user data is not
            used for advertising, analytics, profiling, resale, credit
            decisions, or to build or improve any AI or machine-learning model,
            and we do not aggregate it across customers or derive datasets from
            it.
          </P>

          <Sub>How we store and share it</Sub>
          <P>
            Tokens and tool results are stored encrypted at rest in our
            database, scoped to your organization, and deleted as described in{" "}
            <a href="#retention" className={LINK}>
              Retention and deletion
            </a>
            . Google user data is shared with exactly one kind of third party:
            the AI model provider you selected, for real-time inference. Those
            providers are bound by terms that prohibit training on it. It is
            never transferred to anyone else, and never sold. Humans at
            Ajentify do not read it, except with your explicit permission for a
            support request, to investigate abuse, or where required by law.
          </P>

          <Sub>Limited Use</Sub>
          <Callout>
            <p className="text-foreground leading-7">
              Ajentify&apos;s use and transfer of information received from
              Google APIs adheres to the{" "}
              <ExtLink href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes">
                Google API Services User Data Policy
              </ExtLink>
              , including the Limited Use requirements. The use of raw or
              derived user data received from Google Workspace APIs adheres to
              the{" "}
              <ExtLink href="https://developers.google.com/workspace/workspace-api-user-data-developer-policy">
                Google Workspace API User Data and Developer Policy
              </ExtLink>
              , including the Limited Use requirements.
            </p>
          </Callout>
        </Section>

        <Section id="sharing" title="Who we share data with">
          <P>
            Only the subprocessors needed to run the service, and only for that
            purpose:
          </P>
          <Table
            head={["Subprocessor", "Purpose", "Data involved"]}
            rows={[
              [
                "Amazon Web Services",
                "Hosting, compute, database, storage, transactional email.",
                "All platform data, encrypted at rest.",
              ],
              [
                "OpenAI",
                "Inference when an OpenAI model is selected.",
                "That agent\u2019s prompt, conversation, tool definitions, and tool results.",
              ],
              [
                "Anthropic",
                "Inference when an Anthropic model is selected.",
                "That agent\u2019s prompt, conversation, tool definitions, and tool results.",
              ],
              [
                "Google, Microsoft, Atlassian, other connected services",
                "Sign-in identity, and the tool calls your agent makes once you connect a service.",
                "Your profile at sign-in; the requests your agent\u2019s tools make.",
              ],
              [
                "Stripe",
                "Payments.",
                "Billing contact and payment details. We never store card numbers.",
              ],
            ]}
          />
          <P>
            Beyond that, we disclose data only if the law requires it, to
            protect the rights and safety of Ajentify or others, or as part of a
            merger or acquisition, in which case this policy keeps applying to
            your data until you are told otherwise.
          </P>
        </Section>

        <Section id="retention" title="Retention and deletion">
          <P>We keep data for as long as it takes to provide the service to you, and no longer.</P>
          <Table
            head={["Data", "Kept until"]}
            rows={[
              [
                "Conversation contexts, including tool results from connected services",
                "You delete the context or its TTL expires. Contexts accept an optional ttl_days; contexts for public agents expire after 30 days by default.",
              ],
              [
                "Connected-service OAuth tokens",
                "You disconnect the service, delete your organization, or revoke access at the provider.",
              ],
              [
                "Agents, tools, documents, data windows, structured outputs",
                "You delete them or delete your organization.",
              ],
              [
                "Account and billing records",
                "You delete your account, except transaction records we must keep for tax and accounting law.",
              ],
              ["Server logs", "30 days."],
              [
                "At model providers",
                "OpenAI: up to 30 days of abuse-monitoring logs. Anthropic: deleted within 30 days.",
              ],
            ]}
          />
          <P>
            Deleting your organization or account removes everything above
            from our systems. Disconnecting a service stops access immediately
            and deletes its tokens; results already captured in conversation
            contexts remain until those contexts are deleted or expire, which
            you can do at any time.
          </P>
        </Section>

        <Section id="security" title="Security">
          <ul className="space-y-2">
            <Bullet>All traffic uses TLS 1.2 or higher.</Bullet>
            <Bullet>
              All data at rest, including tokens and conversation contexts, is
              encrypted with AWS-managed encryption.
            </Bullet>
            <Bullet>
              Every resource belongs to an organization and every request is
              authorized against it. One customer cannot reach another&apos;s
              data.
            </Bullet>
            <Bullet>
              Sessions use short-lived signed tokens. API keys can be rotated or
              revoked from the dashboard at any time.
            </Bullet>
            <Bullet>
              Provider API keys live in AWS Secrets Manager. OAuth credentials
              and connected-service tokens stay server-side and are never sent
              to the browser.
            </Bullet>
            <Bullet>
              Infrastructure runs on AWS in the Asia-Pacific (Melbourne)
              region. Model providers process inference in their own regions.
            </Bullet>
            <Bullet>
              Production access is limited to the people who operate the
              service.
            </Bullet>
          </ul>
          <P>
            No system is perfectly secure. If we learn of a breach affecting
            your data we will tell you without undue delay.
          </P>
        </Section>

        <Section id="your-controls" title="Your controls and rights">
          <P>
            Wherever you live, you can access, export, correct, and delete your
            data. Most of it is self-serve:
          </P>
          <Table
            head={["To", "Do this"]}
            rows={[
              ["Delete a conversation", "DELETE /context/{context_id}, or delete it in the dashboard."],
              ["Auto-expire conversations", "Set ttl_days when creating a context."],
              ["Delete an agent and everything it owns", "DELETE /agent/{agent_id}"],
              [
                "Disconnect a service",
                "Delete the connection or integration in the dashboard, or revoke Ajentify from the provider\u2019s account settings.",
              ],
              ["Choose which AI provider sees an agent\u2019s data", "Set the agent\u2019s model."],
              ["Export your data", "Every resource is readable as JSON through the API."],
              ["Delete your account or organization", "From your account or organization page in the dashboard."],
            ]}
          />
          <P>
            If you are in the EEA, UK, or somewhere with similar law, you can
            also object to or restrict processing and complain to your local
            supervisory authority. Email us and we will help.
          </P>
        </Section>

        <Section id="children" title="Children">
          <P>
            Ajentify is a developer platform and is not directed at children.
            We do not knowingly collect personal data from anyone under 16. If
            you think a child has given us data, contact us and we will delete
            it.
          </P>
        </Section>

        <Section id="changes" title="Changes">
          <P>
            We will update this page as the product changes. The date at the
            top always reflects the current version. If we materially change
            how we handle personal data, we will email active customers before
            it takes effect.
          </P>
        </Section>

        <Section id="contact" title="Contact">
          <P>
            Questions or requests about this policy or your data: email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
              {CONTACT_EMAIL}
            </a>
            .
          </P>
          <P className="text-sm">
            Looking for developer documentation? See the{" "}
            <Link href="/docs" className={LINK}>
              API docs
            </Link>
            .
          </P>
        </Section>
      </div>
    </div>
  );
}

/* ---------- local presentational helpers ---------- */

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display border-border/60 mb-5 border-b pb-3 text-2xl font-bold tracking-tight md:text-3xl">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-foreground pt-3 text-lg font-semibold">
      {children}
    </h3>
  );
}

function P({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-muted-foreground leading-7 ${className}`}>{children}</p>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="text-foreground font-semibold">{children}</strong>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-muted-foreground flex gap-3 leading-7">
      <span className="bg-primary mt-3 inline-block size-1.5 shrink-0 rounded-full" />
      <span>{children}</span>
    </li>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-secondary text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  );
}

function ExtLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK}
    >
      {children}
    </a>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-primary/40 bg-primary/5 rounded-xl border-l-4 border p-5">
      {children}
    </div>
  );
}

function Table({
  head,
  rows,
}: {
  head: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="border-border/60 overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-card/60">
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="text-foreground border-border/60 border-b px-4 py-3 font-semibold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-border/60 border-b last:border-b-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`text-muted-foreground px-4 py-3 align-top leading-6 ${
                    j === 0 ? "text-foreground font-medium" : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
