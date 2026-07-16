"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/marketing/code-block";
import { SlidingTabs, type TabItem } from "../_components/SlidingTabs";

const DEPLOY_TABS: TabItem[] = [
  { id: "api", label: "API" },
  { id: "web-chat", label: "Web Chat" },
];

const API_CODE = `const context = await fetch('https://api.ajentify.com/context', {
    method: 'POST',
    headers: { 'Authorization': AJENTIFY_API_KEY },
    body: JSON.stringify({
        agent_id: AGENT_THAT_HANDLES_THE_EMAILS
    })
}).then(res => res.json());

const response = await fetch('https://api.ajentify.com/chat', {
    method: 'POST',
    headers: { 'Authorization': AJENTIFY_API_KEY },
    body: JSON.stringify({
        context_id: context.context_id,
        message: "Go through the emails, log the bugs in jira, and respond nicely"
    })
}).then(res => res.json());

console.log(response.response);`;

const WEB_CHAT_FILES = [
  {
    id: "frontend",
    label: "App.tsx",
    code: `import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AjentifyProvider, AjentifyProxyRequest } from '@ajentify/chat';
import { ChatPanel } from '@ajentify/chat/ui';

const navigate = useNavigate();
const [chatOpen, setChatOpen] = useState(false);

const onAjentifyProxyRequest = async (request: AjentifyProxyRequest) => {
    return await fetch('https://yourbackend.com/ajentify-proxy', {
        method: 'POST',
        headers: { 'Authorization': YOUR_LOGGED_IN_USERS_ACCESS_TOKEN },
        body: JSON.stringify(request)
    }).then(res => res.json())
}

const clientSideTools = useCallback(async (toolName, args) => {
    switch (toolName) {
        case "navigate":
            navigate(args.path);
            return { success: \`navigated to \${args.path}\` }
        case "get_user":
            return await api.get_user()
    }
}, [])

<AjentifyProvider
    config={{
        onAjentifyProxyRequest,
        clientSideTools
    }}
>
    <ChatPanel open={chatOpen} onOpenChange={setChatOpen}>
        <App />
    </ChatPanel>
</AjentifyProvider>`,
  },
  {
    id: "backend",
    label: "server.ts",
    code: `app.post('/ajentify-proxy', async (req, res) => {

    const auth = req.headers.authorization.replace('Bearer ', '');
    const user = await getUserWithAuth(auth);

    // With the authed user you can scope to their data
    // client_id is how we identify this end-user to Ajentify

    switch (req.body.type) {

        case 'create_context':
            res.json(await fetch('https://api.ajentify.com/context', {
                method: 'POST',
                headers: { 'Authorization': AJENTIFY_API_KEY },
                body: JSON.stringify({
                    agent_id: AGENT_ID,
                    client_id: user.client_id
                })
            }).then(r => r.json()))
            break;

        case 'generate_access_token':
            res.json(await fetch('https://api.ajentify.com/generate-access-token', {
                method: 'POST',
                headers: { 'Authorization': AJENTIFY_API_KEY },
                body: JSON.stringify({
                    client_id: user.client_id
                })
            }).then(r => r.json()))
            break;

        case 'get_context':
            res.json(await fetch(\`https://api.ajentify.com/context/\${req.body.contextId}\`, {
                headers: { 'Authorization': AJENTIFY_API_KEY },
                query: { client_id: user.client_id }
            }).then(r => r.json()))
            break;

        case 'get_context_history':
            res.json(await fetch('https://api.ajentify.com/context-history', {
                headers: { 'Authorization': AJENTIFY_API_KEY },
                query: { client_id: user.client_id }
            }).then(r => r.json()))
            break;

        case 'delete_context':
            res.json(await fetch(\`https://api.ajentify.com/context/\${req.body.contextId}\`, {
                method: 'DELETE',
                headers: { 'Authorization': AJENTIFY_API_KEY },
                query: { client_id: user.client_id }
            }).then(r => r.json()))
            break;
    }
})`,
  },
];

const DEPLOY_INSIGHTS: Record<string, string> = {
  api: "Two fetches. Create a context, send a message. That\u2019s the entire interface.",
  "web-chat":
    "The React SDK handles context management, token streaming, and tool dispatch. Your backend proxies API calls so the org key never touches the browser.",
};

export function DeploySection() {
  const [activeTab, setActiveTab] = useState(DEPLOY_TABS[0].id);
  const [activeFile, setActiveFile] = useState(WEB_CHAT_FILES[0].id);

  return (
    <section className="border-t border-border/50">
      <div className="container mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em]">
            <span className="bg-primary inline-block size-2" />
            <span className="text-primary">03</span>
            <span className="text-border">/</span>
            <span className="text-muted-foreground">Deploy</span>
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            <span className="text-gradient-brand">Ship it</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
            There's two main ways to put your agent to work. Call the API directly from any
            backend, or embed it in your web app with the React SDK.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <SlidingTabs
            variant="default"
            tabs={DEPLOY_TABS}
            activeTab={activeTab}
            onTabChange={(id) => {
              setActiveTab(id);
              if (id === "web-chat") setActiveFile(WEB_CHAT_FILES[0].id);
            }}
          />
        </div>

        <div className="mx-auto mt-8 max-w-4xl">
          {activeTab === "api" && (
            <CodeBlock code={API_CODE} filename="workflow.js" />
          )}

          {activeTab === "web-chat" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 font-mono text-sm">
                <span className="text-emerald-400">$</span>
                <span className="text-zinc-200">
                  npm install @ajentify/chat
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10 shadow-2xl">
                <div className="flex items-center border-b border-white/10 bg-zinc-900">
                  <span className="flex gap-1.5 px-4 py-2.5">
                    <span className="size-3 rounded-full bg-[#ff5f57]" />
                    <span className="size-3 rounded-full bg-[#febc2e]" />
                    <span className="size-3 rounded-full bg-[#28c840]" />
                  </span>
                  <div className="-mb-px flex">
                    {WEB_CHAT_FILES.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setActiveFile(file.id)}
                        className={cn(
                          "border-b-2 px-4 py-2.5 text-xs font-medium transition-colors",
                          activeFile === file.id
                            ? "border-primary text-zinc-200"
                            : "border-transparent text-zinc-500 hover:text-zinc-400"
                        )}
                      >
                        {file.label}
                      </button>
                    ))}
                  </div>
                </div>
                <CodeBlock
                  code={
                    WEB_CHAT_FILES.find((f) => f.id === activeFile)!.code
                  }
                  className="rounded-none border-0"
                />
              </div>
            </div>
          )}

          <p className="text-muted-foreground mt-6 text-center text-sm leading-relaxed">
            {DEPLOY_INSIGHTS[activeTab]}
          </p>
        </div>
      </div>
    </section>
  );
}
