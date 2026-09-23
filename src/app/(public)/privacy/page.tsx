import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Ajentify",
  description:
    "How Ajentify collects, uses, stores, and shares your data — including Google user data accessed through connected Google Workspace services — and the controls you have over it.",
};

const LAST_UPDATED = "September 22, 2026";
const CONTACT_EMAIL = "keanu@ajentify.com";
const LINK = "text-primary underline-offset-4 hover:underline";

const TOC = [
  { id: "summary", label: "The short version" },
  { id: "who-we-are", label: "Who we are" },
  { id: "what-we-collect", label: "What we collect and store" },
  { id: "google", label: "Google user data" },
  { id: "limited-use", label: "Limited Use disclosure" },
  { id: "other-connections", label: "Other connected services" },
  { id: "ai-providers", label: "AI model providers" },
  { id: "sharing", label: "How we share data" },
  { id: "retention", label: "Retention and deletion" },
  { id: "security", label: "Security" },
  { id: "your-rights", label: "Your rights and controls" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-6 py-16 md:py-24">
      {/* Header */}
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
          This policy explains what data Ajentify collects, how we use it, how
          long we keep it, who we share it with, and the controls you have. It
          applies to the Ajentify platform at{" "}
          <ExtLink href="https://ajentify.com">ajentify.com</ExtLink>, the
          Ajentify API at{" "}
          <ExtLink href="https://api.ajentify.com">api.ajentify.com</ExtLink>,
          and our SDKs. It includes a dedicated section on Google user data
          accessed through Google sign-in and connected Google Workspace
          services.
        </p>
      </header>

      {/* Table of contents */}
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
        {/* 1. Summary */}
        <Section id="summary" title="The short version">
          <ul className="space-y-3">
            <Bullet>
              <Strong>You own your data.</Strong> Everything you and your users
              send through Ajentify — prompts, conversations, connected-account
              data, documents — belongs to you. We store it only to run your
              agents and bill you for usage.
            </Bullet>
            <Bullet>
              <Strong>We do not train AI models.</Strong> Ajentify does not
              train, fine-tune, or improve any machine learning model using your
              data, ours or anyone else&apos;s. We are infrastructure, not a
              model lab.
            </Bullet>
            <Bullet>
              <Strong>
                Google user data is never used to train or improve generalized
                AI or ML models.
              </Strong>{" "}
              Not by us, and not by the model providers we route it to. See{" "}
              <a href="#google" className={LINK}>
                Google user data
              </a>{" "}
              and our{" "}
              <a href="#limited-use" className={LINK}>
                Limited Use disclosure
              </a>
              .
            </Bullet>
            <Bullet>
              <Strong>We do not sell your data</Strong>, share it with
              advertisers or data brokers, or use it for any purpose other than
              providing the Ajentify service to you.
            </Bullet>
            <Bullet>
              <Strong>You can delete everything.</Strong> Every resource has a
              delete endpoint, conversations can auto-expire, and you can
              disconnect any connected account at any time.
            </Bullet>
          </ul>
        </Section>

        {/* 2. Who we are */}
        <Section id="who-we-are" title="Who we are">
          <P>
            Ajentify is developed and operated by <Strong>Ajentify, Inc.</Strong>{" "}
            (&quot;Ajentify&quot;, &quot;we&quot;, &quot;us&quot;). Ajentify is
            a developer platform for building, deploying, and running AI agents.
            Developers (&quot;you&quot;) create agents that can hold
            conversations, call tools, and act on connected accounts on behalf
            of you or your end users.
          </P>
          <P>
            Ajentify is the data controller for account and billing information
            you give us directly, and a data processor for the content that flows
            through your agents on your behalf. If you build a product on
            Ajentify that serves your own end users, you are responsible for
            your own privacy disclosures to them.
          </P>
        </Section>

        {/* 3. What we collect */}
        <Section id="what-we-collect" title="What we collect and store">
          <Sub>Account information</Sub>
          <P>
            When you create an account we collect your name and email address.
            If you sign in with Google or Microsoft, we receive your name, email
            address, and profile picture from the identity provider (the{" "}
            <Code>openid email profile</Code> scopes) and use them only to create
            and authenticate your account. We do not receive or store your
            password for those providers.
          </P>

          <Sub>Platform resources</Sub>
          <P>
            The following resources are written to our database, scoped to your
            organization, when you use the platform:
          </P>
          <ul className="space-y-2">
            <Bullet>
              <Strong>Agents</Strong> — system prompt, selected model, tool list,
              voice configuration.
            </Bullet>
            <Bullet>
              <Strong>Tools and MCP connections</Strong> — tool names,
              descriptions, schemas, any custom tool code you author, and for
              connected services (including Google Workspace) the OAuth tokens
              needed to call them.
            </Bullet>
            <Bullet>
              <Strong>Contexts</Strong> — the message history of a conversation:
              user messages, agent replies, tool calls, and tool results
              (including data returned from connected services).
            </Bullet>
            <Bullet>
              <Strong>Documents and Data Windows</Strong> — structured memory you
              write to from outside the agent.
            </Bullet>
            <Bullet>
              <Strong>Structured Outputs</Strong> — schemas and the JSON your
              endpoints return.
            </Bullet>
            <Bullet>
              <Strong>Usage and billing records</Strong> — token counts,
              timestamps, model used, and transaction history. Card payments are
              processed by Stripe; we never see your full card number.
            </Bullet>
          </ul>

          <Sub>Operational logs</Sub>
          <P>
            Our servers keep request logs (timestamps, endpoint, status, request
            IDs, error messages) for debugging, security, and abuse prevention.
            We do not use third-party analytics or advertising trackers on the
            platform.
          </P>
        </Section>

        {/* 4. Google user data */}
        <Section id="google" title="Google user data">
          <P>
            Ajentify&apos;s use and transfer of information received from Google
            APIs adheres to the{" "}
            <ExtLink href="https://developers.google.com/terms/api-services-user-data-policy">
              Google API Services User Data Policy
            </ExtLink>
            , including the Limited Use requirements, and to the{" "}
            <ExtLink href="https://developers.google.com/workspace/workspace-api-user-data-developer-policy">
              Google Workspace API User Data and Developer Policy
            </ExtLink>
            . This section describes exactly what Google user data Ajentify
            accesses, how it is used, where it is stored, and with whom it is
            shared.
          </P>

          <Sub>How Ajentify gets access to Google data</Sub>
          <P>There are two ways Google data can enter Ajentify:</P>
          <ol className="list-decimal space-y-2 pl-5">
            <li className="text-muted-foreground leading-7">
              <Strong>Google sign-in.</Strong> You choose to sign in to Ajentify
              with your Google account. We receive your basic profile (name,
              email, picture) and nothing else.
            </li>
            <li className="text-muted-foreground leading-7">
              <Strong>Connecting a Google Workspace service to an agent.</Strong>{" "}
              From the Ajentify dashboard you explicitly connect a Google
              Workspace service — Gmail, Google Calendar, Google Drive, Docs,
              Sheets, Slides, Google Chat, or Google Contacts/People — through
              Google&apos;s OAuth consent screen. Ajentify connects to
              Google&apos;s official remote MCP servers (for example{" "}
              <Code>gmailmcp.googleapis.com</Code> and{" "}
              <Code>calendarmcp.googleapis.com</Code>) or, for legacy
              integrations, directly to the corresponding Google REST APIs. You
              then choose which specific tools from that connection an agent is
              allowed to use.
            </li>
          </ol>
          <P>
            No Google data is accessed until you complete Google&apos;s consent
            screen, and the only data accessed afterwards is what is required to
            run the tools you attached to your agent.
          </P>

          <Sub>What Google user data is accessed</Sub>
          <P>
            Depending on which services you connect and which tools you enable,
            Ajentify may access the following on your behalf:
          </P>
          <Table
            head={["Service", "Data accessed", "Scopes that may be requested"]}
            rows={[
              [
                "Gmail",
                "Email messages and threads (headers, body, labels, read state), drafts, and labels. Tools can search and read mail, create, update and send drafts and messages, apply or remove labels, archive, and trash.",
                "gmail.readonly, gmail.compose, gmail.send, gmail.modify, gmail.labels, gmail.drafts, gmail.metadata, gmail.settings.basic, mail.google.com",
              ],
              [
                "Google Calendar",
                "Calendar list, calendar settings, events (title, time, attendees, description, location), and free/busy availability. Tools can list, search, create, update, delete, and respond to events.",
                "calendar, calendar.readonly, calendar.events, calendar.events.readonly, calendar.events.freebusy, calendar.calendarlist(.readonly), calendar.calendars(.readonly), calendar.freebusy, calendar.settings.readonly, calendar.acls",
              ],
              [
                "Google Drive, Docs, Sheets, Slides",
                "File metadata, file contents, and sharing permissions for files the agent searches for or you point it to. Tools can search, read, create, copy, and update files, documents, spreadsheets, and presentations.",
                "drive, drive.readonly, drive.file, documents(.readonly), spreadsheets(.readonly), presentations(.readonly)",
              ],
              [
                "Google Chat",
                "Spaces, memberships, messages, and read state. Tools can search and list conversations and messages, send messages, and mark them read or unread.",
                "chat.spaces(.readonly), chat.memberships(.readonly), chat.messages(.readonly), chat.messages.create, chat.users.readstate(.readonly)",
              ],
              [
                "Google Contacts / People",
                "Your profile, your contacts, and your organization's directory.",
                "userinfo.profile, contacts.readonly, directory.readonly",
              ],
              [
                "Google sign-in",
                "Name, email address, profile picture.",
                "openid, email, profile",
              ],
            ]}
          />
          <P className="text-sm">
            Scope names above are abbreviated; the full identifiers are prefixed
            with <Code>https://www.googleapis.com/auth/</Code>. Which of these
            are actually requested depends on the service you connect. You can
            review and revoke every grant at any time from your{" "}
            <ExtLink href="https://myaccount.google.com/permissions">
              Google Account permissions page
            </ExtLink>
            .
          </P>

          <Sub>How Google user data is used</Sub>
          <P>
            Google user data is used for one purpose only: to perform the
            actions that you, or the end user of an agent you built, ask the
            agent to perform. Concretely, when an agent decides to call a Google
            tool (for example &quot;search my inbox for unread mail from
            Ariel&quot;):
          </P>
          <ol className="list-decimal space-y-2 pl-5">
            <li className="text-muted-foreground leading-7">
              Ajentify calls the Google MCP server or API using the OAuth token
              you granted, and receives the result (for example, a list of email
              threads).
            </li>
            <li className="text-muted-foreground leading-7">
              The result is appended to the conversation context so the agent
              has continuity across turns.
            </li>
            <li className="text-muted-foreground leading-7">
              The conversation, including that result, is sent to the AI model
              provider you selected for the agent (see{" "}
              <a href="#ai-providers" className={LINK}>
                AI model providers
              </a>
              ) so it can generate the next reply or decide the next action.
              This is a real-time inference call; the provider does not retain
              the data for training.
            </li>
          </ol>
          <P>
            That is the entire data path. Google user data is not used for
            advertising, analytics, profiling, market research, resale, credit
            decisions, or to build or improve any AI or ML model. We do not read
            it, aggregate it across customers, or derive datasets from it.
          </P>

          <Sub>How Google user data is stored</Sub>
          <ul className="space-y-2">
            <Bullet>
              <Strong>OAuth tokens</Strong> (access and refresh tokens) are
              stored in our database, encrypted at rest, scoped to your
              organization, and used only to call the Google service on your
              behalf. They are deleted when you delete the connection, when you
              delete your organization, or when you revoke access at Google.
            </Bullet>
            <Bullet>
              <Strong>Tool results</Strong> returned from Google (such as the
              contents of an email the agent read) are stored as part of the
              conversation context, encrypted at rest, until that context is
              deleted or expires. See{" "}
              <a href="#retention" className={LINK}>
                Retention and deletion
              </a>
              .
            </Bullet>
            <Bullet>
              We do <Strong>not</Strong> mirror, sync, index, or cache your
              mailbox, calendar, or Drive. Data is fetched on demand when a tool
              runs.
            </Bullet>
          </ul>

          <Sub>How Google user data is shared</Sub>
          <P>
            Google user data is transferred to exactly one category of third
            party: the AI model provider you selected for the agent, for the
            sole purpose of generating the agent&apos;s response in real time.
            The providers eligible to receive Google user data are contractually
            prohibited from using API inputs and outputs to train their models
            (see{" "}
            <a href="#ai-providers" className={LINK}>
              AI model providers
            </a>
            ). Google user data is never transferred to advertising platforms,
            data brokers, information resellers, or any other third party, and is
            never sold.
          </P>
          <P>
            We do not allow humans to read Google user data, except (a) with
            your explicit consent for a specific support or debugging request,
            (b) where necessary for security purposes such as investigating
            abuse, or (c) where required by law.
          </P>
        </Section>

        {/* 5. Limited Use */}
        <Section id="limited-use" title="Limited Use disclosure">
          <Callout>
            <p className="text-foreground leading-7">
              Ajentify&apos;s use of information received from Google APIs will
              adhere to the{" "}
              <ExtLink href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes">
                Google API Services User Data Policy
              </ExtLink>
              , including the Limited Use requirements. The use of raw or
              derived user data received from Google Workspace APIs will adhere
              to the Google User Data Policy, including the Limited Use
              requirements.
            </p>
          </Callout>
          <P>In particular, Ajentify:</P>
          <ul className="space-y-2">
            <Bullet>
              limits its use of Google user data to providing and improving the
              user-facing agent features you have configured and that are
              visible in the Ajentify dashboard and your agent&apos;s interface;
            </Bullet>
            <Bullet>
              does not transfer Google user data to anyone except as necessary
              to provide those features (real-time inference by your selected
              model provider), for security, or to comply with law;
            </Bullet>
            <Bullet>
              does not use, transfer, or sell Google user data — raw,
              aggregated, anonymized, or derived — to create, train, or improve
              any generalized or foundational machine learning or artificial
              intelligence model, and does not permit its model providers to do
              so;
            </Bullet>
            <Bullet>
              does not allow humans to read Google user data except as described
              above;
            </Bullet>
            <Bullet>
              does not use Google user data for advertising, credit-worthiness,
              lending, or resale.
            </Bullet>
          </ul>
        </Section>

        {/* 6. Other connections */}
        <Section id="other-connections" title="Other connected services">
          <P>
            Ajentify lets you connect agents to other services the same way —
            through their OAuth flow and either a remote MCP server or a direct
            API integration. Today this includes Microsoft 365 (Outlook),
            Atlassian Jira, GitHub, and any standards-compliant MCP server you
            point us at. The same rules apply to every connected service:
          </P>
          <ul className="space-y-2">
            <Bullet>
              tokens are stored encrypted, scoped to your organization, and
              deleted when you disconnect;
            </Bullet>
            <Bullet>
              data is fetched on demand to run the tools you enabled, stored only
              in the conversation context, and shared only with your selected
              model provider for inference;
            </Bullet>
            <Bullet>
              it is never used to train models, sold, or used for advertising.
            </Bullet>
          </ul>
          <P>
            Each connected service is also governed by that provider&apos;s own
            terms and privacy policy.
          </P>
        </Section>

        {/* 7. AI providers */}
        <Section id="ai-providers" title="AI model providers">
          <P>
            Ajentify does not operate its own models. When an agent runs, the
            active system prompt, conversation messages, tool schemas, and tool
            results are sent over TLS to the provider that hosts the model you
            selected, and the completion is streamed back. Ajentify calls each
            provider&apos;s API directly from our servers using the open-source{" "}
            <Code>langchain-openai</Code> and <Code>langchain-anthropic</Code>{" "}
            client libraries. We do not route traffic through model aggregators,
            gateways, or hubs, and we do not use LangSmith or any hosted tracing
            or observability service — no prompts or completions are sent to
            LangChain Inc. or anyone other than the model provider.
          </P>
          <P>
            We use each provider under its commercial API terms, on a paid,
            pay-as-you-go API plan. We have not opted in to any data-sharing,
            feedback, or &quot;improve the model&quot; program with any
            provider, and we never will on your behalf.
          </P>

          <Table
            head={["Provider", "Trains on API data?", "Retention", "Source"]}
            rows={[
              [
                "OpenAI (API platform)",
                "No. \u201CAs of March 1, 2023, data sent to the OpenAI API is not used to train or improve OpenAI models\u201D unless the customer opts in. We have not opted in.",
                "Abuse-monitoring logs up to 30 days, then deleted.",
                <ExtLink
                  key="openai"
                  href="https://developers.openai.com/api/docs/guides/your-data"
                >
                  OpenAI data controls
                </ExtLink>,
              ],
              [
                "Anthropic (Claude API)",
                "No. Commercial Terms of Service: \u201CAnthropic may not train models on Customer Content from Services.\u201D",
                "Inputs and outputs deleted within 30 days.",
                <ExtLink
                  key="anthropic"
                  href="https://www.anthropic.com/legal/commercial-terms"
                >
                  Anthropic Commercial Terms
                </ExtLink>,
              ],
              [
                "DeepSeek (Open Platform API)",
                "Permitted by default. DeepSeek\u2019s terms allow it to use Inputs and Outputs to improve its services, with an opt-out. Because of this, Google user data is never sent to DeepSeek (see below).",
                "No published retention window. Data processed in the People\u2019s Republic of China.",
                <ExtLink
                  key="deepseek"
                  href="https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html"
                >
                  DeepSeek Open Platform Terms
                </ExtLink>,
              ],
            ]}
          />

          <Sub>Google user data and model providers</Sub>
          <P>
            Agents that have a Google Workspace connection attached can only be
            run on model providers whose terms prohibit training on API inputs
            and outputs — currently OpenAI and Anthropic. Google user data is
            never sent to DeepSeek or to any other provider that permits training
            on customer data. If we add a provider in future, it will only be
            made available for agents with Google Workspace connections if it
            carries an equivalent contractual no-training commitment; otherwise
            it will be restricted in the same way DeepSeek is today.
          </P>
          <P>
            For all other data, you choose the provider by setting your
            agent&apos;s model. If you prefer that none of your data reach a
            given provider, simply do not select its models.
          </P>
        </Section>

        {/* 8. Sharing */}
        <Section id="sharing" title="How we share data">
          <P>
            We share data only with the subprocessors needed to operate the
            service, and only for that purpose:
          </P>
          <Table
            head={["Subprocessor", "Purpose", "Data involved"]}
            rows={[
              [
                "Amazon Web Services",
                "Hosting, compute, database, object storage, email delivery.",
                "All platform data, encrypted at rest.",
              ],
              [
                "OpenAI",
                "LLM inference when an OpenAI model is selected.",
                "Prompt, conversation, tool schemas and results for that agent.",
              ],
              [
                "Anthropic",
                "LLM inference when an Anthropic model is selected.",
                "Prompt, conversation, tool schemas and results for that agent.",
              ],
              [
                "DeepSeek",
                "LLM inference when a DeepSeek model is selected. Not available for agents with Google Workspace connections.",
                "Prompt, conversation, tool schemas and results for that agent.",
              ],
              [
                "Google",
                "Sign-in identity; Workspace MCP servers and APIs when you connect a Google service.",
                "Profile at sign-in; the tool calls your agent makes.",
              ],
              [
                "Microsoft",
                "Sign-in identity; Microsoft Graph when you connect Outlook.",
                "Profile at sign-in; the tool calls your agent makes.",
              ],
              [
                "Stripe",
                "Payment processing.",
                "Billing contact and payment details (we never store card numbers).",
              ],
            ]}
          />
          <P>
            We do not sell personal data, and we do not share it with
            advertising networks, data brokers, or analytics vendors. We may
            disclose data if required by law, to protect the rights and safety of
            Ajentify or others, or as part of a merger or acquisition — in which
            case this policy will continue to apply to your data until you are
            notified otherwise.
          </P>
        </Section>

        {/* 9. Retention */}
        <Section id="retention" title="Retention and deletion">
          <P>
            We keep data only as long as needed to provide the service to you.
          </P>
          <Table
            head={["Data", "Kept until"]}
            rows={[
              [
                "Conversation contexts (incl. tool results from connected services)",
                "You delete the context, or its TTL expires. Contexts created via the API accept an optional ttl_days. Contexts for public/unauthenticated agents expire after 30 days by default.",
              ],
              [
                "Connected-service OAuth tokens (Google, Microsoft, etc.)",
                "You delete the connection or integration, delete your organization, or revoke access at the provider.",
              ],
              [
                "Agents, tools, documents, data windows, structured outputs",
                "You delete them, or delete your organization.",
              ],
              [
                "Account and billing records",
                "Account deletion, except where we must retain transaction records for tax and accounting law.",
              ],
              [
                "Server logs",
                "Retained for a limited period for operations and security. Logs hold request metadata and error details, not your connected-account data.",
              ],
              [
                "At model providers",
                "OpenAI: abuse logs up to 30 days. Anthropic: deleted within 30 days. DeepSeek: per its own policy; never receives Google user data.",
              ],
            ]}
          />
          <P>
            Deleting your account or organization removes all of the above from
            our systems. If you delete a Google connection or revoke Ajentify
            from your Google Account, we stop accessing Google data immediately
            and the stored tokens are deleted; Google data already captured in
            conversation contexts remains until those contexts are deleted or
            expire, and you can delete them at any time.
          </P>
        </Section>

        {/* 10. Security */}
        <Section id="security" title="Security">
          <ul className="space-y-2">
            <Bullet>All traffic to and from Ajentify uses TLS 1.2 or higher.</Bullet>
            <Bullet>
              All data at rest, including OAuth tokens and conversation contexts,
              is encrypted using AWS-managed encryption.
            </Bullet>
            <Bullet>
              Every resource is scoped to an organization and every request is
              authorized against that organization; one customer cannot access
              another&apos;s data.
            </Bullet>
            <Bullet>
              Authentication uses short-lived signed JWTs; API keys can be
              rotated or revoked at any time from the dashboard.
            </Bullet>
            <Bullet>
              Model-provider API keys are held in AWS Secrets Manager. OAuth
              client credentials and connected-account tokens are stored
              server-side, encrypted at rest, and are never exposed to the
              browser.
            </Bullet>
            <Bullet>
              Our infrastructure runs on Amazon Web Services in the
              Asia-Pacific (Melbourne, Australia) region. Model providers process
              inference requests in their own regions.
            </Bullet>
            <Bullet>
              Access to production systems is limited to the people who operate
              the service.
            </Bullet>
          </ul>
          <P>
            No system is perfectly secure. If we learn of a breach affecting
            your data we will notify you without undue delay.
          </P>
        </Section>

        {/* 11. Rights */}
        <Section id="your-rights" title="Your rights and controls">
          <P>
            Regardless of where you live, you can access, export, correct, and
            delete your data. Most of this is self-serve:
          </P>
          <Table
            head={["You want to", "How"]}
            rows={[
              ["Delete a single conversation", "DELETE /context/{context_id}"],
              [
                "Auto-expire conversations",
                "Pass ttl_days when creating a context.",
              ],
              [
                "Delete an agent and everything it owns",
                "DELETE /agent/{agent_id}",
              ],
              [
                "Disconnect Google or another service",
                "Delete the MCP connection or integration in the dashboard, or revoke Ajentify from your Google Account permissions.",
              ],
              [
                "Choose which AI provider sees your data",
                "Set the agent's model_id.",
              ],
              [
                "Export your data",
                "Every resource is readable via the API in JSON.",
              ],
              [
                "Delete your account or organization",
                "From your account page in the dashboard, or email us.",
              ],
            ]}
          />
          <P>
            If you are in the EEA, UK, or a jurisdiction with similar law, you
            also have the right to object to or restrict processing and to lodge
            a complaint with your local supervisory authority. Email us and we
            will help.
          </P>
        </Section>

        {/* 12. Children */}
        <Section id="children" title="Children">
          <P>
            Ajentify is a developer platform and is not directed at children. We
            do not knowingly collect personal data from anyone under 16. If you
            believe a child has provided us data, contact us and we will delete
            it.
          </P>
        </Section>

        {/* 13. Changes */}
        <Section id="changes" title="Changes to this policy">
          <P>
            We will update this page as the product and the provider landscape
            change. The &quot;Last updated&quot; date at the top always reflects
            the current version. If we make a material change to how we handle
            Google user data or any other personal data, we will notify active
            customers by email before it takes effect.
          </P>
        </Section>

        {/* 14. Contact */}
        <Section id="contact" title="Contact">
          <P>
            Questions, requests, or concerns about this policy or your data:
            email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
              {CONTACT_EMAIL}
            </a>
            . We answer.
          </P>
          <P className="text-sm">
            Looking for developer documentation instead? See the{" "}
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
