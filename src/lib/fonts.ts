import { Geist, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";

export const fontDisplay = Geist({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** Marketing display face — characterful grotesque, scoped to `.marketing`. */
export const fontMarketingDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-marketing-display",
  display: "swap",
});

/** Real monospace, used as a design texture across labels, chips and code. */
export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
