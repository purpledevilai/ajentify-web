import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { CopyPromptDialog } from "@/components/marketing/copy-prompt-dialog";

export function HeroSection() {
  return (
    <section className="marketing-grid border-border/60 relative overflow-hidden border-b">
      <div className="container mx-auto max-w-5xl px-6 py-24 md:py-36">
        <div className="fig-label text-muted-foreground mb-7 flex items-center gap-2">
          <span className="bg-primary inline-block size-2" />
          Fully-hosted agent infrastructure
        </div>
        <h1 className="font-display text-5xl font-extrabold leading-[0.92] tracking-tight md:text-7xl lg:text-8xl">
          Build AI agents,
          <br />
          <span className="text-gradient-brand">not infrastructure.</span>
        </h1>
        <p className="mt-8 max-w-2xl text-xl font-medium text-foreground/80 md:text-2xl">
          Prototype in an afternoon. Scale to production — on the same platform.
        </p>
        <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
          Ajentify handles message storage, tool orchestration, context,
          testing, and voice — so you skip the setup and start building. Spin up
          a real agent in minutes, then grow it as far as you want.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <CopyPromptDialog label="Copy starter prompt" className="rounded-full" />
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/sign-up">Start building — free</Link>
          </Button>
        </div>
        <p className="text-muted-foreground border-border/70 mt-10 max-w-xl border-l-2 pl-4 text-sm leading-relaxed">
          No credit card. 10xAgent went from a weekend prototype to a full
          production AI app — without leaving Ajentify.
        </p>
      </div>
    </section>
  );
}
