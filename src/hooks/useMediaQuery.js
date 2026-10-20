"use client";

import { useEffect, useState } from "react";

/** True when the CSS media query matches. Always false during SSR / first paint. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Tailwind `lg` breakpoint — where the sidebar switches from drawer to docked. */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
