// =====================================================
//  Battle board animation (fetch JSON + animate moves)
//  - Uses unit spritesheets + per-action animations
//  - Sprites are 100x100 per frame, frames are horizontal
//  - Adds ASSET_BASE prefix to JSON paths (fix missing /img/ ...)
// =====================================================

// ---- Asset path helper ----
// Everything inside /public is served from "/" (Vite/React default).
// If your images are in public/img/... then the public URL is "/img/...".
const ASSET_BASE = '/img/';
let lastData = null;
let isPlaying = false;

function assetUrl(p) {
  if (!p) return '';
  // absolute urls, protocol-relative, data/blob
  if (/^(https?:)?\/\//.test(p) || p.startsWith('data:') || p.startsWith('blob:')) return p;
  // already root-based
  if (p.startsWith('/')) return p;
  // prefix relative path
  return ASSET_BASE + p.replace(/^\.?\//, '');
}

// ---- Helpers positions (x,y) -> pixel ----
function cellToPx(x, y) {
  const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell'));
  const gap  = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
  const left = x * (cell + gap);
  const top  = y * (cell + gap);
  return { left, top, cell, gap };
}

const SPEED = 1.35; // >1 = plus lent (ex: 1.2, 1.5, 2.0)
const PAUSE_BETWEEN_ACTIONS = 320; // ms
const PAUSE_AFTER_MOVE = 120;
const PAUSE_AFTER_ATTACK = 200;
const PAUSE_AFTER_HEAL = 180;
const HIT_DELAY = 250;

function delay(ms) { return sleep(ms * SPEED); }

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

// ---- Units state ----
const unitEls   = new Map(); // id -> root element
const unitData  = new Map(); // id -> unit json (stats + animations)
const unitAnim  = new Map(); // id -> { timer, name } (current animation)

let queue = [];
let cursor = 0;

// ---- Animation helpers ----
function getAnimDef(u, animName) {
  if (!u || !u.animations) return null;
  return u.animations[animName] || null;
}

function getAnimDurationMs(u, animName) {
  const def = getAnimDef(u, animName);
  if (!def) return 0;
  const fps = def.fps || 10;
  const frames = def.frames || 1;
  return Math.max(1, Math.round((frames / fps) * 1000));
}

function stopAnim(unitId) {
  const st = unitAnim.get(unitId);
  if (st?.timer) clearInterval(st.timer);
  unitAnim.delete(unitId);
}

// Frames are horizontal. We shift X by frameWidth pixels.
function setSpriteFrame(spriteEl, frameIndex, frameWpx) {
  spriteEl.style.backgroundPosition = `${-frameIndex * frameWpx}px 0px`;
}

function setAnim(unitId, animName, { loop = true, force = false } = {}) {
  const root = unitEls.get(unitId);
  const u = unitData.get(unitId);
  if (!root || !u) return;

  const sprite = root.querySelector('.sprite');
  if (!sprite) return;

  // If already playing same anim, do nothing (unless forced)
  const current = unitAnim.get(unitId);
  if (!force && current?.name === animName) return;

  const def = getAnimDef(u, animName);

  // fallback: if anim missing, try idle
  if (!def) {
    if (animName !== 'idle') return setAnim(unitId, 'idle', { loop: true, force: true });
    return;
  }

  stopAnim(unitId);

  const fps = def.fps || 10;
  const frames = def.frames || 1;
  const file = assetUrl(def.file || u.image_url);

  // frame size ON SCREEN (we scale the 100x100 source frame to this)
  const frameW = parseInt(root.dataset.spriteW || '100', 10);
  const frameH = parseInt(root.dataset.spriteH || '100', 10);

  sprite.style.width = '100%';
  sprite.style.height = '100%';

  sprite.style.backgroundImage = `url("${file}")`;
  sprite.style.backgroundRepeat = 'no-repeat';

  // Important: set background-size in pixels so each frame == frameW x frameH on screen
  sprite.style.backgroundSize = `${frames * frameW}px ${frameH}px`;
  setSpriteFrame(sprite, 0, frameW);

  // Single frame => nothing to animate
  if (frames <= 1) {
    unitAnim.set(unitId, { timer: null, name: animName });
    return;
  }

  let i = 0;
  const interval = Math.max(16, Math.round(1000 / fps));

  const timer = setInterval(() => {
    i += 1;

    if (i >= frames) {
      if (loop) {
        i = 0;
      } else {
        // stop on last frame
        i = frames - 1;
        setSpriteFrame(sprite, i, frameW);
        stopAnim(unitId);
        unitAnim.set(unitId, { timer: null, name: animName });
        return;
      }
    }

    setSpriteFrame(sprite, i, frameW);
  }, interval);

  unitAnim.set(unitId, { timer, name: animName });
}

// ---- Create & spawn units ----
function spawnUnits(units) {
  const layer = document.getElementById('units');
  layer.innerHTML = '';
  unitEls.clear();
  unitData.clear();
  unitAnim.clear();

  for (const u of units) {
    unitData.set(u.id, u);

    const root = document.createElement('div');
    root.className = `unit ${u.team === 'A' ? 'teamA' : 'teamB'}`;
    root.dataset.id = String(u.id);

    // sprite container
    const sprite = document.createElement('div');
    sprite.className = 'sprite';
    root.appendChild(sprite);

    // optional name label
    const label = document.createElement('div');
    label.className = 'unitLabel';
    label.textContent = u.name;
    root.appendChild(label);

    placeUnit(root, u.x, u.y, true);

    layer.appendChild(root);
    unitEls.set(u.id, root);

    // start idle using either "idle" anim or image_url
    if (u.animations?.idle) {
      setAnim(u.id, 'idle', { loop: true, force: true });
    } else {
      const frameW = parseInt(root.dataset.spriteW || '100', 10);
      const frameH = parseInt(root.dataset.spriteH || '100', 10);

      sprite.style.backgroundImage = `url("${assetUrl(u.image_url)}")`;
      sprite.style.backgroundRepeat = 'no-repeat';
      sprite.style.backgroundSize = `${frameW}px ${frameH}px`;
      sprite.style.backgroundPosition = `0px 0px`;
    }
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
  const w = cell * 3;
  const h = cell * 3;

  el.style.width = `${w}px`;
  el.style.height = `${h}px`;

  // store "frame size on screen" for animation background-size/position
  el.dataset.spriteW = String(Math.round(w));
  el.dataset.spriteH = String(Math.round(h));

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
  if (cursor >= queue.length) {
    if (lastData) showResult(lastData);
    return false;
  }

  const action = queue[cursor++];

  if (action.type === 'move') {

    const el = unitEls.get(action.unit_id);
    const duration = moveDuration(action.from, action.to);
    if (el) {
      setAnim(action.unit_id, 'walk', { loop: true });
      placeUnit(el, action.to.x, action.to.y);

      // match your CSS transition on .unit (520ms)
      await delay(duration);
      await delay(PAUSE_AFTER_MOVE);

      setAnim(action.unit_id, 'idle', { loop: true });
    } else {
      await sleep(220);
    }
    return true;
  }

  if (action.type === 'attack') {

    const aEl = unitEls.get(action.attacker_id);
    const tEl = unitEls.get(action.target_id);
        // Si l'attaquant est le wizard -> effet "glaçons" sur la cible
    const attackerUnit = unitData.get(action.attacker_id);

    // ❄️ Wizard effect sur la cellule cible (parfait même en diagonale)
    if (attackerUnit?.image_url?.includes('Wizard') && action.target_position) {
      playWizardImpactAtCell(action.target_position.x, action.target_position.y, {
        frames: 10,
        fps: 10,
        scale: 1.7,
        durationMs: 520 * SPEED,
        anchor: 'center'
      });
    }

    if (aEl) {
      setAnim(action.attacker_id, 'attack', { loop: false, force: true });
      setTimeout(() => setAnim(action.attacker_id, 'idle', { loop: true, force: true }),
        getAnimDurationMs(unitData.get(action.attacker_id), 'attack')
      );
    }

    
    if (tEl) {
      await sleep(HIT_DELAY);

      // hit flash (CSS)
      tEl.classList.add('hit');
      setTimeout(() => tEl.classList.remove('hit'), 260);

      if (!action.dead) {
        setAnim(action.target_id, 'hurt', { loop: false, force: true });

        setTimeout(
          () => setAnim(action.target_id, 'idle', { loop: true, force: true }),
          getAnimDurationMs(unitData.get(action.target_id), 'hurt')
        );
      } else {
        // mort déclenchée AU moment de l'impact (pas avant)
        setAnim(action.target_id, 'dead', { loop: false, force: true });

        const deadMs = getAnimDurationMs(unitData.get(action.target_id), 'dead') || 450;
        await sleep(deadMs);

        // optional fade/shrink after death anim
        tEl.style.transition = 'transform 320ms ease, opacity 320ms ease';
        tEl.style.opacity = '0';
        tEl.style.transform += ' translateZ(-10px) scale(0.6)';
        await sleep(340);

        stopAnim(action.target_id);
        tEl.remove();
        unitEls.delete(action.target_id);
        unitData.delete(action.target_id);
      }
    }

    await delay(360);
    await delay(PAUSE_AFTER_ATTACK);
    return true;
  }

  if (action.type === 'heal') {

    if (action.target_position) {
      playHealAuraAtCell(
        action.target_position.x,
        action.target_position.y,
        {
          frames: 4,
          fps: 10,
          scale: 3,
          durationMs: 520 * SPEED,
          anchor: 'center',
          offsetX: -15,
          offsetY: -85
        }
      );
    }

    const hEl = unitEls.get(action.healer_id);
    if (hEl) {
      setAnim(action.healer_id, 'heal', { loop: false, force: true });
      const healMs = getAnimDurationMs(unitData.get(action.healer_id), 'heal') || 500;
      await sleep(healMs);
      setAnim(action.healer_id, 'idle', { loop: true, force: true });
    } else {
      await sleep(220);
    }

    const tEl = unitEls.get(action.target_id);
    if (tEl) {
      tEl.classList.add('healFx');
      setTimeout(() => tEl.classList.remove('healFx'), 260);
    }
    await delay(PAUSE_AFTER_HEAL);

    return true;
  }

  // unknown action type
  await sleep(200);
  await delay(PAUSE_BETWEEN_ACTIONS);
  return true;
}

function moveDuration(from, to) {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  const steps = dx + dy; 
  return 600 + steps * 300; // ms
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
    lastData = data;
    hideResult();
    console.log('COMBAT DATA:', data);

    if (!data || !data.board || !data.units || !data.rounds) {
      throw new Error(`JSON invalide: ${JSON.stringify(data).slice(0, 200)}`);
    }

    renderBoard(data.board.width, data.board.height);
    spawnUnits(data.units);

    queue = buildQueue(data.rounds);
    cursor = 0;

    // status.textContent = `Winner: ${data.winner}`;
  } catch (e) {
    console.error(e);
    if (status) status.textContent = `Erreur: ${e.message}`;
  }
}

function getUnitScreenCenter(unitEl) {
  const r = unitEl.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 + window.scrollX,
    y: r.top + r.height / 2 + window.scrollY,
    w: r.width,
    h: r.height
  };
}

function getLayerScreenOrigin(layerEl) {
  const r = layerEl.getBoundingClientRect();
  return {
    x: r.left + window.scrollX,
    y: r.top + window.scrollY
  };
}

/**
 * Aura animée 4 frames (100x100) sur une unité.
 * - anchoredTo: "feet" (par défaut) ou "center"
 * - loop: false => joue 1 fois puis disparaît
 */
function playHealAuraAtCell(x, y, {
  frames = 4,
  fps = 12,
  frameSize = 100,
  durationMs = 520,
  scale = 1.6,
  z = 28,
  anchor = 'center',
  offsetX = -15,   // ← ton réglage
  offsetY = -85,   // ← ton réglage
} = {}) {
  const layer = document.getElementById('effects');
  if (!layer) return;

  const imgUrl = '/img/characters/projectiles/Priest-Heal_Effect.png';

  const eff = document.createElement('div');
  eff.className = 'effect';

  eff.style.width = `${frameSize}px`;
  eff.style.height = `${frameSize}px`;
  eff.style.backgroundImage = `url("${imgUrl}")`;
  eff.style.backgroundRepeat = 'no-repeat';
  eff.style.backgroundSize = `${frames * frameSize}px ${frameSize}px`;
  eff.style.backgroundPosition = `0px 0px`;

  layer.appendChild(eff);

  // --- Position basée sur la GRILLE (exacte) ---
  const { left, top, cell } = cellToPx(x, y);

  const cx = left + cell / 2 + offsetX;
  const cy = (
    anchor === 'feet'
      ? (top + cell * 0.78)
      : (top + cell / 2)
  ) + offsetY;

  const tx = cx - frameSize / 2;
  const ty = cy - frameSize / 2;

  eff.style.transform =
    `translate3d(${tx}px, ${ty}px, ${z}px)
     rotateX(calc(-1 * var(--tilt)))
     rotateY(calc(-1 * var(--yaw)))
     scale(${scale})`;

  // --- Animation frames ---
  let frame = 0;
  const interval = Math.max(16, Math.round(1000 / fps));
  const timer = setInterval(() => {
    eff.style.backgroundPosition = `${-frame * frameSize}px 0px`;
    frame = (frame + 1) % frames;
  }, interval);

  // petit pop-in magique
  eff.animate(
    [
      {
        opacity: 0,
        transform: eff.style.transform.replace(
          `scale(${scale})`,
          `scale(${scale * 0.85})`
        )
      },
      { opacity: 1, transform: eff.style.transform }
    ],
    { duration: 120, easing: 'ease-out', fill: 'forwards' }
  );

  // cleanup
  setTimeout(() => {
    clearInterval(timer);
    eff.style.transition = 'opacity 160ms ease';
    eff.style.opacity = '0';
    setTimeout(() => eff.remove(), 180);
  }, durationMs);
}

function playWizardImpactAtCell(x, y, {
  frames = 10,
  fps = 15,
  frameSize = 100,
  durationMs = 520,
  scale = 3,
  z = 30,                // profondeur
  anchor = 'center',     // 'center' | 'feet'
} = {}) {
  const layer = document.getElementById('effects');
  if (!layer) return;

  const imgUrl = '/img/characters/projectiles/Wizard-Attack01_Effect.png';

  const eff = document.createElement('div');
  eff.className = 'effect';
  eff.style.width = `${frameSize}px`;
  eff.style.height = `${frameSize}px`;
  eff.style.backgroundImage = `url("${imgUrl}")`;
  eff.style.backgroundRepeat = 'no-repeat';
  eff.style.backgroundSize = `${frames * frameSize}px ${frameSize}px`;
  eff.style.backgroundPosition = `0px 0px`;

  layer.appendChild(eff);

  // --- Convert cell (x,y) -> board pixels (same logic as units) ---
  const { left, top, cell } = cellToPx(x, y);

  const OFFSET_Y = -95;
  const OFFSET_X = -5;
  // center = milieu de la tile ; feet = plus bas (style impact au sol)
  const cx = (left + cell / 2) + OFFSET_X;
  const cy = ((anchor === 'feet') ? (top + cell * 0.78) : (top + cell / 2)) + OFFSET_Y;

  // Place l’effet au centre choisi
  const tx = cx - frameSize / 2;
  const ty = cy - frameSize / 2;

  // IMPORTANT: effects-layer est incliné comme le board,
  // donc on contre-rotate pour que l'effet reste face caméra (billboard)
  eff.style.transform =
    `translate3d(${tx}px, ${ty}px, ${z}px) ` +
    `rotateX(calc(-1 * var(--tilt))) ` +
    `rotateY(calc(-1 * var(--yaw))) ` +
    `scale(${scale})`;

  // --- frame animation ---
  let frame = 0;
  const interval = Math.max(16, Math.round(1000 / fps));
  const timer = setInterval(() => {
    eff.style.backgroundPosition = `${-frame * frameSize}px 0px`;
    frame = (frame + 1) % frames;
  }, interval);

  // petit pop-in
  eff.animate(
    [
      { opacity: 0, transform: eff.style.transform.replace(`scale(${scale})`, `scale(${scale * 0.85})`) },
      { opacity: 1, transform: eff.style.transform }
    ],
    { duration: 120, easing: 'ease-out', fill: 'forwards' }
  );

  setTimeout(() => {
    clearInterval(timer);
    eff.style.transition = 'opacity 140ms ease';
    eff.style.opacity = '0';
    setTimeout(() => eff.remove(), 160);
  }, durationMs);
}

function clearLayers() {
  const unitsLayer = document.getElementById('units');
  const effectsLayer = document.getElementById('effects');
  if (unitsLayer) unitsLayer.innerHTML = '';
  if (effectsLayer) effectsLayer.innerHTML = '';
  unitEls.clear();
  unitData.clear();
  unitAnim.clear();
}

function showResult(data) {
  const banner = document.getElementById('resultBanner');
  if (!banner || !data) return;

  // Team A name comes from JSON teams.A.name
  const teamAName = data?.teams?.A?.name;
  const winner = data?.winner;

  const win = (winner && teamAName && winner === teamAName);

  banner.hidden = false;
  banner.classList.toggle('win', win);
  banner.classList.toggle('lose', !win);
  banner.textContent = win ? 'VICTOIRE' : 'DÉFAITE';
}

function hideResult() {
  const banner = document.getElementById('resultBanner');
  if (!banner) return;
  banner.hidden = true;
  banner.classList.remove('win', 'lose');
  banner.textContent = '';
}

function resetCombat() {
  if (!lastData) return;
  // stop animations timers
  for (const id of unitAnim.keys()) stopAnim(id);

  clearLayers();
  renderBoard(lastData.board.width, lastData.board.height);
  spawnUnits(lastData.units);

  queue = buildQueue(lastData.rounds);
  cursor = 0;

  hideResult();
}

async function playAll() {
  if (isPlaying) return;
  isPlaying = true;
  while (await step()) { /* loop */ }
  isPlaying = false;
  if (lastData) showResult(lastData);
}

// ---- Wire UI ----
document.addEventListener('DOMContentLoaded', () => {
  init();

  const btnPlay = document.getElementById('btnPlay');
  const btnStep = document.getElementById('btnStep');
  const btnReplay = document.getElementById('btnReplay');

  if (btnPlay) btnPlay.addEventListener('click', playAll);
  if (btnStep) btnStep.addEventListener('click', step);
  if (btnReplay) btnReplay.addEventListener('click', () => {
    resetCombat();
  });
});
