// import './stimulus_bootstrap.js';
/*
 * Welcome to your app's main JavaScript file!
 *
 * This file will be included onto the page via the importmap() Twig function,
 * which should already be in your base.html.twig.
 */
import './styles/app.scss';

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