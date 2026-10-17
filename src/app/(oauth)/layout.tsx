import { Logo } from "@/components/primitives/logo";

/**
 * Minimal chrome for the MCP OAuth consent flow: no sidebar, no top bar —
 * just the logo above a centered card. Auth gating happens in the page.
 */
export default function OAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-8">
        <Logo withWordmark size={44} />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
