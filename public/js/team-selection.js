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
            // Si une équipe est déjà sélectionnée, on met à jour son contenu avec le nouveau personnage
            const characterId = target.dataset.characterid;

            // Vérifier si un personnage est déjà sélectionné dans cette équipe
            const existingCharacterId = selectedTeamSlot.dataset.characterid;

            // Si un personnage était déjà dans cette équipe, on le retire du tableau selectedCharacters
            if (existingCharacterId) {
                const index = selectedCharacters.indexOf(existingCharacterId);
                if (index !== -1) {
                    selectedCharacters.splice(index, 1);  // Supprimer l'ancien personnage
                }
            }

            // Mettre à jour l'élément du DOM avec le nouveau personnage
            selectedTeamSlot.innerHTML = target.innerHTML;
            selectedTeamSlot.dataset.characterid = characterId; // Mettre à jour l'ID du personnage dans l'élément

            // Ajouter le nouveau personnage au tableau selectedCharacters
            selectedCharacters.push(characterId);
            console.log("Selected Characters:", selectedCharacters);
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