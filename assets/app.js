// import './stimulus_bootstrap.js';
/*
 * Welcome to your app's main JavaScript file!
 *
 * This file will be included onto the page via the importmap() Twig function,
 * which should already be in your base.html.twig.
 */
import './styles/app.scss';

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

function createBoard(w, h) {
    const board = document.getElementById('board');
    board.innerHTML = '';

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.addEventListener('click', () => placeUnit(cell));

            // zone neutre par défaut
            cell.classList.add('forbidden');

            board.appendChild(cell);
        }
    }
}

function renderUnits(units, team) {
    const container = document.getElementById(`team${team}-units`);
    units.forEach(unit => {
        const div = document.createElement('div');
        div.className = 'unit';
        div.textContent = `${unit.name} Role : ${unit.role}, Range: ${unit.range}`;
        div.onclick = () => selectUnit(unit, team, div);
        container.appendChild(div);
    });
}

function selectUnit(unit, team, el) {
    document.querySelectorAll('.unit').forEach(u => u.classList.remove('selected'));
    el.classList.add('selected');

    selectedUnit = { ...unit, team };

    document.querySelectorAll('.cell').forEach(cell => {
        const x = parseInt(cell.dataset.x);

        if (ZONE_RULES[team](x)) {
            cell.classList.remove('forbidden');
            cell.classList.add(`allowed-${team}`);
        } else {
            cell.classList.add('forbidden');
            cell.classList.remove('allowed-A', 'allowed-B');
        }
    });
}

function placeUnit(cell) {
    if (!selectedUnit) return;
    if (cell.classList.contains('forbidden')) return;
    if (cell.classList.contains('A') || cell.classList.contains('B')) return;

    cell.classList.remove('allowed-A', 'allowed-B');
    cell.classList.add(selectedUnit.team);
    cell.textContent = selectedUnit.name;

    placement[`team${selectedUnit.team}`].push({
        id: selectedUnit.id,
        x: parseInt(cell.dataset.x),
        y: parseInt(cell.dataset.y)
    });

    selectedUnit = removeUnit(selectedUnit.name, selectedUnit.team);
    selectedUnit = null;
    document.querySelectorAll('.unit').forEach(u => u.classList.remove('selected'));
    document.querySelectorAll('.cell').forEach(c =>
        c.classList.remove('allowed-A', 'allowed-B')
    );
}

function removeUnit(name, team) {
    const container = document.getElementById(`team${team}-units`);
    const units = Array.from(container.children);
    for (let unitDiv of units) {
        if (unitDiv.textContent.startsWith(name)) {
            unitDiv.removeEventListener('click', () => selectUnit);
            unitDiv.classList.add('removed');
            break;
        }
    }
    return null;
}

document.getElementById('startCombat').addEventListener('click', () => {
    // Sécurité minimale
    if (placement.teamA.length <= 2 || placement.teamB.length <= 2) {
        return;
    }

    fetch('/combat/placement', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(placement)
    })
    .then(res => res.json())
    .then(data => {
        console.log('Placement enregistré', data);
        alert('Placement envoyé au serveur ✔');
    })
    .catch(err => {
        console.error(err);
        alert('Erreur lors de l’envoi');
    });
});

// Combat Logic

let combatData;
let currentRound = 0;

async function loadCombat() {
    const response = await fetch('/game/json');
    combatData = await response.json();
    initBattle(combatData);
}

function initBattle(data) {
    const teamAContainer = document.querySelector("#teamA .unit-container");
    const teamBContainer = document.querySelector("#teamB .unit-container");
    const unitDivs = {};

    data.rounds.forEach(round => {
        round.actions.forEach(action => {
            ['attacker','target'].forEach(nameKey => {
                const name = action[nameKey];
                const team = nameKey === 'attacker' ? action.attacker_team : action.target_team;

                if (!unitDivs[name]) {
                    const div = document.createElement('div');
                    div.className = 'unit';
                    div.id = `unit-${name}`;
                    div.innerHTML = `${name}<br>HP: <span class="hp">?</span>`;

                    if (team === 'A') teamAContainer.appendChild(div);
                    else teamBContainer.appendChild(div);

                    unitDivs[name] = div;
                }
            });
        });
    });
}

function applyRound(round) {
    round.actions.forEach(action => {
        const unitDiv = document.getElementById(`unit-${action.target}`);
        if (!unitDiv) return;
        unitDiv.querySelector('.hp').textContent = action.target_hp;
        if (action.dead) unitDiv.classList.add('dead');
        // animation simple
        unitDiv.style.backgroundColor = "#f88";
        setTimeout(()=>unitDiv.style.backgroundColor="#eee",300);
    });
}

document.getElementById('nextRound').addEventListener('click', () => {
    if (currentRound >= combatData.rounds.length) return;
    applyRound(combatData.rounds[currentRound]);
    currentRound++;
});

window.addEventListener('DOMContentLoaded', loadCombat);