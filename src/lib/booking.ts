// Booking pages that allow being shown inside another site. Others (e.g. Microsoft Bookings, which sends
// X-Frame-Options: deny) only work in their own tab, so the Calendar app shows a button for them instead.
const EMBEDDABLE_HOSTS = ['cal.com', 'calendly.com', 'tidycal.com', 'zcal.co', 'savvycal.com', 'youcanbook.me'];

export function canEmbedBooking(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'calendar.google.com' && url.pathname.includes('/appointments')) return true;
  return EMBEDDABLE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** A friendly name for the service, shown on the booking button card. */
export function bookingServiceName(rawUrl: string): string | null {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, '');
    if (host.includes('bookings.cloud.microsoft') || host.includes('outlook.office') || host.includes('outlook.live')) return 'Microsoft Bookings';
    if (host.includes('calendly')) return 'Calendly';
    if (host.includes('cal.com')) return 'Cal.com';
    if (host.includes('google')) return 'Google Calendar';
    return null;
  } catch {
    return null;
  }
}
