// Current-weather codes: https://open-meteo.com/en/docs (WMO interpretation).
export const WEATHER_CONDITIONS = [
  { codes: [0], name: 'Sonnig', icon: '☀️' },
  { codes: [1], name: 'Überwiegend klar', icon: '🌤️' },
  { codes: [2], name: 'Teilweise bewölkt', icon: '⛅' },
  { codes: [3], name: 'Bedeckt', icon: '☁️' },
  { codes: [45, 48], name: 'Nebel', icon: '🌫️' },
  { codes: [51, 53, 55], name: 'Nieselregen', icon: '🌦️' },
  { codes: [56, 57], name: 'Gefrierender Nieselregen', icon: '🌧️' },
  { codes: [61, 63, 65, 80, 81, 82], name: 'Regen', icon: '🌧️' },
  { codes: [66, 67], name: 'Gefrierender Regen', icon: '🌧️' },
  { codes: [71, 73, 75, 77, 85, 86], name: 'Schnee', icon: '❄️' },
  { codes: [95, 96, 97, 99], name: 'Gewitter', icon: '⛈️' },
] as const;
export function weatherCondition(code: unknown) {
  return typeof code === 'number' && Number.isInteger(code)
    ? WEATHER_CONDITIONS.find(condition => (condition.codes as readonly number[]).includes(code)) ?? null
    : null;
}
export interface WeatherLocation { place: string; lat: number; lon: number }
export interface WeatherSample extends WeatherLocation { temperature: number; code: number; updatedAt: number }
export function validWeatherLocation(value: any): value is WeatherLocation {
  return typeof value?.place === 'string' && value.place.trim().length > 0 && value.place.length <= 120
    && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90
    && Number.isFinite(value.lon) && Math.abs(value.lon) <= 180;
}
export function decodeCurrentWeather(data: any, location: WeatherLocation, now: number): WeatherSample | null {
  const temperature = data?.current?.temperature_2m, code = data?.current?.weather_code;
  if (!validWeatherLocation(location) || !Number.isFinite(temperature) || temperature < -100 || temperature > 70
    || !weatherCondition(code) || !Number.isFinite(now) || now <= 0) return null;
  return { ...location, temperature: Math.round(temperature), code, updatedAt: now };
}
export function normalizeWeatherSample(value: any, now = Date.now()): WeatherSample | null {
  const updatedAt = value?.updatedAt, temperature = value?.temperature, code = value?.code;
  if (!validWeatherLocation(value) || !Number.isFinite(updatedAt) || updatedAt <= 0 || updatedAt > now + 60_000) return null;
  return decodeCurrentWeather({ current: { temperature_2m: temperature, weather_code: code } }, value, updatedAt);
}
