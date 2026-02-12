document.addEventListener('DOMContentLoaded', () => {
    const filterBtn = document.querySelectorAll('.filter-button');
    const resultContainer = document.querySelector('.container_card_personnage');
    const characterTeams = document.querySelectorAll('.character-team');
    const saveButton = document.querySelector('button'); 
    let selectedTeamSlot = null;
    const selectedCharacters = []; 

    filterBtn.forEach(btn => {
        btn.addEventListener('click', () => {
            const filterValue = btn.getAttribute('data-filter');

            fetch(`team/filters?filter=${filterValue}`, {
                method: 'GET',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.json())
            .then(data => {
                resultContainer.innerHTML = data.html;
            })
            .catch(error => console.error('Error:', error));
        });
    });

    characterTeams.forEach(team => {
        team.addEventListener('click', () => {
            if (selectedTeamSlot) {
                selectedTeamSlot.classList.remove('selected');
            }
            selectedTeamSlot = team;
            selectedTeamSlot.classList.add('selected');
        });
    });

    resultContainer.addEventListener('click', (event) => {
        let target = event.target;
        while (target && !target.classList.contains('card_personnage')) {
            target = target.parentElement;
        }

        if (target && target.classList.contains('card_personnage') && selectedTeamSlot) {
            const characterId = target.dataset.characterid;

            const existingCharacterId = selectedTeamSlot.dataset.characterid;
            if (existingCharacterId) {
                const index = selectedCharacters.indexOf(existingCharacterId);
                if (index !== -1) selectedCharacters.splice(index, 1);
            }

            // Nettoie le slot
            selectedTeamSlot.innerHTML = "";

            // Clone la carte complète (avec sa classe card_personnage)
            const cloned = target.cloneNode(true);

            // (optionnel) si tu ne veux pas qu'elle garde certains attributs/ids, ajuste ici
            selectedTeamSlot.appendChild(cloned);

            selectedTeamSlot.dataset.characterid = characterId;
            selectedCharacters.push(characterId);
        }
    });

    function validateTeam() {
        const teamName = document.getElementById('team-name').value.trim();
        if (!teamName) {
            alert("Le nom de la team ne peut pas être vide.");
            return false;
        }
        if (selectedCharacters.length < 3) { 
            alert("Vous devez sélectionner tous les personnages.");
            return false;
        }
        return true;
    }

    saveButton.addEventListener('click', () => {
        if (!validateTeam()) {
            return;
        }

        const teamName = document.getElementById('team-name').value.trim();
        fetch('/team/save', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                name: teamName,
                characters: selectedCharacters
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                selectedCharacters.length = 0; 
                characterTeams.forEach(team => team.classList.remove('selected'));
                characterTeams.forEach(team => team.innerHTML = '');
                document.getElementById('team-name').value = '';
            } else {
                alert("Erreur lors de la sauvegarde de l'équipe.");
            }
        })
        .catch(error => console.error('Erreur:', error));
        console.log({ name: teamName, characters: selectedCharacters });
    });
});