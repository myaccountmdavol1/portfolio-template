/** Server-side first guess; the browser corrects it with a media query after hydration (useIsPhone). */
export function guessIsPhone(userAgent: string | null, secChUaMobile: string | null): boolean {
  if (secChUaMobile === '?1') return true;
  if (secChUaMobile === '?0') return false;
  return /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(userAgent ?? '');
}
