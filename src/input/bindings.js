// The keyboard's bindings: which keys do what, the player's own choices merged over the
// defaults, and the rules for changing them on the Controls screen. No browser code, so it
// is tested directly. keyboard.js and inputMapper.js read the bindings; the screen is
// src/ui/screens/controlsKeys.js.
//
// Keys are named by KeyboardEvent.code (the key's position: "KeyQ"), except the navigation
// keys, which are named by what they are ("PageUp"): see keyId in keyboard.js.

export const KEYS_STORE = 'dawnPatrol.keys';
export const BINDINGS_VERSION = 1;
export const SLOTS = 2; // keys per action

// Every action that can be given a key. held: works while the key is down (the stick,
// rudder, throttle, trim and the guns); the others act once per press. The default keys are
// the ones the game always had (Insert/Delete and Page Up/Down are the product owner's
// choice; W/S and T/G because a Mac has no Insert key).
export const ACTIONS = [
  { id: 'pullBack', label: 'Stick back (nose up)', group: 'Flying', held: true, keys: ['ArrowDown'] },
  { id: 'pushForward', label: 'Stick forward (nose down)', group: 'Flying', held: true, keys: ['ArrowUp'] },
  { id: 'rollLeft', label: 'Roll left', group: 'Flying', held: true, keys: ['ArrowLeft'] },
  { id: 'rollRight', label: 'Roll right', group: 'Flying', held: true, keys: ['ArrowRight'] },
  { id: 'rudderLeft', label: 'Rudder left', group: 'Flying', held: true, keys: ['KeyQ'] },
  { id: 'rudderRight', label: 'Rudder right', group: 'Flying', held: true, keys: ['KeyE'] },
  { id: 'throttleUp', label: 'Throttle up', group: 'Flying', held: true, keys: ['Insert', 'KeyW'] },
  { id: 'throttleDown', label: 'Throttle down', group: 'Flying', held: true, keys: ['Delete', 'KeyS'] },
  { id: 'trimNoseUp', label: 'Trim nose up', group: 'Flying', held: true, keys: ['PageUp', 'KeyT'] },
  { id: 'trimNoseDown', label: 'Trim nose down', group: 'Flying', held: true, keys: ['PageDown', 'KeyG'] },
  { id: 'invertPitch', label: 'Invert pitch', group: 'Flying', keys: ['KeyI'] },
  { id: 'recentre', label: 'Centre the mouse stick', group: 'Flying', keys: ['KeyX'] },
  { id: 'sensitivityDown', label: 'Mouse sensitivity down', group: 'Flying', keys: ['Comma'] },
  { id: 'sensitivityUp', label: 'Mouse sensitivity up', group: 'Flying', keys: ['Period'] },
  { id: 'fire', label: 'Fire (hold)', group: 'Guns', held: true, keys: ['Space'] },
  { id: 'clearJam', label: 'Clear a gun jam', group: 'Guns', keys: ['KeyB'] },
  { id: 'changeDrum', label: 'Change the drum (Lewis gun)', group: 'Guns', keys: ['KeyF'] },
  { id: 'camera', label: 'Camera (cockpit / chase / free)', group: 'View', keys: ['KeyC'] },
  { id: 'look', label: 'Look around', group: 'View', keys: ['KeyV'] },
  { id: 'hud', label: 'Modern HUD', group: 'View', keys: ['KeyU'] },
  { id: 'readout', label: 'Instrument readout', group: 'View', keys: ['KeyJ'] },
  { id: 'help', label: 'Show the keys', group: 'View', keys: ['KeyH'] },
  { id: 'quality', label: 'Graphics quality', group: 'View', keys: ['KeyL'] },
  { id: 'pause', label: 'Pause', group: 'Game', keys: ['KeyP'] },
  { id: 'restart', label: 'Restart the mission', group: 'Game', keys: ['KeyR'] },
  { id: 'mute', label: 'Sound on / off', group: 'Game', keys: ['KeyM'] },
  { id: 'practice', label: 'Practice mode', group: 'Game', keys: ['KeyY'] },
];

