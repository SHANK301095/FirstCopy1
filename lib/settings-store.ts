const settings = new Map([['PEAK_MODE', 'OFF']]);

export function getSetting(key: string) {
  return settings.get(key) ?? null;
}

export function setSetting(key: string, value: string) {
  settings.set(key, value);
  return value;
}
