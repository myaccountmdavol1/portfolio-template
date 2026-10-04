'use client';

import { canEmbedBooking } from '@/lib/booking';
import type { CalendarApp } from '@/lib/types';
import { Section, TextField, Toggle } from '../fields';
import { useContentEditor } from './useContentEditor';

export function CalendarForm({ app }: { app: CalendarApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  return (
    <Section title="Calendar">
      <TextField label="Heading" value={c.heading} onChange={(v) => set('heading', v)} />
      <TextField label="Note" value={c.note} placeholder="30-minute intro calls, Tue–Thu" onChange={(v) => set('note', v)} />
      <TextField label="Booking link" type="url" value={c.bookingUrl} onChange={(v) => set('bookingUrl', v)} hint="Your Cal.com, Calendly, or Google appointment page." />
      <Toggle label="Show the booking page inside the window" checked={c.embed} onChange={(v) => set('embed', v, true)} />
      <p className="m-0 text-[11px] text-[#6b675f]">
        {canEmbedBooking(c.bookingUrl)
          ? 'This service can be shown inside the window.'
          : 'This booking service can’t be shown inside other websites (Microsoft Bookings, for example, blocks it), so visitors get a “Book a time” button that opens it in a new tab.'}
      </p>
    </Section>
  );
}