export const GROUPS = ['Flying', 'Guns', 'View', 'Game'];
export const HELD = new Set(ACTIONS.filter((a) => a.held).map((a) => a.id));
const BY_ID = new Map(ACTIONS.map((a) => [a.id, a]));
export const actionLabel = (id) => BY_ID.get(id)?.label ?? id;

// Keys that cannot be given to an action: Esc (menus, pause, cancel), the function keys
// (F2 joystick, F3 debug, F4 test panel; the browser uses others), Tab and Command.
export const RESERVED = new Set(['Escape', 'Tab', 'MetaLeft', 'MetaRight', ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`)]);

const pad = (list) => Array.from({ length: SLOTS }, (_, i) => list[i] ?? null);

// The default bindings: { version, keys: { action: [key or null, key or null] } }.
export function defaultBindings() {
  const keys = {};
  for (const a of ACTIONS) keys[a.id] = pad(a.keys);
  return { version: BINDINGS_VERSION, keys };
}

const validKey = (k) => typeof k === 'string' && k.length > 0 && k.length < 40 && !RESERVED.has(k);

// Merge a saved copy over the defaults, ignoring anything malformed (so a corrupt saved
// value can never break the controls) and any key used twice (the first use wins).
export function mergeBindings(saved) {
  const out = defaultBindings();
  const s = saved && typeof saved === 'object' && saved.keys && typeof saved.keys === 'object' ? saved.keys : null;
  if (!s) return out;
  const used = new Set();
  for (const a of ACTIONS) {
    const list = s[a.id];
    if (!Array.isArray(list)) {
      out.keys[a.id] = [null, null]; // filled from the defaults below, where still free
      continue;
    }
    out.keys[a.id] = pad(list.slice(0, SLOTS).map((k) => (validKey(k) && !used.has(k) ? k : null)));
    for (const k of out.keys[a.id]) if (k) used.add(k);
  }
  // An action the saved copy did not know (added later) gets its default keys, if still free.
  for (const a of ACTIONS) {
    if (Array.isArray(s[a.id])) continue;
    out.keys[a.id] = pad(a.keys.filter((k) => !used.has(k)));
    for (const k of out.keys[a.id]) if (k) used.add(k);
  }
  return out;
}

// The action a key does, or null.
export function actionForKey(bindings, key) {
  for (const [id, list] of Object.entries(bindings.keys)) if (list.includes(key)) return id;
  return null;
}

// Give `key` to `action` in `slot` (or clear the slot with key = null). Returns
// { bindings (a new copy), moved: the action that lost the key or null, refused: true for a
// reserved key }. A key does one thing only, so it is taken from wherever it was.
export function rebind(bindings, action, slot, key) {
  const keys = Object.fromEntries(Object.entries(bindings.keys).map(([id, list]) => [id, [...list]]));
  const result = { bindings: { version: BINDINGS_VERSION, keys }, moved: null, refused: false };
  if (!keys[action] || slot < 0 || slot >= SLOTS) return { ...result, bindings };
  if (key !== null && !validKey(key)) return { ...result, bindings, refused: true };
  if (key !== null) {
    for (const [id, list] of Object.entries(keys)) {
      const i = list.indexOf(key);
      if (i < 0) continue;
      list[i] = null;
      if (id !== action) result.moved = id;
    }
  }
  keys[action][slot] = key;
  return result;
}

// ---- names for the screen and the help -----------------------------------------------------

const NAMES = {
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', PageUp: 'PgUp', PageDown: 'PgDn',
  Space: 'Space', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']',
  Backslash: '\\', Backquote: '`', Minus: '-', Equal: '=', IntlBackslash: '§',
  ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl',
  AltLeft: 'Left Alt', AltRight: 'Right Alt', NumpadAdd: 'Num +', NumpadSubtract: 'Num -', NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /', NumpadDecimal: 'Num .', NumpadEnter: 'Num Enter',
};

// A key's name as printed on it: KeyQ -> Q, Digit1 -> 1, Numpad8 -> Num 8, PageUp -> PgUp.
export function keyLabel(key) {
  if (!key) return '-';
  if (NAMES[key]) return NAMES[key];
  if (/^Key[A-Z]$/.test(key)) return key.slice(3);
  if (/^Digit\d$/.test(key)) return key.slice(5);
  if (/^Numpad\d$/.test(key)) return `Num ${key.slice(6)}`;
  return key;
}

// An action's keys for the help: "Insert or W", or "-" with none.
export function keysText(bindings, action) {
  const list = (bindings.keys[action] ?? []).filter(Boolean).map(keyLabel);
  return list.length ? list.join(' or ') : '-';
}

// The in-flight help (H), from the player's keys and joystick buttons. joystick: the
// joystick mapping (optional); buttonLabels: names of its button actions.
export function helpText(bindings, joystick = null, buttonLabels = {}) {
  const k = (id) => keysText(bindings, id);
  const pair = (a, b, text) => `  ${`${k(a)} / ${k(b)}`.padEnd(24)} ${text}`;
  const singles = [
    ['fire', 'fire (hold)'], ['clearJam', 'clear a gun jam'], ['changeDrum', 'change the drum (Lewis)'], ['camera', 'camera'], ['look', 'look around (or right mouse)'],
    ['hud', 'modern HUD'], ['readout', 'instrument readout'], ['pause', 'pause (or Esc)'], ['restart', 'restart'],
    ['mute', 'sound on/off'], ['practice', 'practice mode'], ['quality', 'graphics quality'], ['invertPitch', 'invert pitch'],
    ['recentre', 'centre mouse stick'], ['help', 'hide this'],
  ];
  const lines = ['DAWN PATROL - controls (change them in Options > Controls)',
    pair('pullBack', 'pushForward', 'stick back (nose up) / forward'),
    pair('rollLeft', 'rollRight', 'roll left / right'),
    pair('rudderLeft', 'rudderRight', 'rudder left / right'),
    pair('throttleUp', 'throttleDown', 'throttle up / down (mouse wheel too)'),
    pair('trimNoseUp', 'trimNoseDown', 'trim nose up / down'),
    pair('sensitivityDown', 'sensitivityUp', 'mouse sensitivity down / up')];
  let line = ' ';
  for (const [id, text] of singles) {
    const item = ` ${k(id)} ${text}  `;
    if (line.length + item.length > 92) {
      lines.push(line.trimEnd());
      line = ' ';
    }
    line += item;
  }
  lines.push(line.trimEnd());
  lines.push('  Mouse: click the game to fly with the mouse, Esc to release');
  lines.push('  In multiplayer: Esc opens the match menu (the match goes on); the score and time left are at the top left');
  if (joystick) {
    const names = Object.entries(joystick.buttons).filter(([, i]) => i !== null).sort((a, b) => a[1] - b[1])
      .map(([id, i]) => `${i + 1} ${(buttonLabels[id] ?? id).toLowerCase()}`);
    lines.push('  Joystick: stick = pitch/roll, twist = rudder, slider = throttle, hat = look');
    lines.push(`  Joystick buttons: ${names.join(', ') || 'none'}`);
  }
  lines.push('  F2 joystick test   F3 debug   F4 flight test panel (development builds; also 1-4 quick starts, N enemy, [ ] skill)');
  return lines.join('\n');
}

// ---- remembered in the browser -------------------------------------------------------------

export function loadBindings(storage) {
  try {
    return mergeBindings(JSON.parse(storage?.getItem(KEYS_STORE) ?? 'null'));
  } catch {
    return defaultBindings();
  }
}

export function saveBindings(storage, bindings) {
  try {
    storage?.setItem(KEYS_STORE, JSON.stringify(bindings));
  } catch {
    // not remembered (private window)
  }
}
