'use client';

import type { LockNotification } from '@/lib/screensavers/lock';

/** The lock screen's notification banners (no made-up times: only what really happened). */
export function LockNotificationList({ notes }: { notes: LockNotification[] }) {
  if (notes.length === 0) return null;
  return (
    <ul aria-label="Notifications" className="m-0 flex w-full list-none flex-col gap-[7px] p-0">
      {notes.map((n, i) => (
        <li
          key={n.id}
          className="lock-note flex items-center gap-2.5 rounded-[14px] bg-[rgba(40,40,40,.42)] px-3 py-2.5 text-[13px] backdrop-blur-[22px] backdrop-saturate-150"
          style={{ animationDelay: `${i * 250}ms` }}
        >
          {n.art ? (
            // eslint-disable-next-line @next/next/no-img-element -- Spotify album art
            <img src={n.art} alt="" width={34} height={34} className="h-[34px] w-[34px] flex-none rounded-md object-cover" />
          ) : (
            <span aria-hidden className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] text-base" style={{ background: n.color }}>
              {n.icon}
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="font-semibold">{n.app}</b>
            <span className="truncate opacity-85">{n.text}</span>
          </span>
          {n.live && (
            <span aria-hidden className="now-playing-bars flex h-3.5 flex-none items-end gap-[2px]">
              <span />
              <span />
              <span />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
