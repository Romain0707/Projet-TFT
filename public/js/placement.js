/* =========================================================
   Placement & déplacement (Team A uniquement)
   - Placement depuis la liste Team A
   - Déplacement depuis la liste OU directement depuis le board
   - Highlight zones + cellule source (move-source)
   - Toggle annulation (recliquer la source)
   ========================================================= */

let selectedUnit = null;  // placement initial A (depuis la liste)
let movingUnit = null;    // déplacement A (depuis liste ou board)

let teamAUnitsById = new Map(); // id -> unit (pour sélectionner depuis le board)

const IMG_BASE_PATH = "/img/";

const placement = {
  teamA: [],
  teamB: []
};

const ZONE_RULES = {
  A: (x) => x <= 2,
  B: (x) => x >= 3
};

function roleToPreferredX(roleName) {
  const r = (roleName || "").toLowerCase();

  if (r.includes("tank")) return 3;
  if (r.includes("dps") || r.includes("damage") || r.includes("degat") || r.includes("dégât")) return 4;
  if (r.includes("heal") || r.includes("healer") || r.includes("soin")) return 5;

  return 4;
}

/* =========================================================
   Fetch init
   ========================================================= */

fetch("/game/placement-data")
  .then((res) => res.json())
  .then(initPlacement)
  .catch((err) => console.error(err));

function initPlacement(data) {
  createBoard(data.board.width, data.board.height);

  renderUnitsTeamA(data.teams.A);
  renderUnitsTeamBReadOnly(data.teams.B);

  // mémorise Team A pour pouvoir initier un move depuis le board
  teamAUnitsById = new Map(data.teams.A.map((u) => [u.id, u]));

  autoPlaceTeamB(data.teams.B, data.board);

  clearHighlights();
  clearMoveSource();
  clearListSelection();
}

/* =========================================================
   Board
   ========================================================= */

function createBoard(w, h) {
  const board = document.getElementById("board");
  board.innerHTML = "";

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cell = document.createElement("div");
      cell.className = "cell forbidden";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);

      cell.addEventListener("click", () => onCellClick(cell));
      board.appendChild(cell);
    }
  }
}

/* =========================================================
   Render units lists
   ========================================================= */

function renderUnitsTeamA(units) {
  const container = document.getElementById("teamA-units");
  container.innerHTML = "";

  units.forEach((unit) => {
    const div = document.createElement("div");
    div.className = "unit";
    div.dataset.id = String(unit.id);

    const label = document.createElement("div");
    label.className = "unit-label";
    label.textContent = `${unit.name} ${unit.role} (Portée:${unit.range})`;

    const divImg = document.createElement("div");
    divImg.className = "div-unit-image";

    const img = document.createElement("img");
    img.src = IMG_BASE_PATH + unit.image_url;
    img.alt = unit.name;
    img.className = "unit-image";

    div.appendChild(label);
    div.appendChild(divImg);
    divImg.appendChild(img);

    // Team A cliquable même si déjà placée (pour la déplacer)
    div.addEventListener("click", () => selectUnitFromList(unit, div));

    container.appendChild(div);
  });
}

function renderUnitsTeamBReadOnly(units) {
  const container = document.getElementById("teamB-units");
  container.innerHTML = "";

  units.forEach((unit) => {
    const div = document.createElement("div");
    div.className = "unit placed";
    div.dataset.id = String(unit.id);

    const label = document.createElement("div");
    label.className = "unit-label";
    label.textContent = `${unit.name} ${unit.role} (Portée:${unit.range})`;

    const divImg = document.createElement("div");
    divImg.className = "div-unit-image";

    const img = document.createElement("img");
    img.src = IMG_BASE_PATH + unit.image_url;
    img.alt = unit.name;
    img.className = "unit-image";

    div.appendChild(label);
    div.appendChild(divImg);
    divImg.appendChild(img);

    container.appendChild(div);
  });
}

/* =========================================================
   Sélection depuis LISTE Team A
   - si pas placée => placement initial
   - si placée => déplacement
   ========================================================= */

function selectUnitFromList(unit, el) {
  // reset visuel liste + move-source
  clearListSelection();
  el.classList.add("selected");
  clearMoveSource();

  const alreadyPlaced = el.classList.contains("placed");

  if (alreadyPlaced) {
    const cell = getCellByUnitId(unit.id, "A");
    if (!cell) return;

    // toggle annulation si on re-sélectionne la même en cours de move
    if (movingUnit && movingUnit.id === unit.id) {
      cancelActions();
      return;
    }

    selectedUnit = null;
    movingUnit = {
      ...unit,
      side: "A",
      from: {
        x: parseInt(cell.dataset.x, 10),
        y: parseInt(cell.dataset.y, 10)
      }
    };

    cell.classList.add("move-source");
    highlightZones("A");
    return;
  }

  // placement initial
  movingUnit = null;
  selectedUnit = { ...unit, side: "A" };
  highlightZones("A");
}

