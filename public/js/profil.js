document.addEventListener('DOMContentLoaded', () => {
    const resultContainer = document.getElementById('team-container'); // Conteneur pour afficher le résultat

    const activateTeam = (btn) => {
        const teamId = btn.getAttribute('data-team-id'); // Récupère l'ID de l'équipe
        fetch('/profil/team/activate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Le type de contenu envoyé
            },
            body: JSON.stringify({ id: teamId }) // Envoi l'ID de l'équipe dans le corps de la requête
        })
        .then(response => response.json())
        .then(data => {
            resultContainer.innerHTML = data.html; // Mettez à jour le contenu HTML du conteneur
            // Réattacher les événements après la mise à jour du DOM
            addActivateEventListeners();
        })
        .catch(error => console.error('Error:', error));
    };

    // Fonction pour ajouter l'événement `click` aux boutons "Rendre active"
    const addActivateEventListeners = () => {
        const activateBtn = document.querySelectorAll('.activate'); 

        activateBtn.forEach(btn => {
            btn.removeEventListener('click', handleActivateClick); // Retirer les événements précédents pour éviter les doublons
            btn.addEventListener('click', handleActivateClick); // Réajouter l'événement
        });
    };

    // Gestionnaire d'événements pour l'activation d'une équipe
    const handleActivateClick = (e) => {
        const btn = e.target;
        activateTeam(btn); // Appel de la fonction d'activation
    };

    // Ajouter l'événement `click` au chargement initial
    addActivateEventListeners();

    const optionBtn = document.querySelector('.option');

    optionBtn.addEventListener('click', () => {
        const modal = document.getElementById('modal');
        modal.style.display = 'block';
    });

    const closeBtn = document.getElementById('close');  
    closeBtn.addEventListener('click', () => {
        const modal = document.getElementById('modal');
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});