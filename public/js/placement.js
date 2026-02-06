/* ===================== PLACEMENT.JS ===================== */

let selectedUnit = null;

const placement = {
    teamA: [],
    teamB: []
};

const ZONE_RULES = {
    A: x => x <= 2,
    B: x => x >= 3
};

fetch('/game/placement-data')
    .then(res => res.json())
    .then(initPlacement);

function initPlacement(data) {
    createBoard(data.board.width, data.board.height);
    renderUnits(data.teams.A, 'A');
    renderUnits(data.teams.B, 'B');
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
            cell.addEventListener('click', () => placeUnit(cell));
            board.appendChild(cell);
        }
    }
}

/* ===================== UNITS ===================== */

function renderUnits(units, team) {
    const container = document.getElementById(`team${team}-units`);
    container.innerHTML = '';

    units.forEach(unit => {
        const div = document.createElement('div');
        div.className = 'unit';
        div.dataset.id = unit.id;
        div.textContent = `${unit.name} ${unit.role} (Portée:${unit.range})`;

        // Ajout de l'image pour chaque unité
        const img = document.createElement('img');
        img.src = unit.image_url;  // On utilise l'URL de l'image
        img.alt = unit.name;
        img.className = 'unit-image'; // Tu peux ajouter une classe CSS pour les images

        div.appendChild(img);  // Ajout de l'image dans l'élément

        div.addEventListener('click', () => selectUnit(unit, team, div));
        container.appendChild(div);
    });
}

function selectUnit(unit, team, el) {
    if (el.classList.contains('placed')) return;

    document.querySelectorAll('.unit').forEach(u => u.classList.remove('selected'));
    el.classList.add('selected');

    selectedUnit = { ...unit, side: team }; 

    highlightZones(team);
}

function highlightZones(team) {
    document.querySelectorAll('.cell').forEach(cell => {
        const x = parseInt(cell.dataset.x);
        cell.classList.remove('allowed-A', 'allowed-B');
        cell.classList.add('forbidden');

        if (ZONE_RULES[team](x) && !cell.classList.contains('occupied')) {
            cell.classList.remove('forbidden');
            cell.classList.add(`allowed-${team}`);
        }
    });
}

/* ===================== PLACEMENT ===================== */

function placeUnit(cell) {
    console.log("placeUnit called", { selectedUnit, x: cell.dataset.x, y: cell.dataset.y, classes: [...cell.classList] });
    if (!selectedUnit) return;
    if (cell.classList.contains('forbidden')) return;
    if (cell.classList.contains('occupied')) return;

    cell.classList.remove('allowed-A', 'allowed-B');
    cell.classList.add('occupied', selectedUnit.side);
    cell.textContent = selectedUnit.name;

    placement[`team${selectedUnit.side}`].push({
        id: selectedUnit.id,
        position: {
            x: parseInt(cell.dataset.x),
            y: parseInt(cell.dataset.y)
        }
    });
    console.log("PUSH OK", selectedUnit.side, placement.teamA.length, placement.teamB.length, placement);

    markUnitAsPlaced(selectedUnit.id, selectedUnit.side);

    selectedUnit = null;
    clearHighlights();

    // ✅ debug utile
    console.log("placement", placement);
}


function markUnitAsPlaced(id, team) {
    const container = document.getElementById(`team${team}-units`);
    const units = container.querySelectorAll('.unit');

    units.forEach(unit => {
        if (parseInt(unit.dataset.id) === id) {
            unit.classList.remove('selected');
            unit.classList.add('placed');
        }
    });
}

function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('allowed-A', 'allowed-B');
        cell.classList.add('forbidden');
    });
}

/* ===================== SEND TO BACK ===================== */

document.getElementById('startCombat').addEventListener('click', () => {
    console.log("START CLICK", placement.teamA.length, placement.teamB.length, placement);
    
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