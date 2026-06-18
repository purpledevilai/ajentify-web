import type { Metadata } from "next";
import {
  fontDisplay,
  fontSans,
  fontMarketingDisplay,
  fontMono,
} from "@/lib/fonts";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ajentify",
  description: "Agent infrastructure for developers",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMarketingDisplay.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground font-sans min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
