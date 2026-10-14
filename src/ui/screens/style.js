// The look of the menu screens: a dark veil over the world, and a card like a squadron
// order sheet (cream paper, dark ink, serif type). Plain DOM, no assets. Shared helpers to
// build a screen, a heading, buttons, choice rows and a table.

const CSS = `
.dp-veil { position: fixed; inset: 0; z-index: 30; display: none; align-items: center; justify-content: center;
  background: rgba(8, 10, 8, 0.55); font-family: Georgia, 'Times New Roman', serif; }
.dp-card { min-width: min(30rem, 92vw); max-width: 92vw; max-height: 90vh; overflow: auto; box-sizing: border-box;
  padding: 1.6rem 2rem; background: #ece2c8; color: #2a2015; border: 3px double #6b5530; border-radius: 4px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.55); }
.dp-card h1 { margin: 0 0 0.2rem; font-size: 2.4rem; letter-spacing: 0.08em; text-transform: uppercase; text-align: center; }
.dp-card h2 { margin: 0 0 1rem; font-size: 1.3rem; text-align: center; font-weight: normal; font-style: italic; }
.dp-card p { margin: 0.4rem 0; }
.dp-buttons { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1.2rem; }
.dp-buttons.row { flex-direction: row; flex-wrap: wrap; justify-content: center; }
.dp-card button { font: inherit; font-size: 1.05rem; padding: 0.55rem 1.2rem; cursor: pointer; color: #f3ead2;
  background: #4a3b24; border: 1px solid #2a2015; border-radius: 3px; }
.dp-card button:hover, .dp-card button:focus { background: #6b5530; outline: 2px solid #b08a3e; }
.dp-row { display: grid; grid-template-columns: 11rem 1fr; gap: 0.6rem; align-items: center; margin: 0.45rem 0; }
.dp-row label { font-weight: bold; }
.dp-card select, .dp-card input[type=range] { font: inherit; font-size: 1rem; padding: 0.2rem; background: #f7f0dc;
  color: #2a2015; border: 1px solid #6b5530; accent-color: #6b5530; }
.dp-table { width: 100%; border-collapse: collapse; margin-top: 0.6rem; }
.dp-table td { padding: 0.25rem 0.4rem; border-bottom: 1px dotted #9c8758; }
.dp-table td:last-child { text-align: right; font-weight: bold; }
.dp-pilot { text-align: center; font-style: italic; margin: 0 0 0.4rem; }
.dp-small { font-size: 0.85rem; color: #5a4a30; text-align: center; margin-top: 1rem; }
.dp-card.dp-wide { width: min(46rem, 94vw); }
.dp-tabs { display: flex; gap: 0.4rem; justify-content: center; margin-bottom: 0.6rem; }
.dp-card .dp-tabs button.on { background: #8a6c34; outline: 2px solid #2a2015; }
.dp-msg { min-height: 1.4em; text-align: center; font-style: italic; color: #6b2f15; }
.dp-keys { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
.dp-keys td { padding: 0.15rem 0.3rem; border-bottom: 1px dotted #9c8758; }
.dp-keys th { text-align: left; padding: 0.6rem 0.3rem 0.2rem; font-variant: small-caps; letter-spacing: 0.05em; }
.dp-card .dp-keys button { font-size: 0.85rem; padding: 0.15rem 0.5rem; min-width: 5.5rem; }
.dp-card .dp-keys button.dp-x { min-width: 0; padding: 0.15rem 0.4rem; background: #7a6a4a; }
.dp-card .dp-keys button.listening { background: #b5482a; }
.dp-bar { position: relative; width: 9rem; height: 0.7rem; background: #f7f0dc; border: 1px solid #6b5530; }
.dp-bar span { position: absolute; top: 0; bottom: 0; width: 3px; margin-left: -1px; background: #4a3b24; }
.dp-lit { display: inline-block; width: 0.8rem; height: 0.8rem; border-radius: 50%; border: 1px solid #6b5530; background: #f7f0dc; }
.dp-lit.on { background: #c9a227; }
.dp-card input.dp-name { font: inherit; font-size: 1rem; padding: 0.25rem 0.4rem; width: 12rem; background: #f7f0dc;
  color: #2a2015; border: 1px solid #6b5530; }
.dp-enlist { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: center; margin-top: 1rem;
  padding-top: 0.8rem; border-top: 1px solid #9c8758; }
.dp-enlist label { font-weight: bold; }
.dp-card.dp-wider { width: min(60rem, 96vw); }
.dp-roster td { white-space: nowrap; }
.dp-roster td:first-child { white-space: normal; }
.dp-roster tr.dp-active td { background: #dccb9f; font-weight: bold; }
.dp-roster td:last-child { white-space: nowrap; text-align: right; }
.dp-code { font-family: 'Courier New', monospace; font-size: 2.4rem; font-weight: bold; letter-spacing: 0.3em; text-align: center; margin: 0.2rem 0; }
.dp-card input.dp-codebox { text-transform: uppercase; letter-spacing: 0.15em; width: 8rem; }
.dp-card input[type=number] { font: inherit; font-size: 1rem; width: 5rem; padding: 0.2rem; background: #f7f0dc; color: #2a2015; border: 1px solid #6b5530; }
.dp-card select:disabled { opacity: 0.75; }
.dp-card button:disabled { opacity: 0.5; cursor: default; outline: none; }
.dp-section { margin-top: 1rem; padding-top: 0.6rem; border-top: 1px solid #9c8758; }
.dp-section h3 { margin: 0 0 0.4rem; font-size: 1.05rem; font-variant: small-caps; letter-spacing: 0.05em; }
.dp-inline { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: center; margin: 0.5rem 0; }
`;

