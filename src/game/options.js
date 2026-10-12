// The player's options (Options screen), cleaned up and remembered in the browser.
// Graphics quality is kept separately (src/render/quality.js) as it already was.

export const DEFAULT_OPTIONS = { volume: 0.7, hud: false, practice: false };
export const OPTIONS_KEY = 'dawnPatrol.options';

export function cleanOptions(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const o = { ...DEFAULT_OPTIONS };
  const v = Number(r.volume);
  if (Number.isFinite(v)) o.volume = Math.min(1, Math.max(0, v));
  if (typeof r.hud === 'boolean') o.hud = r.hud;
  if (typeof r.practice === 'boolean') o.practice = r.practice;
  return o;
}

export function loadOptions(storage) {
  try {
    return cleanOptions(JSON.parse(storage?.getItem(OPTIONS_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

export function saveOptions(storage, options) {
  try {
    storage?.setItem(OPTIONS_KEY, JSON.stringify(cleanOptions(options)));
  } catch {
    // not remembered (private window)
  }
}
