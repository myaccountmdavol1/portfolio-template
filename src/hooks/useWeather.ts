'use client';

import { useEffect, useState } from 'react';
import { fetchWeather, type Weather } from '@/lib/weather';

const REFRESH_MS = 15 * 60 * 1000;

/** Current weather for a place, refreshed every 15 minutes. null while loading, if disabled, or on error. */
export function useWeather(latitude: number | null, longitude: number | null, units: 'fahrenheit' | 'celsius', enabled: boolean): Weather | null {
  const [weather, setWeather] = useState<{ key: string; value: Weather } | null>(null);
  const key = `${latitude},${longitude},${units}`;

  useEffect(() => {
    if (!enabled || latitude === null || longitude === null) return;
    let cancelled = false;
    const load = () =>
      fetchWeather(latitude, longitude, units).then(
        (value) => !cancelled && setWeather({ key, value }),
        () => {}, // weather is decoration; fail quietly
      );
    void load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, latitude, longitude, units, key]);

  return enabled && weather?.key === key ? weather.value : null;
}
