import { Mic, MonitorSpeaker, Phone, Wrench } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: MonitorSpeaker,
    title: "One agent, two modalities",
    description: "Same prompt, same tools, same tests — chat and voice from a single agent definition.",
  },
  {
    icon: Mic,
    title: "ElevenLabs voice synthesis",
    description: "Choose from a library of natural-sounding voices for text-to-speech output.",
  },
  {
    icon: Phone,
    title: "Works anywhere WebRTC works",
    description: "Browsers, mobile apps, kiosks, IoT — if it supports WebRTC, it can host a voice agent.",
  },
  {
    icon: Wrench,
    title: "Full tool execution",
    description: "Voice agents call the same tools as chat agents. Look up data, take actions, respond with results.",
  },
];

export function VoiceSection() {
  return (
    <section className="bg-muted/40 border-t border-border/50">
      <div className="container mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="text-primary mb-3 text-sm font-semibold uppercase tracking-wider">
          Voice Agents
        </div>
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Same agent, now with a voice
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            The same agent you build in Ajentify — same prompt, same tools, same
            tests — can power a WebRTC voice experience. Ajentify&apos;s voice system
            handles speech-to-text, LLM invocation, and text-to-speech with an
            ElevenLabs voice of your choice. Deploy it anywhere you can put a
            WebRTC client.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
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

        <div className="mt-14 flex items-center justify-center">
          <div className="relative flex items-center gap-6 rounded-2xl border border-border/40 bg-card px-10 py-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="bg-primary/10 flex size-14 items-center justify-center rounded-xl">
                <svg className="text-primary size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
              </div>
              <span className="text-muted-foreground text-xs font-medium">Chat</span>
            </div>

            <div className="text-muted-foreground flex flex-col items-center gap-0.5">
              <span className="text-xs">Same agent</span>
              <div className="flex items-center gap-1">
                <div className="bg-border h-px w-8" />
                <div className="bg-primary size-2 rounded-full" />
                <div className="bg-border h-px w-8" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <div className="bg-primary/10 flex size-14 items-center justify-center rounded-xl">
                <Mic className="text-primary size-7" />
              </div>
              <span className="text-muted-foreground text-xs font-medium">Voice</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
