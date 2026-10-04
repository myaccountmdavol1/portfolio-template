import { describe, expect, it } from 'vitest';
import { describeWeather, formatZonedDay, formatZonedTime, weatherUrl } from './weather';

describe('describeWeather', () => {
  it('maps WMO codes to an emoji and label', () => {
    expect(describeWeather(0)).toEqual({ emoji: '☀️', label: 'Clear' });
    expect(describeWeather(0, false).emoji).toBe('🌙');
    expect(describeWeather(63).label).toBe('Rain');
    expect(describeWeather(73).label).toBe('Snow');
    expect(describeWeather(95).label).toBe('Thunderstorms');
  });
});

describe('formatZonedTime / formatZonedDay', () => {
  const noonUtc = new Date('2026-09-29T12:00:00Z');
  it('formats in the given time zone', () => {
    expect(formatZonedTime(noonUtc, 'America/New_York', false)).toBe('8:00 AM');
    expect(formatZonedTime(noonUtc, 'Asia/Tokyo', true)).toBe('21:00');
    expect(formatZonedDay(noonUtc, 'Asia/Tokyo')).toBe('Tue, Sep 29');
  });
  it('does not throw on a bad zone', () => {
    expect(() => formatZonedTime(noonUtc, 'Not/AZone', false)).not.toThrow();
  });
});

describe('weatherUrl', () => {
  it('asks Open-Meteo for current conditions in the chosen units', () => {
    const url = new URL(weatherUrl(42.36, -71.06, 'celsius'));
    expect(url.hostname).toBe('api.open-meteo.com');
    expect(url.searchParams.get('temperature_unit')).toBe('celsius');
    expect(url.searchParams.get('current')).toContain('weather_code');
  });
});
