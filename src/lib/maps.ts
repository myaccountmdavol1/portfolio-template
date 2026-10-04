import type { PlaceKind } from './types';

export const PLACE_EMOJI: Record<PlaceKind, string> = { home: '🏠', school: '🎓', work: '💼', travel: '✈️', other: '📍' };

/** An OpenStreetMap embed centred on a point, with a marker. No API key needed. */
export function osmEmbedUrl(latitude: number, longitude: number, span = 0.06): string {
  const bbox = [longitude - span, latitude - span * 0.6, longitude + span, latitude + span * 0.6].map((n) => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?${new URLSearchParams({ bbox, layer: 'mapnik', marker: `${latitude},${longitude}` })}`;
}

export function osmLink(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=12/${latitude}/${longitude}`;
}

/** The days to draw for a month grid (Sunday first), with nulls for blank leading cells. */
export function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  return [...Array.from({ length: first }, () => null), ...Array.from({ length: days }, (_, i) => i + 1)];
}
