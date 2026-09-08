import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a numeric USD amount as currency. The `/usage` endpoint now returns
 * numeric costs, so the frontend is responsible for formatting. Small amounts
 * are shown with extra precision so sub-cent usage costs remain legible.
 */
export function formatCurrency(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  // Use up to 4 fraction digits for tiny (sub-cent) amounts, 2 otherwise.
  const maximumFractionDigits = value !== 0 && Math.abs(value) < 0.01 ? 4 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
}
