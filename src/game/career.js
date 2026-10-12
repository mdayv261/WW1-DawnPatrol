// The player's career: points for each mission, added up and remembered in the browser, and the
// rank they bring. One career for each side (an Allied pilot and a German pilot), because the
// ranks differ. The rank names are period ranks of the Royal Flying Corps and Royal Air Force and
// of the German air service; the points and the thresholds are design choices (docs/DECISIONS.md).
// "Ace" after five victories follows the common usage of the time.

export const POINTS = {
  kill: { drone: 5, novice: 20, regular: 35, ace: 60 }, // per enemy shot down, by its skill
  accuracy: 0.5, // points per percent of accuracy, if at least `minShots` rounds were fired
  minShots: 20,
  outcome: { victory: 20, landed: 30, withdrew: 5, ended: 0, 'shot down': -40, crashed: -30 },
};

export const RANKS = {
  allied: [
    { points: 0, name: 'Second Lieutenant' },
    { points: 150, name: 'Lieutenant' },
    { points: 400, name: 'Captain' },
    { points: 900, name: 'Major' },
  ],
  german: [
    { points: 0, name: 'Leutnant' },
    { points: 150, name: 'Oberleutnant' },
    { points: 400, name: 'Hauptmann' },
    { points: 900, name: 'Rittmeister' },
  ],
};

export const ACE_VICTORIES = 5;
export const CAREER_KEY = 'dawnPatrol.career';

const sideOf = (aircraft) => (aircraft.side === 'Allied' ? 'allied' : 'german');

// Points for one mission, and how they were earned (for the results screen).
// result: from mission.summary(); skill: the enemies' skill; practice: practice mode was on.
export function missionPoints(result, skill, practice = false) {
  if (practice) return { total: 0, lines: [['Practice mode', 0]] };
  const lines = [];
  if (result.kills > 0) lines.push([`${result.kills} shot down`, result.kills * (POINTS.kill[skill] ?? 0)]);
  if (result.shotsFired >= POINTS.minShots) lines.push([`Accuracy ${Math.round(result.accuracy)}%`, Math.round(result.accuracy * POINTS.accuracy)]);
  const o = POINTS.outcome[result.outcome] ?? 0;
  if (o !== 0) lines.push([result.headline, o]);
  return { total: lines.reduce((sum, [, p]) => sum + p, 0), lines };
}

export function rankFor(side, points) {
  const table = RANKS[side];
  let rank = table[0];
  for (const r of table) if (points >= r.points) rank = r;
  return rank.name;
}

export function newCareer() {
  return { points: 0, victories: 0, missions: 0, losses: 0 };
}

function cleanCareer(raw) {
  const c = newCareer();
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(c)) {
      const v = Number(raw[k]);
      if (Number.isFinite(v) && v >= 0) c[k] = Math.floor(v);
    }
  }
  return c;
}

export function loadCareers(storage) {
  try {
    const raw = JSON.parse(storage?.getItem(CAREER_KEY) ?? 'null') ?? {};
    return { allied: cleanCareer(raw.allied), german: cleanCareer(raw.german) };
  } catch {
    return { allied: newCareer(), german: newCareer() };
  }
}

export function saveCareers(storage, careers) {
  try {
    storage?.setItem(CAREER_KEY, JSON.stringify(careers));
  } catch {
    // not remembered (private window)
  }
}

// Add a mission to the career of the player's side. Returns what the results screen shows:
// { points (this mission), lines, total, rank, promoted (new rank or null), victories, ace (just
// became one), career }. Changes `careers` in place.
export function recordMission(careers, aircraft, result, skill, practice = false) {
  const side = sideOf(aircraft);
  const c = careers[side];
  const before = rankFor(side, c.points);
  const wasAce = c.victories >= ACE_VICTORIES;
  const { total, lines } = missionPoints(result, skill, practice);
  if (!practice) {
    c.points = Math.max(0, c.points + total);
    c.victories += result.kills;
    c.missions += 1;
    if (result.outcome === 'shot down' || result.outcome === 'crashed') c.losses += 1;
  }
  const rank = rankFor(side, c.points);
  return {
    points: total, lines, total: c.points, rank, promoted: rank !== before ? rank : null,
    victories: c.victories, ace: !wasAce && c.victories >= ACE_VICTORIES, isAce: c.victories >= ACE_VICTORIES, career: { ...c },
  };
}