/* =========================================================
   Click sur une cellule du BOARD
   - si cellule occupée A => init déplacement depuis board
   - sinon si movingUnit => tenter déplacement
   - sinon si selectedUnit => tenter placement initial
   - sinon si clic "hors allowed" pendant une action => annule
   ========================================================= */

function onCellClick(cell) {
  const isOccupied = cell.classList.contains("occupied");
  const isTeamAOccupied = isOccupied && cell.classList.contains("A");

  // 1) Clique directement sur une unité Team A sur le board => init move
  if (isTeamAOccupied) {
    const unitId = parseInt(cell.dataset.unitId, 10);
    const unit = teamAUnitsById.get(unitId);
    if (!unit) return;

    // toggle : re-cliquer la source annule
    if (movingUnit && movingUnit.id === unitId) {
      cancelActions();
      return;
    }

    selectedUnit = null;
    movingUnit = {
      ...unit,
      side: "A",
      from: {
        x: parseInt(cell.dataset.x, 10),
        y: parseInt(cell.dataset.y, 10)
      }
    };

    // Visuels
    clearMoveSource();
    cell.classList.add("move-source");

    clearListSelection();
    const listEl = document.querySelector(`#teamA-units .unit[data-id="${unitId}"]`);
    if (listEl) listEl.classList.add("selected");

    highlightZones("A");
    return;
  }

  // 2) Si déplacement en cours => essayer de déplacer
  if (movingUnit) {
    // si clique sur une case non autorisée => annuler (pratique)
    if (cell.classList.contains("forbidden") || cell.classList.contains("occupied")) {
      cancelActions();
      return;
    }
    moveUnitA(movingUnit, cell);
    return;
  }

  // 3) Si placement initial en cours => essayer de placer
  if (selectedUnit) {
    // si clique non autorisé => annuler (pratique)
    if (cell.classList.contains("forbidden") || cell.classList.contains("occupied")) {
      cancelActions();
      return;
    }
    placeUnitA(selectedUnit, cell);
    return;
  }

  // 4) Rien en cours : rien
}

/* =========================================================
   Zones
   ========================================================= */

function highlightZones(team) {
  document.querySelectorAll(".cell").forEach((cell) => {
    const x = parseInt(cell.dataset.x, 10);

    cell.classList.remove("allowed-A", "allowed-B");
    cell.classList.add("forbidden");

    const isAllowedZone = ZONE_RULES[team]?.(x);
    const isOccupied = cell.classList.contains("occupied");

    if (isAllowedZone && !isOccupied) {
      cell.classList.remove("forbidden");
      cell.classList.add(`allowed-${team}`);
    }
  });
}

function clearHighlights() {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove("allowed-A", "allowed-B");
    cell.classList.add("forbidden");
  });
}

/* =========================================================
   Placement initial A
   ========================================================= */

function placeUnitA(unit, cell) {
  if (!unit || unit.side !== "A") return;
  if (cell.classList.contains("forbidden")) return;
  if (cell.classList.contains("occupied")) return;

  occupyCell(cell, unit.id, "A", unit.name);

  placement.teamA.push({
    id: unit.id,
    position: {
      x: parseInt(cell.dataset.x, 10),
      y: parseInt(cell.dataset.y, 10)
    }
  });

  markUnitAsPlaced(unit.id, "A");
  cancelActions(false); // false => on ne dé-sélectionne pas forcément (mais ici on nettoie tout)
}

/* =========================================================
   Déplacement A
   ========================================================= */

function moveUnitA(unit, targetCell) {
  if (!unit || unit.side !== "A") return;
  if (targetCell.classList.contains("forbidden")) return;
  if (targetCell.classList.contains("occupied")) return;

  const oldCell = getCellByUnitId(unit.id, "A");
  if (!oldCell) return;

  freeCell(oldCell);

  upsertPlacement("teamA", unit.id, {
    x: parseInt(targetCell.dataset.x, 10),
    y: parseInt(targetCell.dataset.y, 10)
  });

  occupyCell(targetCell, unit.id, "A", unit.name);
  markUnitAsPlaced(unit.id, "A");

  cancelActions(false);
}

/* =========================================================
   Placement direct (Team B auto)
   ========================================================= */

