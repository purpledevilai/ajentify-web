import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { CopyPromptDialog } from "@/components/marketing/copy-prompt-dialog";
import { HeroSection } from "./_sections/HeroSection";
import { ProofStrip } from "./_sections/ProofStrip";
import { HowItComesTogether } from "./_sections/HowItComesTogether";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProofStrip />
      <HowItComesTogether />

      {/* Bottom CTA */}
      <section className="border-t border-border/50">
        <div className="container mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
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
