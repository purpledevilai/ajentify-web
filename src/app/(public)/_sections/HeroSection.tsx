import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { CopyPromptDialog } from "@/components/marketing/copy-prompt-dialog";

export function HeroSection() {
  return (
    <section className="container mx-auto max-w-5xl px-6 py-24 md:py-32">
      <div className="text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium">
        <span className="bg-gradient-brand size-1.5 rounded-full" />
        Fully-hosted agent infrastructure
      </div>
      <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
        Build AI agents,{" "}
        <span className="text-gradient-brand">not infrastructure</span>.
      </h1>
      <p className="mt-6 max-w-2xl text-xl font-medium text-foreground/80 md:text-2xl">
        Prototype in an afternoon. Scale to production — on the same platform.
      </p>
      <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
        Ajentify handles message storage, tool orchestration, context, testing,
        and voice — so you skip the setup and start building. Spin up a real
        agent in minutes, then grow it as far as you want.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <CopyPromptDialog label="Copy starter prompt" />
        <Button asChild variant="outline" size="lg">
          <Link href="/sign-up">Start building — free</Link>
        </Button>
      </div>
      <p className="text-muted-foreground mt-6 text-sm">
        No credit card. 10xAgent went from a weekend prototype to a full
        production AI app — without leaving Ajentify.
      </p>
    </section>
  );
}
