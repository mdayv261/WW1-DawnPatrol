// The game's screens: main menu, mission setup, options, pause and results. Each is built once
// and shown or hidden by the game (src/main.js) as the flow (src/game/flow.js) moves. They only
// gather choices and call back; they do not fly anything themselves.

import { makeScreen, heading, buttons, choice, setChoices, paragraph, el } from './style.js';
import { AIRCRAFT_LIST } from '../../aircraft/index.js';
import { SKILLS, SKILL_ORDER } from '../../aircraft/aiData.js';
import { QUALITY_ORDER } from '../../render/quality.js';
import { STARTS, TIMES, MAX_ENEMIES, enemyChoices, cleanConfig } from '../../game/flow.js';
import { formatTime } from '../../game/mission.js';
import { createKeysTab } from './controlsKeys.js';
import { createJoystickTab } from './controlsJoystick.js';

const aircraftName = (id) => AIRCRAFT_LIST.find((a) => a.id === id)?.name ?? id;

export function createMainMenu({ onFly, onOptions }) {
  const s = makeScreen();
  heading(s.card, 'Dawn Patrol', 'Western Front, 1917-1918');
  buttons(s.card, [['Fly a mission', onFly], ['Options', onOptions]]);
  const careerLine = paragraph(s.card, '', 'dp-small');
  paragraph(s.card, 'Keyboard, mouse or joystick: Options > Controls changes the keys and buttons, and the help in flight lists them. Esc pauses.', 'dp-small');
  const show = s.show;
  // careers: { allied, german } with { points, victories, missions }; rankFor(side, points).
  return { ...s, show(careers, rankFor) {
    if (careers && rankFor) {
      const line = (side, label) => (careers[side].missions ? `${label}: ${rankFor(side, careers[side].points)}, ${careers[side].victories} victories in ${careers[side].missions} missions` : '');
      careerLine.textContent = [line('allied', 'Allied'), line('german', 'German')].filter(Boolean).join('  |  ') || 'No missions flown yet.';
    }
    show();
  } };
}

// Mission setup. getConfig() reads it; onFly(config) starts.
export function createSetup({ config, onFly, onBack }) {
  const s = makeScreen();
  let c = cleanConfig(config);
  heading(s.card, 'Mission orders');
  const enemy = () => enemyChoices(c.aircraft).map((id) => [id, id === 'mixed' ? 'Mixed (all enemy types)' : aircraftName(id)]);
  choice(s.card, 'Your aircraft', AIRCRAFT_LIST.map((a) => [a.id, `${a.name} (${a.side === 'Allied' ? 'Allied' : 'German'})`]), c.aircraft, (v) => {
    c = cleanConfig({ ...c, aircraft: v });
    setChoices(enemySelect, enemy(), c.enemyType); // the enemy is always the other side
  });
  const enemySelect = choice(s.card, 'Enemy aircraft', enemy(), c.enemyType, (v) => { c.enemyType = v; });
  choice(s.card, 'Number of enemies', Array.from({ length: MAX_ENEMIES + 1 }, (_, i) => [i, i === 0 ? 'None (free flight)' : String(i)]), c.enemyCount, (v) => { c.enemyCount = Number(v); });
  choice(s.card, 'Enemy skill', SKILL_ORDER.map((k) => [k, k === 'drone' ? 'Drone (target practice)' : SKILLS[k].name]), c.skill, (v) => { c.skill = v; });
  choice(s.card, 'Start', STARTS.map((st) => [st.id, st.label]), c.start, (v) => { c.start = v; });
  choice(s.card, 'Time of day', TIMES.map((t) => [t.id, t.label]), c.timeOfDay, (v) => { c.timeOfDay = v; });
  buttons(s.card, [['Take off', () => onFly(cleanConfig(c))], ['Back', onBack]], true);
  return { ...s, getConfig: () => cleanConfig(c) };
}

// Options: volume, graphics quality, HUD, practice mode, the assists, and the Controls screen. Each change is
// applied at once. getOptions() is read each time the screen opens, so keys pressed in flight show here.
export function createOptions({ getOptions, quality, onChange, onQuality, onControls, onBack }) {
  const s = makeScreen();
  const o = { ...getOptions() };
  heading(s.card, 'Options');
  const vol = el('input');
  vol.type = 'range';
  vol.min = '0';
  vol.max = '100';
  vol.value = String(Math.round(o.volume * 100));
  vol.addEventListener('input', () => {
    o.volume = Number(vol.value) / 100;
    onChange({ ...o });
  });
  const row = el('div', 'dp-row');
  const l = el('label', null, 'Sound volume');
  row.append(l, vol);
  s.card.appendChild(row);
  choice(s.card, 'Graphics quality', QUALITY_ORDER.map((q) => [q, q[0].toUpperCase() + q.slice(1)]), quality, (v) => onQuality(v));
  const hud = choice(s.card, 'Modern HUD', [['off', 'Off (period instruments only)'], ['on', 'On']], o.hud ? 'on' : 'off', (v) => {
    o.hud = v === 'on';
    onChange({ ...o });
  });
  const practice = choice(s.card, 'Practice mode', [['off', 'Off'], ['on', 'On (enemy fire cannot hurt you)']], o.practice ? 'on' : 'off', (v) => {
    o.practice = v === 'on';
    onChange({ ...o });
  });
  // The assists (game aids; the aircraft had none of these).
  const onOff = (label, key, onText, offText = 'Off') => choice(s.card, label, [['off', offText], ['on', onText]], o[key] ? 'on' : 'off', (v) => {
    o[key] = v === 'on';
    onChange({ ...o });
  });
  const assists = {
    autoRudder: onOff('Auto-rudder', 'autoRudder', 'On (keeps the slip ball centred)'),
    stallWarning: onOff('Stall warning', 'stallWarning', 'On (warning and horn)'),
    gWarning: onOff('G and overspeed warning', 'gWarning', 'On (warning and buzzer)'),
    structuralDamage: onOff('Structural damage', 'structuralDamage', 'On (too much g or speed breaks the wings)', 'Off (only bullets damage the airframe)'),
  };
  buttons(s.card, [['Controls (keyboard and joystick)', onControls], ['Back', onBack]]);
  const show = s.show;
  return { ...s, show() {
    Object.assign(o, getOptions());
    vol.value = String(Math.round(o.volume * 100));
    hud.value = o.hud ? 'on' : 'off';
    practice.value = o.practice ? 'on' : 'off';
    for (const [key, select] of Object.entries(assists)) select.value = o[key] ? 'on' : 'off';
    show();
  } };
}

