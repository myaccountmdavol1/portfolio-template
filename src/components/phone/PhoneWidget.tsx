'use client';

import type { MouseEvent } from 'react';
import { ClockFace } from '@/components/apps/ClockView';
import { StatusCard } from '@/components/apps/StatusView';
import { BadgeShowcase } from '@/components/apps/WalletView';
import type { PhoneSlot, PortfolioApp } from '@/lib/types';
import type { OpenAppFn } from './HomeGrid';
import { selectedRing, useEditablePhoneItem } from './useEditablePhoneItem';

/** `slot` is "page:index", used by Edit-mode drag and drop. */
export function PhoneWidget({ app, onOpen, slot, size = '2x2' }: { app: PortfolioApp; onOpen: OpenAppFn; slot: string; size?: PhoneSlot['size'] }) {
  const edit = useEditablePhoneItem(app.id);
  const editProps = {
    'data-phone-slot': slot,
    'data-app-id': app.id,
    'data-size': size,
    'aria-pressed': edit ? edit.selected : undefined,
    ...edit?.handlers,
    style: edit?.style,
  };
  const ring = `${edit ? 'touch-none' : ''} ${edit?.selected ? selectedRing : ''}`;
  const open = (e: MouseEvent<HTMLButtonElement>) => onOpen(app.id, e.currentTarget.getBoundingClientRect());

  if (app.type === 'note') {
    return (
      <button
        type="button"
        aria-label={app.title}
        onClick={open}
        {...editProps}
        className={`phone-widget flex cursor-pointer flex-col overflow-hidden rounded-[22px] bg-white text-left shadow-[0_6px_18px_rgba(0,0,0,.15)] ${ring}`}
      >
        <span className="truncate bg-[#f7c948] px-3.5 py-2 text-[13px] font-semibold text-[#5a4300]">{app.title}</span>
        <span className="flex min-h-0 flex-col gap-1 px-3.5 py-2.5 text-xs leading-snug text-[#2b2618]">
          <span className="font-semibold">{app.content.title}</span>
          {app.content.items.slice(0, size === '4x4' ? 12 : 4).map((item, i) => (
            <span
              key={i}
              className="truncate"
              style={{ textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.7 : 1 }}
            >
              {item.text}
            </span>
          ))}
        </span>
      </button>
    );
  }

  if (app.type === 'wallet') {
    return (
      <button type="button" aria-label={app.title} onClick={open} {...editProps} className={`phone-widget flex cursor-pointer flex-col overflow-hidden rounded-[22px] text-left shadow-[0_6px_18px_rgba(0,0,0,.15)] ${ring}`}>
        <BadgeShowcase app={app} />
      </button>
    );
  }

  if (app.type === 'clock' || app.type === 'status') {
    return (
      <button
        type="button"
        aria-label={app.title}
        onClick={open}
        {...editProps}
        className={`phone-widget flex cursor-pointer flex-col overflow-hidden rounded-[22px] text-left shadow-[0_6px_18px_rgba(0,0,0,.15)] ${ring}`}
      >
        {app.type === 'clock' ? <ClockFace app={app} size="widget" /> : <StatusCard app={app} size="widget" />}
      </button>
    );
  }

  if (app.type === 'stats') {
    const bars = app.content.chart?.bars ?? [];
    const max = Math.max(1, ...bars.map((b) => b.value));
    return (
      <button
        type="button"
        aria-label={app.title}
        onClick={open}
        {...editProps}
        className={`phone-widget flex cursor-pointer flex-col gap-2 rounded-[22px] bg-white p-3.5 text-left text-[#1d1d1f] shadow-[0_6px_18px_rgba(0,0,0,.15)] ${ring}`}
      >
        <span className="text-[13px] font-semibold">{app.title}</span>
        {app.content.metrics.slice(0, size === '2x2' ? 2 : 4).map((m, i) => (
          <span key={i} className="flex min-w-0 items-baseline gap-1.5">
            <span className="text-[22px] font-bold leading-none tabular-nums">{m.value}</span>
            <span className="truncate text-[10px] text-[#6e6e73]">{m.label}</span>
          </span>
        ))}
        {bars.length > 0 && (
          <span aria-hidden className="mt-auto flex h-10 items-end gap-1.5">
            {bars.map((b, i) => (
              <span
                key={i}
                className="flex-1 rounded-sm bg-[#0a84ff]"
                style={{ height: `${(Math.max(0, b.value) / max) * 100}%` }}
              />
            ))}
          </span>
        )}
      </button>
    );
  }

  return null;
}
