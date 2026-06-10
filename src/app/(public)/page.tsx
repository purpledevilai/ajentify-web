import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { HeroSection } from "./_sections/HeroSection";
import { EmbeddedChatSection } from "./_sections/EmbeddedChatSection";
import { ContextWindowSection } from "./_sections/ContextWindowSection";
import { TestingFrameworkSection } from "./_sections/TestingFrameworkSection";
import { VoiceSection } from "./_sections/VoiceSection";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <EmbeddedChatSection />
      <ContextWindowSection />
      <TestingFrameworkSection />
      <VoiceSection />

      {/* Bottom CTA */}
      <section className="border-t border-border/50">
        <div className="container mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            Start building with{" "}
            <span className="text-gradient-brand">Ajentify</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-lg">
            Free to get started. No credit card required.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Button asChild variant="gradient" size="lg">
              <Link href="/sign-up">Create an account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
