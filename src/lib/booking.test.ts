import { describe, expect, it } from 'vitest';
import { bookingServiceName, canEmbedBooking } from './booking';

describe('canEmbedBooking', () => {
  it('allows services that permit framing', () => {
    expect(canEmbedBooking('https://cal.com/jordan/intro')).toBe(true);
    expect(canEmbedBooking('https://calendly.com/jordan')).toBe(true);
    expect(canEmbedBooking('https://calendar.google.com/calendar/appointments/schedules/abc')).toBe(true);
  });

  it('refuses services that block framing, and bad URLs', () => {
    expect(canEmbedBooking('https://outlook.office.com/bookwithme/user/abc')).toBe(false);
    expect(canEmbedBooking('https://bookings.cloud.microsoft/bookwithme/user/abc')).toBe(false);
    expect(canEmbedBooking('http://cal.com/x')).toBe(false);
    expect(canEmbedBooking('not a url')).toBe(false);
    expect(canEmbedBooking('https://evilcal.com.attacker.dev/')).toBe(false);
  });
});

describe('bookingServiceName', () => {
  it('names common services', () => {
    expect(bookingServiceName('https://bookings.cloud.microsoft/bookwithme/x')).toBe('Microsoft Bookings');
    expect(bookingServiceName('https://calendly.com/x')).toBe('Calendly');
    expect(bookingServiceName('https://example.com')).toBeNull();
  });
});
