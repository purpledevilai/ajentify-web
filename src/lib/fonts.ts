import { Geist } from "next/font/google";

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