// Controls: the keyboard and joystick tabs (controlsKeys.js, controlsJoystick.js).
// keys: { getBindings, onBindings, captureNext, onReset } for the keyboard tab.
export function createControls({ keys, joystick, onBack }) {
  const s = makeScreen();
  s.card.classList.add('dp-wide');
  heading(s.card, 'Controls');
  const keysTab = createKeysTab(keys);
  const joyTab = createJoystickTab(joystick);
  let tab = 'keys';
  const tabs = buttons(s.card, [['Keyboard', () => pick('keys')], ['Joystick', () => pick('joy')]], true);
  tabs.classList.add('dp-tabs');
  const [keysButton, joyButton] = tabs.children;
  s.card.append(keysTab.root, joyTab.root);
  function pick(t) {
    tab = t;
    keysTab.cancel();
    joyTab.cancel();
    keysTab.root.hidden = t !== 'keys';
    joyTab.root.hidden = t !== 'joy';
    keysButton.classList.toggle('on', t === 'keys');
    joyButton.classList.toggle('on', t === 'joy');
    (t === 'keys' ? keysTab : joyTab).show();
  }
  buttons(s.card, [['Back', () => {
    keysTab.cancel();
    joyTab.cancel();
    onBack();
  }]]);
  const show = s.show;
  return { ...s, show() {
    show();
    pick(tab);
  }, update() {
    if (tab === 'joy') joyTab.update();
  } };
}

export function createPause({ onResume, onRestart, onOptions, onEnd, onQuit }) {
  const s = makeScreen();
  heading(s.card, 'Paused');
  buttons(s.card, [['Resume', onResume], ['Restart mission', onRestart], ['Options', onOptions], ['End mission', onEnd], ['Quit to main menu', onQuit]]);
  return s;
}

// Results: show(result) fills in the numbers.
export function createResults({ onAgain, onChange, onMenu }) {
  const s = makeScreen();
  const title = el('h1');
  const sub = el('h2');
  const table = el('table', 'dp-table');
  const career = el('table', 'dp-table');
  const honours = el('p', 'dp-small');
  s.card.append(title, sub, table, career, honours);
  buttons(s.card, [['Fly again', onAgain], ['Change mission', onChange], ['Main menu', onMenu]], true);
  const show = s.show;
  return {
    ...s,
    // r: the mission's result; rec: its career record (career.recordMission), optional.
    show(r, rec = null) {
      title.textContent = r.headline;
      sub.textContent = r.detail;
      const rows = [
        ['Aircraft', r.aircraft],
        ['Time in the air', formatTime(r.time)],
        ['Enemies shot down', `${r.kills} of ${r.enemies}`],
        ['Rounds fired', String(r.shotsFired)],
        ['Hits', `${r.hits} (${Math.round(r.accuracy)}%)`],
        ['Hits taken', String(r.hitsTaken)],
        ['Damage', r.damage],
        ['Fuel used', `${Math.round(r.fuelUsed)}%`],
      ];
      const fill = (t, list) => t.replaceChildren(...list.map(([k, v]) => {
        const tr = el('tr');
        tr.append(el('td', null, k), el('td', null, v));
        return tr;
      }));
      fill(table, rows);
      if (rec) {
        const sign = (n) => (n > 0 ? `+${n}` : String(n));
        fill(career, [...rec.lines.map(([k, v]) => [k, sign(v)]), ['Points this mission', sign(rec.points)], ['Career points', String(rec.total)], ['Rank', rec.rank], ['Victories', String(rec.victories)]]);
        honours.textContent = [rec.promoted ? `Promoted to ${rec.promoted}!` : '', rec.ace ? 'Five victories: you are now an Ace!' : '', rec.isAce && !rec.ace ? 'Ace' : ''].filter(Boolean).join('   ');
      } else {
        career.replaceChildren();
        honours.textContent = '';
      }
      show();
    },
  };
}
