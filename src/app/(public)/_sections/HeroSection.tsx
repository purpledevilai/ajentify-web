import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { CopyPromptDialog } from "@/components/marketing/copy-prompt-dialog";

export function HeroSection() {
  return (
    <section className="marketing-grid border-border/60 relative overflow-hidden border-b">
      <div className="container mx-auto max-w-5xl px-6 py-20 md:py-24">
        <div className="fig-label text-muted-foreground mb-5 flex items-center gap-2">
          <span className="bg-primary inline-block size-2" />
          Fully-hosted agent infrastructure
        </div>
        <h1 className="font-display text-4xl font-extrabold leading-[1.02] tracking-tight md:text-5xl">
          Build AI agents,
          <br />
          <span className="text-gradient-brand">not infrastructure.</span>
        </h1>
        <p className="text-muted-foreground mt-5 max-w-xl text-lg">
          Prototype in an afternoon. Scale to production — on the same platform.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CopyPromptDialog
            label="Copy starter prompt"
            size="md"
            className="rounded-full"
          />
          <Button asChild variant="outline" size="md" className="rounded-full">
            <Link href="/sign-up">Start building — free</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
