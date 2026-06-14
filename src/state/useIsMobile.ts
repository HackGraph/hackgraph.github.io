import { useEffect, useState } from 'react';

/** Matches Tailwind's `sm` breakpoint: true below 640px. */
const QUERY = '(max-width: 639.98px)';

/** Reactively tracks whether the viewport is in the mobile (sub-`sm`) range. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(QUERY).matches
      : false,
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
