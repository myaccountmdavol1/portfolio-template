// Open-Meteo: free, no API key, CORS-enabled. https://open-meteo.com/en/docs

export interface Weather {
  temperature: number;
  code: number;
  isDay: boolean;
}

export interface Place {
  name: string;
  region: string; // "Massachusetts, United States"
  latitude: number;
  longitude: number;
  timeZone: string;
}

/** WMO weather code → emoji and short label. */
export function describeWeather(code: number, isDay = true): { emoji: string; label: string } {
  if (code === 0) return isDay ? { emoji: '☀️', label: 'Clear' } : { emoji: '🌙', label: 'Clear' };
  if (code <= 2) return isDay ? { emoji: '🌤️', label: 'Partly cloudy' } : { emoji: '☁️', label: 'Partly cloudy' };
  if (code === 3) return { emoji: '☁️', label: 'Cloudy' };
  if (code === 45 || code === 48) return { emoji: '🌫️', label: 'Fog' };
  if (code >= 51 && code <= 57) return { emoji: '🌦️', label: 'Drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { emoji: '🌧️', label: 'Rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { emoji: '🌨️', label: 'Snow' };
  if (code >= 95) return { emoji: '⛈️', label: 'Thunderstorms' };
  return { emoji: '🌡️', label: 'Weather' };
}

export function weatherUrl(latitude: number, longitude: number, units: 'fahrenheit' | 'celsius'): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,is_day',
    temperature_unit: units,
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

export async function fetchWeather(latitude: number, longitude: number, units: 'fahrenheit' | 'celsius'): Promise<Weather> {
  const res = await fetch(weatherUrl(latitude, longitude, units));
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const json = (await res.json()) as { current: { temperature_2m: number; weather_code: number; is_day: number } };
  return { temperature: Math.round(json.current.temperature_2m), code: json.current.weather_code, isDay: json.current.is_day === 1 };
}

export async function searchPlaces(query: string): Promise<Place[]> {
  if (query.trim().length < 2) return [];
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query.trim(), count: '6', language: 'en' })}`);
  if (!res.ok) return [];
  const json = (await res.json()) as {
    results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone: string }[];
  };
  return (json.results ?? []).map((r) => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
    timeZone: r.timezone,
  }));
}

/** "7:16 PM" (or "19:16") in any IANA time zone; falls back to the visitor's zone if the name is invalid. */
export function formatZonedTime(date: Date, timeZone: string, clock24: boolean): string {
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: !clock24 };
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
}

/** "Mon, Sep 29" in the given zone. */
export function formatZonedDay(date: Date, timeZone: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
}
