// The match's score line while flying: "ALLIED 2 – 1 CENTRAL   7:42   First to 5", in a small
// panel at the top left (clear of the heading tape and the warnings at the top centre).

const STYLE = 'position:fixed;top:calc(10px + env(safe-area-inset-top, 0px));left:10px;z-index:12;padding:6px 12px;'
  + 'font:bold 15px/1.3 "Courier New",monospace;color:#f3ead2;background:rgba(20,16,10,0.62);border:1px solid rgba(240,220,170,0.4);'
  + 'border-radius:3px;letter-spacing:0.06em;white-space:pre;pointer-events:none;display:none';

// "7:42" (never below 0:00).
export function clockText(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// The line: score { teams } (or null before the first), seconds into the match, the match settings.
export function scoreLineText(score, seconds, settings) {
  const a = score?.teams?.allied ?? 0;
  const c = score?.teams?.central ?? 0;
  return `ALLIED ${a} – ${c} CENTRAL   ${clockText(settings.timeLimit * 60 - seconds)}   First to ${settings.scoreLimit}`;
}

export function createScoreLine() {
  const root = document.createElement('div');
  root.style.cssText = STYLE;
  document.body.appendChild(root);
  return {
    // text: the line, or '' to hide it.
    set(text) {
      if (root.textContent !== text) root.textContent = text;
      root.style.display = text ? 'block' : 'none';
    },
  };
}
