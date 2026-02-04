const boardEl = document.getElementById('battlefield');
const logEl = document.getElementById('combat-log');

const units = {};
const CELL_SIZE = 60;

fetch('/combat/json')
    .then(res => res.json())
    .then(startCombat);

function startCombat(data) {
    createBoard(data.board.width, data.board.height);
    playRounds(data.rounds);
}

/* ---------------- BOARD ---------------- */

function createBoard(w, h) {
    boardEl.innerHTML = '';
    boardEl.style.display = 'grid';
    boardEl.style.gridTemplateColumns = `repeat(${w}, ${CELL_SIZE}px)`;
    boardEl.style.gap = '5px';

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.style.width = CELL_SIZE + 'px';
            cell.style.height = CELL_SIZE + 'px';
            cell.style.border = '1px solid #333';
            cell.style.display = 'flex';
            cell.style.alignItems = 'center';
            cell.style.justifyContent = 'center';
            boardEl.appendChild(cell);
        }
    }
}

/* ---------------- UNITS ---------------- */

function getCell(x, y) {
    return document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
}

function spawnUnit(name, team, x, y) {
    if (units[name]) return;

    units[name] = { name, team, x, y };

    const cell = getCell(x, y);
    cell.textContent = name;
    cell.style.background = team === 'A' ? '#cce5ff' : '#ffd6cc';
}

function moveUnit(name, to) {
    const unit = units[name];
    if (!unit) return;

    getCell(unit.x, unit.y).textContent = '';
    unit.x = to.x;
    unit.y = to.y;

    const cell = getCell(to.x, to.y);
    cell.textContent = name;
    cell.style.background = unit.team === 'A' ? '#cce5ff' : '#ffd6cc';
}

/* ---------------- COMBAT ---------------- */

function playRounds(rounds) {
    let delay = 0;

    rounds.forEach(round => {
        round.actions.forEach(action => {
            setTimeout(() => applyAction(action), delay);
            delay += 800;
        });
    });
}

function applyAction(action) {
    if (action.type === 'move') {
        spawnUnit(action.unit, action.team, action.from.x, action.from.y);
        moveUnit(action.unit, action.to);

        log(`${action.unit} se déplace`);
    }

    if (action.type === 'attack') {
        spawnUnit(
            action.attacker,
            action.attacker_team,
            action.attacker_position.x,
            action.attacker_position.y
        );

        spawnUnit(
            action.target,
            action.target_team,
            action.target_position.x,
            action.target_position.y
        );

        log(
            `${action.attacker} attaque ${action.target} (${action.damage})`
        );

        if (action.dead) {
            setTimeout(() => killUnit(action.target), 300);
        }
    }
}

function killUnit(name) {
    const unit = units[name];
    if (!unit) return;

    getCell(unit.x, unit.y).textContent = '💀';
    delete units[name];
}

/* ---------------- LOG ---------------- */

function log(text) {
    const div = document.createElement('div');
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
}