let injected = false;
function injectStyle() {
  if (injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  injected = true;
}

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// A screen: a veil with a card. Returns { veil, card, show(), hide(), visible }.
export function makeScreen() {
  injectStyle();
  const veil = el('div', 'dp-veil');
  const card = el('div', 'dp-card');
  veil.appendChild(card);
  document.body.appendChild(veil);
  return {
    veil,
    card,
    show() {
      veil.style.display = 'flex';
      card.querySelector('button, select')?.focus();
    },
    hide() {
      veil.style.display = 'none';
    },
    get visible() {
      return veil.style.display === 'flex';
    },
  };
}

export function heading(card, title, subtitle) {
  card.appendChild(el('h1', null, title));
  if (subtitle) card.appendChild(el('h2', null, subtitle));
}

// A column (or row) of buttons: [[label, onClick], ...]. Returns the container.
export function buttons(card, list, row = false) {
  const box = el('div', row ? 'dp-buttons row' : 'dp-buttons');
  for (const [label, onClick] of list) {
    const b = el('button', null, label);
    b.type = 'button';
    b.addEventListener('click', () => {
      b.blur();
      onClick();
    });
    box.appendChild(b);
  }
  card.appendChild(box);
  return box;
}

// A labelled drop-down: options [[value, label], ...]. Returns the select element.
export function choice(card, label, options, value, onChange) {
  const row = el('div', 'dp-row');
  const id = `dp-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const l = el('label', null, label);
  l.htmlFor = id;
  const s = el('select');
  s.id = id;
  setChoices(s, options, value);
  s.addEventListener('change', () => onChange(s.value));
  row.append(l, s);
  card.appendChild(row);
  return s;
}

export function setChoices(select, options, value) {
  select.replaceChildren(...options.map(([v, text]) => {
    const o = el('option', null, text);
    o.value = String(v);
    return o;
  }));
  select.value = String(value);
}

export function paragraph(card, text, cls) {
  const p = el('p', cls, text);
  card.appendChild(p);
  return p;
}

export { el };
