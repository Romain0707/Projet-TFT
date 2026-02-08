/* ===================== PLACEMENT.JS ===================== */

let selectedUnit = null;

const placement = {
    teamA: [],
    teamB: []
};

// Zones autorisées par équipe (selon X)
const ZONE_RULES = {
    A: x => x <= 2,
    B: x => x >= 3
};

// ⚠️ Adapter ici si tes noms de rôles ne sont pas "Tank/DPS/Healer"
function roleToPreferredY(roleName) {
    const r = (roleName || "").toLowerCase();

    // Exemples: "Tank", "DPS", "Healer"
    if (r.includes("tank")) return 0;
    if (r.includes("dps") || r.includes("damage") || r.includes("degat") || r.includes("dégât")) return 1;
    if (r.includes("heal") || r.includes("healer") || r.includes("soin")) return 2;

    // fallback: ligne DPS
    return 1;
}

/* ===================== INIT ===================== */

fetch('/game/placement-data')
    .then(res => res.json())
    .then(initPlacement)
    .catch(err => console.error(err));

function initPlacement(data) {
    createBoard(data.board.width, data.board.height);

    // ✅ Team A: affichée + placement manuel
    renderUnitsTeamA(data.teams.A);

    // ✅ Team B: pas de liste cliquable (placement auto)
    renderUnitsTeamBReadOnly(data.teams.B);

    // ✅ Placement auto + affichage sur le board
    autoPlaceTeamB(data.teams.B, data.board);
}

/* ===================== BOARD ===================== */

function createBoard(w, h) {
    const board = document.getElementById('board');
    board.innerHTML = '';

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell forbidden';
            cell.dataset.x = x;
            cell.dataset.y = y;

            // ✅ clic = placement uniquement pour Team A (selectedUnit.side === 'A')
            cell.addEventListener('click', () => placeUnit(cell));

            board.appendChild(cell);
        }
    }
}

/* ===================== UNITS LIST ===================== */

/**
 * Team A: unités cliquables (placement manuel)
 */
function renderUnitsTeamA(units) {
    const container = document.getElementById('teamA-units');
    container.innerHTML = '';

    units.forEach(unit => {
        const div = document.createElement('div');
        div.className = 'unit';
        div.dataset.id = unit.id;

        // Texte
        const label = document.createElement('div');
        label.className = 'unit-label';
        label.textContent = `${unit.name} ${unit.role} (Portée:${unit.range})`;

        // Image
        const img = document.createElement('img');
        img.src = unit.image_url;
        img.alt = unit.name;
        img.className = 'unit-image';

        div.appendChild(label);
        div.appendChild(img);

        div.addEventListener('click', () => selectUnit(unit, 'A', div));

        container.appendChild(div);
    });
}

/**
 * Team B: liste affichée, mais NON cliquable (placement auto)
 * (Tu peux aussi carrément masquer ce container côté Twig/CSS si tu veux.)
 */
function renderUnitsTeamBReadOnly(units) {
    const container = document.getElementById('teamB-units');
    container.innerHTML = '';

    units.forEach(unit => {
        const div = document.createElement('div');
        div.className = 'unit placed'; // "placed" visuellement (car auto)
        div.dataset.id = unit.id;

        const label = document.createElement('div');
        label.className = 'unit-label';
        label.textContent = `${unit.name} ${unit.role} (Portée:${unit.range})`;

        const img = document.createElement('img');
        img.src = unit.image_url;
        img.alt = unit.name;
        img.className = 'unit-image';

        div.appendChild(label);
        div.appendChild(img);

        // Pas de click handler
        container.appendChild(div);
    });
}

function selectUnit(unit, team, el) {
    // sécurité : on ne sélectionne que A
    if (team !== 'A') return;
    if (el.classList.contains('placed')) return;

    document.querySelectorAll('.unit').forEach(u => u.classList.remove('selected'));
    el.classList.add('selected');

    selectedUnit = { ...unit, side: team };
    highlightZones(team);
}

/* ===================== ZONES ===================== */

function highlightZones(team) {
    document.querySelectorAll('.cell').forEach(cell => {
        const x = parseInt(cell.dataset.x, 10);
        cell.classList.remove('allowed-A', 'allowed-B');
        cell.classList.add('forbidden');

        if (ZONE_RULES[team](x) && !cell.classList.contains('occupied')) {
            cell.classList.remove('forbidden');
            cell.classList.add(`allowed-${team}`);
        }
    });
}

