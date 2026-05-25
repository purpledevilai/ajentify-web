"use client";

import { useEffect, useState } from "react";

/** Subscribe to a CSS media query. Returns false during SSR and until mounted. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

/** Matches the dashboard layout's `md:` breakpoint (sidebar hidden below). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
