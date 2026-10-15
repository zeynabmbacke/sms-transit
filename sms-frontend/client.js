const API_URL = 'http://localhost:3000/api';

const LIBELLES_STATUT = {
    'en_attente': "En attente",
    'arrive': "Arrivé au port",
    'en_dedouanement': "En dédouanement",
    'dedouane': "Dédouané",
    'livre': "Livré"
};

function formatMontant(montant) {
    return Number(montant).toLocaleString('fr-FR') + ' FCFA';
}

// Recupere l'id du client depuis l'URL (ex: client.html?id=3)
function getClientId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function chargerFicheClient() {
    const id = getClientId();

    if (!id) {
        document.getElementById('fiche-contenu').innerHTML = '<p>Aucun client sélectionné.</p>';
        return;
    }

    try {
        const reponse = await fetch(`${API_URL}/clients/${id}`);
        if (!reponse.ok) throw new Error('Client introuvable');

        const client = await reponse.json();

        // Affichage des infos principales
        document.getElementById('fiche-contenu').innerHTML = `
            <h2>${client.prenom} ${client.nom}</h2>
            <p class="info-ligne">Téléphone : ${client.telephone}</p>
            <p class="info-ligne">Adresse : ${client.adresse || '-'}</p>
            <div class="stats-fiche">
                <div class="stat-mini">
                    <p class="label">Dossiers</p>
                    <p class="valeur">${client.dossiers.length}</p>
                </div>
                <div class="stat-mini">
                    <p class="label">Total facturé</p>
                    <p class="valeur">${formatMontant(client.total_facture)}</p>
                </div>
                <div class="stat-mini">
                    <p class="label">Reste à payer</p>
                    <p class="valeur ${client.total_reste > 0 ? 'montant-du' : ''}">${formatMontant(client.total_reste)}</p>
                </div>
            </div>
        `;

        // Affichage du tableau d'historique
        const corps = document.getElementById('historique-corps');
        corps.innerHTML = '';

        if (client.dossiers.length === 0) {
            corps.innerHTML = '<tr><td colspan="6">Aucun dossier pour ce client.</td></tr>';
            return;
        }

        client.dossiers.forEach(d => {
            const ligne = document.createElement('tr');
            ligne.innerHTML = `
                <td>${d.reference}</td>
                <td>${d.numero_conteneur || '-'}</td>
                <td><span class="badge badge-${d.statut}">${LIBELLES_STATUT[d.statut] || d.statut}</span></td>
                <td>${formatMontant(d.montant_total_du)}</td>
                <td>${formatMontant(d.montant_verse)}</td>
                <td>${formatMontant(d.reste_a_payer)}</td>
            `;
            corps.appendChild(ligne);
        });
    } catch (err) {
        console.error('Erreur lors du chargement de la fiche client:', err);
        document.getElementById('fiche-contenu').innerHTML = '<p>Erreur lors du chargement du client.</p>';
    }
}

chargerFicheClient();