function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('allowed-A', 'allowed-B');
        cell.classList.add('forbidden');
    });
}

/* ===================== PLACEMENT (MANUEL A + UTILITAIRE AUTO B) ===================== */

function placeUnit(cell) {
    // ✅ only if a unit is selected
    if (!selectedUnit) return;

    // ✅ only allow manual placement for team A
    if (selectedUnit.side !== 'A') return;

    if (cell.classList.contains('forbidden')) return;
    if (cell.classList.contains('occupied')) return;

    // Marque la cellule comme occupée
    cell.classList.remove('allowed-A', 'allowed-B');
    cell.classList.add('occupied', selectedUnit.side);

    // Affichage (texte)
    cell.textContent = selectedUnit.name;

    // Sauvegarde
    placement.teamA.push({
        id: selectedUnit.id,
        position: {
            x: parseInt(cell.dataset.x, 10),
            y: parseInt(cell.dataset.y, 10)
        }
    });

    // Visuel dans la liste A
    markUnitAsPlaced(selectedUnit.id, 'A');

    selectedUnit = null;
    clearHighlights();
}

/**
 * Place une unité sur une cellule (utilisé par l’auto-placement de B)
 * - Ne dépend pas de selectedUnit
 */
function placeUnitDirect(unit, team, cell) {
    if (!cell) return;
    if (cell.classList.contains('occupied')) return;

    cell.classList.add('occupied', team);
    cell.textContent = unit.name;

    placement[`team${team}`].push({
        id: unit.id,
        position: {
            x: parseInt(cell.dataset.x, 10),
            y: parseInt(cell.dataset.y, 10)
        }
    });
}

function markUnitAsPlaced(id, team) {
    const container = document.getElementById(`team${team}-units`);
    if (!container) return;

    const units = container.querySelectorAll('.unit');
    units.forEach(unitEl => {
        if (parseInt(unitEl.dataset.id, 10) === id) {
            unitEl.classList.remove('selected');
            unitEl.classList.add('placed');
        }
    });
}

/* ===================== AUTO-PLACEMENT TEAM B ===================== */

function autoPlaceTeamB(unitsB, board) {
    // Colonnes autorisées côté B
    const allowedXs = [];
    for (let x = 0; x < board.width; x++) {
        if (ZONE_RULES.B(x)) allowedXs.push(x);
    }

    // Buckets par ligne cible (y)
    const buckets = { 0: [], 1: [], 2: [], 3: [] };
    unitsB.forEach(u => {
        const y = roleToPreferredY(u.role);
        if (!buckets[y]) buckets[y] = [];
        buckets[y].push(u);
    });

    // Randomize dans chaque bucket
    Object.keys(buckets).forEach(k => shuffleInPlace(buckets[k]));

    // Ordre: tanks (0) -> dps (1) -> healer (2) -> reste (3+)
    const ordered = [
        ...(buckets[0] || []),
        ...(buckets[1] || []),
        ...(buckets[2] || []),
        ...(buckets[3] || [])
    ];

    ordered.forEach(unit => {
        const idealY = roleToPreferredY(unit.role);
        const yCandidates = unique([idealY, 0, 1, 2, 3]).filter(y => y >= 0 && y < board.height);

        const cell = findFreeCellForB(allowedXs, yCandidates);
        if (!cell) {
            console.warn("Plus de place pour placer l'unité B:", unit);
            return;
        }

        placeUnitDirect(unit, 'B', cell);
        markUnitAsPlaced(unit.id, 'B'); // (la liste B est déjà "placed", mais ok)
    });

    clearHighlights();
}

function findFreeCellForB(allowedXs, yCandidates) {
    for (const y of yCandidates) {
        // randomize X order
        const xs = allowedXs.slice();
        shuffleInPlace(xs);

        for (const x of xs) {
            const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            if (!cell) continue;
            if (cell.classList.contains('occupied')) continue;
            if (!ZONE_RULES.B(x)) continue;
            return cell;
        }
    }
    return null;
}

function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function unique(arr) {
    return [...new Set(arr)];
}

/* ===================== SEND TO BACK ===================== */

document.getElementById('startCombat').addEventListener('click', () => {
    if (placement.teamA.length === 0 || placement.teamB.length === 0) {
        alert('Les deux équipes doivent avoir des unités placées');
        return;
    }

    fetch('/game/placement/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(placement)
    })
        .then(res => res.json())
        .then(data => {
            if (data.redirect) {
                window.location.href = data.redirect;
            }
        })
        .catch(err => console.error(err));
});