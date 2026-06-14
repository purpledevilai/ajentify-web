import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { CopyPromptDialog } from "@/components/marketing/copy-prompt-dialog";
import { AgentDemo } from "./_sections/AgentDemo";

export default function LandingPage() {
  return (
    <>
      <AgentDemo />

      {/* Bottom CTA */}
      <section className="border-border/60 border-t">
        <div className="container mx-auto max-w-5xl px-6 py-24 text-center md:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            Prototype today. Scale when you&apos;re ready.
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-lg">
            Build your first agent in minutes on{" "}
            <span className="text-gradient-brand font-semibold">Ajentify</span>.
            Free to start — no credit card.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <CopyPromptDialog label="Copy starter prompt" className="rounded-full" />
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/sign-up">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
