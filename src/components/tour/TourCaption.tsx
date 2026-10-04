'use client';

/**
 * The pill that says what's on screen while a stop plays. The live region stays mounted for the whole tour and only
 * its text changes (a region that mounts with its content isn't announced); with no caption, there's no pill.
 */
export function TourCaption({ text, variant }: { text: string | null; variant: 'desktop' | 'phone' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 z-[9600] w-max max-w-[calc(100%-32px)] -translate-x-1/2"
      style={{ bottom: variant === 'phone' ? 'calc(env(safe-area-inset-bottom) + 88px)' : 112 }}
    >
      {text && (
        <div
          data-testid="tour-caption"
          className="rounded-full bg-[#1c1c1e]/85 px-4 py-2 text-center text-[14px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,.3)] backdrop-blur-lg"
        >
          {text}
        </div>
      )}
    </div>
  );
}
