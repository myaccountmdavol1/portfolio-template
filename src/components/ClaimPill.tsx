/**
 * Shown to visitors of a new Vercel-backend site until the owner claims it (src/app/page.tsx decides).
 * A plain link with no hooks, so it adds almost nothing to the visitor bundle. Above the desktop and phone,
 * below the lock screen and screensaver (z-[9800]).
 */
export function ClaimPill() {
  return (
    <a
      href="/admin"
      data-testid="claim-pill"
      className="fixed top-14 left-1/2 z-[9700] -translate-x-1/2 rounded-full bg-[#1d1c1a]/90 px-4 py-2 text-sm whitespace-nowrap text-white shadow-[0_8px_24px_rgba(0,0,0,.25)] backdrop-blur hover:bg-black"
    >
      Finish setting up &middot; <span className="font-semibold">Claim your site</span>
    </a>
  );
}
