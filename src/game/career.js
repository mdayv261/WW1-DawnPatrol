// A pilot's career: points for each mission (the pilot's score), victories, and the rank they
// bring. Each pilot on the Roll Call (src/game/pilots.js) serves one side, and the ranks differ
// by side. The rank names are period ranks of the Royal Flying Corps and Royal Air Force and of
// the German air service; the points and the thresholds are design choices (docs/DECISIONS.md,
// D58 and D63). "Ace" after five victories follows the common usage of the time.

export const POINTS = {
  kill: { drone: 5, novice: 20, regular: 35, ace: 60 }, // per enemy shot down, by its skill
  accuracy: 0.5, // points per percent of accuracy, if at least `minShots` rounds were fired
  minShots: 20,
  outcome: { victory: 20, landed: 30, withdrew: 5, ended: 0, 'shot down': -40, crashed: -30 },
};

// Rank by victories (product owner: a pilot rises with enemy kills). Drones (target practice)
// are not victories.
export const RANKS = {
  allied: [
    { victories: 0, name: 'Second Lieutenant' },
    { victories: 3, name: 'Lieutenant' },
    { victories: 8, name: 'Captain' },
    { victories: 15, name: 'Major' },
  ],
  german: [
    { victories: 0, name: 'Leutnant' },
    { victories: 3, name: 'Oberleutnant' },
    { victories: 8, name: 'Hauptmann' },
    { victories: 15, name: 'Rittmeister' },
  ],
};

export const SERVICE = { allied: 'RFC/RAF', german: 'German air service' };
export const ACE_VICTORIES = 5;
export const CAREER_KEY = 'dawnPatrol.career'; // the old, unnamed careers (read once, to import)

export const sideOf = (aircraft) => (aircraft.side === 'Allied' ? 'allied' : 'german');

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

// The rank for a number of victories on a side.
export function rankFor(side, victories) {
  const table = RANKS[side] ?? RANKS.allied;
  let rank = table[0];
  for (const r of table) if (victories >= r.victories) rank = r;
  return rank.name;
}

// Add a mission to a pilot's record (changes `pilot` in place: victories, drones, missions,
// losses, score). Returns what the results screen shows: { points (this mission), lines, total
// (score), rank, promoted (new rank or null), victories, ace (just became one), isAce }.
export function recordMission(pilot, result, skill, practice = false) {
  const before = rankFor(pilot.side, pilot.victories);
  const wasAce = pilot.victories >= ACE_VICTORIES;
  const { total, lines } = missionPoints(result, skill, practice);
  if (!practice) {
    pilot.score = Math.max(0, pilot.score + total);
    if (skill === 'drone') pilot.drones += result.kills;
    else pilot.victories += result.kills;
    pilot.missions += 1;
    if (result.outcome === 'shot down' || result.outcome === 'crashed') pilot.losses += 1;
  }
  const rank = rankFor(pilot.side, pilot.victories);
  return {
    points: total, lines, total: pilot.score, rank, promoted: rank !== before ? rank : null,
    victories: pilot.victories, ace: !wasAce && pilot.victories >= ACE_VICTORIES, isAce: pilot.victories >= ACE_VICTORIES,
  };
}

// ---- the old careers (one unnamed pilot per side, before the Roll Call) -----------------------

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