function placeUnitDirect(unit, team, cell) {
  if (!cell) return;
  if (cell.classList.contains("occupied")) return;

  occupyCell(cell, unit.id, team, unit.name);

  placement[`team${team}`].push({
    id: unit.id,
    position: {
      x: parseInt(cell.dataset.x, 10),
      y: parseInt(cell.dataset.y, 10)
    }
  });
}

/* =========================================================
   Auto placement Team B
   ========================================================= */

function autoPlaceTeamB(unitsB, board) {
  const allowedXs = [];
  for (let x = 0; x < board.width; x++) {
    if (ZONE_RULES.B(x)) allowedXs.push(x);
  }

  const buckets = {};
  unitsB.forEach((u) => {
    const x = roleToPreferredX(u.role);
    if (!buckets[x]) buckets[x] = [];
    buckets[x].push(u);
  });

  Object.keys(buckets).forEach((k) => shuffleInPlace(buckets[k]));

  const ordered = Object.values(buckets).flat();

  ordered.forEach((unit) => {
    const idealX = roleToPreferredX(unit.role);

    const xCandidates = unique([idealX, ...allowedXs]).filter((x) => allowedXs.includes(x));

    const cell = findFreeCellForB_ByX(xCandidates, board.height);

    if (!cell) {
      console.warn("Plus de place pour placer l'unité B:", unit);
      return;
    }

    placeUnitDirect(unit, "B", cell);
    markUnitAsPlaced(unit.id, "B");
  });
}

function findFreeCellForB_ByX(xCandidates, height) {
  for (const x of xCandidates) {
    const ys = [];
    for (let y = 0; y < height; y++) ys.push(y);
    shuffleInPlace(ys);

    for (const y of ys) {
      const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
      if (!cell) continue;
      if (cell.classList.contains("occupied")) continue;
      if (!ZONE_RULES.B(x)) continue;

      return cell;
    }
  }
  return null;
}

/* =========================================================
   DOM helpers (cell <-> unit)
   ========================================================= */

function occupyCell(cell, unitId, team, displayName) {
  cell.classList.remove("allowed-A", "allowed-B");
  cell.classList.add("occupied", team);
  cell.dataset.unitId = String(unitId);
  cell.dataset.team = team;
  cell.textContent = displayName;
}

function freeCell(cell) {
  if (!cell) return;
  cell.classList.remove("occupied", "A", "B", "move-source");
  cell.textContent = "";
  delete cell.dataset.unitId;
  delete cell.dataset.team;
}

function getCellByUnitId(unitId, team) {
  return document.querySelector(`.cell.occupied.${team}[data-unit-id="${unitId}"]`);
}

/* =========================================================
   Placement array helpers
   ========================================================= */

function upsertPlacement(teamKey, unitId, pos) {
  const arr = placement[teamKey];
  const idx = arr.findIndex((p) => p.id === unitId);

  const entry = {
    id: unitId,
    position: { x: pos.x, y: pos.y }
  };

  if (idx >= 0) arr[idx] = entry;
  else arr.push(entry);
}

/* =========================================================
   List helpers
   ========================================================= */

function clearListSelection() {
  document.querySelectorAll("#teamA-units .unit").forEach((u) => u.classList.remove("selected"));
}

function markUnitAsPlaced(id, team) {
  const container = document.getElementById(`team${team}-units`);
  if (!container) return;

  const units = container.querySelectorAll(".unit");
  units.forEach((unitEl) => {
    if (parseInt(unitEl.dataset.id, 10) === id) {
      unitEl.classList.remove("selected");
      unitEl.classList.add("placed");
    }
  });
}

/* =========================================================
   Move-source helpers
   ========================================================= */

function clearMoveSource() {
  document.querySelectorAll(".cell.move-source").forEach((c) => c.classList.remove("move-source"));
}

/* =========================================================
   Cancel / reset UX
   ========================================================= */

function cancelActions(clearSelectedFromList = true) {
  selectedUnit = null;
  movingUnit = null;
  clearHighlights();
  clearMoveSource();
  if (clearSelectedFromList) clearListSelection();
}

/* =========================================================
   Utils
   ========================================================= */

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function unique(arr) {
  return [...new Set(arr)];
}

/* =========================================================
   Start combat (save)
   ========================================================= */

document.getElementById("startCombat").addEventListener("click", () => {
  if (placement.teamA.length <= 2 || placement.teamB.length <= 2) {
    alert("Les deux équipes doivent avoir des unités placées");
    return;
  }

  fetch("/game/placement/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(placement)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.redirect) window.location.href = data.redirect;
    })
    .catch((err) => console.error(err));
});
