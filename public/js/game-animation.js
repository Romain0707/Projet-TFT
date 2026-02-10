// =====================================================
//  Battle board animation (fetch JSON + animate moves)
//  - No beamBetween (removed)
//  - Single init() (no initGame duplicate)
// =====================================================

// ---- Helpers positions (x,y) -> pixel ----
function cellToPx(x, y) {
  const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell'));
  const gap  = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
  const left = x * (cell + gap);
  const top  = y * (cell + gap);
  return { left, top, cell, gap };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- Render board ----
function renderBoard(w, h) {
  document.documentElement.style.setProperty('--w', w);
  document.documentElement.style.setProperty('--h', h);

  const board = document.getElementById('board');
  board.innerHTML = '';

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell ' + ((x + y) % 2 === 0 ? 'light' : 'dark');
      cell.dataset.x = x;
      cell.dataset.y = y;
      board.appendChild(cell);
    }
  }
}

// ---- Units ----
const unitEls = new Map(); // id -> element
let queue = [];
let cursor = 0;

function spawnUnits(units) {
  const layer = document.getElementById('units');
  layer.innerHTML = '';
  unitEls.clear();

  for (const u of units) {
    const el = document.createElement('div');
    el.className = `unit ${u.team === 'A' ? 'teamA' : 'teamB'}`;
    el.dataset.id = String(u.id);
    el.textContent = u.name;

    placeUnit(el, u.x, u.y, true);

    layer.appendChild(el);
    unitEls.set(u.id, el);
  }
}

/**
 * Places a unit on the board.
 * IMPORTANT: CSS expects units to be "standing" (billboard) by counter-rotating
 * the board tilt/yaw. So we include rotateX/rotateY in the transform string.
 */
function placeUnit(el, x, y, immediate = false) {
  const { left, top, cell } = cellToPx(x, y);

  // must match CSS unit sizing ratios
  const w = cell * 0.72;
  const h = cell * 1.10;

  // center in X, "feet" near bottom of tile in Y
  const tx = left + (cell - w) / 2;
  const ty = top + (cell - h) + (cell * 0.08);

  const transform =
    `translate3d(${tx}px, ${ty}px, 22px) ` +
    `rotateX(calc(-1 * var(--tilt))) ` +
    `rotateY(calc(-1 * var(--yaw)))`;

  if (immediate) {
    el.style.transition = 'none';
    el.style.transform = transform;
    el.getBoundingClientRect(); // force reflow
    el.style.transition = '';
  } else {
    el.style.transform = transform;
  }
}

// ---- Playback engine ----
function buildQueue(rounds) {
  const q = [];
  for (const r of rounds) {
    for (const a of r.actions) q.push(a);
  }
  return q;
}

async function step() {
  if (cursor >= queue.length) return false;

  const action = queue[cursor++];
  const status = document.getElementById('status');

  if (action.type === 'move') {
    status.textContent = `Move: ${action.unit} (${action.from.x},${action.from.y}) -> (${action.to.x},${action.to.y})`;

    const el = unitEls.get(action.unit_id);
    if (el) {
      placeUnit(el, action.to.x, action.to.y);
      await sleep(560);
    } else {
      await sleep(220);
    }
    return true;
  }

  if (action.type === 'attack') {
    status.textContent = `Attack: ${action.attacker} -> ${action.target} (-${action.damage}, hp=${action.target_hp})`;

    const aEl = unitEls.get(action.attacker_id);
    const tEl = unitEls.get(action.target_id);

    if (aEl && tEl) {
      // attacker "recoil" (CSS animation you can define later)
      aEl.classList.add('attack');
      setTimeout(() => aEl.classList.remove('attack'), 220);

      // target hit flash (CSS already has .hit)
      tEl.classList.add('hit');
      setTimeout(() => tEl.classList.remove('hit'), 260);

      await sleep(360);

      if (action.dead) {
        // simple fade/shrink death
        tEl.style.transition = 'transform 320ms ease, opacity 320ms ease';
        tEl.style.opacity = '0';
        tEl.style.transform += ' translateZ(-10px) scale(0.6)';
        await sleep(340);

        tEl.remove();
        unitEls.delete(action.target_id);
      }
    } else {
      await sleep(300);
    }

    return true;
  }

  // unknown action type
  await sleep(200);
  return true;
}

async function playAll() {
  while (await step()) { /* loop */ }
}

// ---- Boot ----
async function init() {
  const status = document.getElementById('status');

  try {
    const res = await fetch('/combat/json', {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${txt.slice(0, 200)}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const txt = await res.text();
      throw new Error(`Réponse pas JSON (content-type=${contentType}) — début: ${txt.slice(0, 200)}`);
    }

    const data = await res.json();
    console.log('COMBAT DATA:', data);

    if (!data || !data.board || !data.units || !data.rounds) {
      throw new Error(`JSON invalide: ${JSON.stringify(data).slice(0, 200)}`);
    }

    renderBoard(data.board.width, data.board.height);
    spawnUnits(data.units);

    queue = buildQueue(data.rounds);
    cursor = 0;

    status.textContent = `Winner: ${data.winner}`;
  } catch (e) {
    console.error(e);
    if (status) status.textContent = `Erreur: ${e.message}`;
  }
}

// ---- Wire UI ----
document.addEventListener('DOMContentLoaded', () => {
  init();

  // buttons may not exist on some pages; guard them
  const btnPlay = document.getElementById('btnPlay');
  const btnStep = document.getElementById('btnStep');

  if (btnPlay) btnPlay.addEventListener('click', playAll);
  if (btnStep) btnStep.addEventListener('click', step);
});
