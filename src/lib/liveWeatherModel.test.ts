import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeCurrentWeather, normalizeWeatherSample, weatherCondition } from './liveWeatherModel';
const location = { place: 'Feldkirch', lat: 47.24, lon: 9.60 };
test('actual weather distinguishes overcast, freezing precipitation and storms instead of substituting cloudy', () => {
  assert.equal(weatherCondition(3)?.name, 'Bedeckt');
  for (const code of [56, 57]) assert.equal(weatherCondition(code)?.name, 'Gefrierender Nieselregen');
  for (const code of [66, 67]) assert.equal(weatherCondition(code)?.name, 'Gefrierender Regen');
  for (const code of [95, 96, 97, 99]) assert.equal(weatherCondition(code)?.name, 'Gewitter');
  for (const invalid of [null, '61', 999, NaN, 1.2]) assert.equal(weatherCondition(invalid), null);
});
test('current weather rejects invalid or invented live measurements and invalid coordinates', () => {
  const data = { current: { temperature_2m: -3.7, weather_code: 67 } };
  assert.equal(decodeCurrentWeather(data, location, 1000)?.temperature, -4);
  for (const temperature_2m of [NaN, Infinity, null, '20', -101, 71]) assert.equal(decodeCurrentWeather({ current: { ...data.current, temperature_2m } }, location, 1000), null);
  assert.equal(decodeCurrentWeather(data, { ...location, lat: 91 }, 1000), null);
  assert.equal(decodeCurrentWeather(data, { ...location, lon: NaN }, 1000), null);
});
test('saved weather preserves the original location, code and timestamp, never a future fabricated sample', () => {
  const sample = decodeCurrentWeather({ current: { temperature_2m: 12.3, weather_code: 3 } }, location, 1000)!;
  assert.deepEqual(normalizeWeatherSample(sample, 2000), sample);
  assert.equal(normalizeWeatherSample({ ...sample, updatedAt: 99_999 }, 2000), null);
  assert.equal(normalizeWeatherSample({ ...sample, temperature: NaN }, 2000), null);
});
