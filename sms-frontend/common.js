const API_URL = 'https://REMPLACER-PAR-URL-BACKEND-SMS.up.railway.app/api';

function getToken() {
    return localStorage.getItem('sms_token');
}

function getUtilisateur() {
    var data = localStorage.getItem('sms_utilisateur');
    return data ? JSON.parse(data) : null;
}

function sauvegarderSession(token, utilisateur) {
    localStorage.setItem('sms_token', token);
    localStorage.setItem('sms_utilisateur', JSON.stringify(utilisateur));
}

function deconnexion() {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_utilisateur');
    window.location.href = 'login.html';
}

function protegerPage() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

async function appelApi(endpoint, options) {
    options = options || {};
    var token = getToken();

    var reponse = await fetch(API_URL + endpoint, {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: options.body || undefined,
        cache: 'no-store'
    });

    if (reponse.status === 401) {
        deconnexion();
        throw new Error('Session expirée');
    }

    return reponse;
}

function injecterHeader(avecNav) {
    var utilisateur = getUtilisateur();
    var headerEl = document.getElementById('app-header');
    if (!headerEl) return;

    var logoHtml = '<a href="accueil.html" class="logo-zone">';
    logoHtml += '<img src="logo.png" alt="SMS">';
    logoHtml += '<div class="texte-entreprise">';
    logoHtml += '<div class="nom-entreprise"><span class="mot-sms">SMS</span></div>';
    logoHtml += '<div class="slogan-entreprise">Import · Export · Transit</div>';
    logoHtml += '</div>';
    logoHtml += '</a>';

    var actionsHtml = '<div class="header-actions">';
    if (utilisateur) {
        actionsHtml += '<span class="utilisateur-connecte">' + utilisateur.nom_utilisateur + '</span>';
    }
    actionsHtml += '<button id="btn-deconnexion">Déconnexion</button>';
    actionsHtml += '</div>';

    // Logo, menu et bloc utilisateur sur une seule et même ligne.
    var html = logoHtml;
    if (avecNav) {
        html += '<nav class="nav-liens-header" id="menu-lateral"></nav>';
    }
    html += actionsHtml;

    headerEl.innerHTML = html;

    var btn = document.getElementById('btn-deconnexion');
    if (btn) {
        btn.addEventListener('click', demanderConfirmationDeconnexion);
    }
}

function injecterMenuLateral(conteneurId, avecAgents) {
    var utilisateur = getUtilisateur();
    var conteneur = document.getElementById(conteneurId);
    if (!conteneur) return;

    var pageActuelle = window.location.pathname.split('/').pop();

    var liens = [
        { href: 'dashboard.html', texte: 'Dashboard' },
        { href: 'dossiers-en-cours.html', texte: 'Dossiers en cours' },
        { href: 'clients.html', texte: 'Mes clients' },
        { href: 'clients-actifs.html', texte: 'Clients à traiter' },
        { separateur: true },
        { href: 'nouveau-client.html', texte: '+ Nouveau client' },
        { href: 'nouveau-dossier.html', texte: '+ Nouveau dossier' }
    ];

    // Le lien "Gérer les agents" ne figure que sur la page d'accueil.
    if (avecAgents) {
        liens.push({ separateur: true });
        liens.push({ href: 'gerer-utilisateurs.html', texte: 'Gérer les agents', reserveAdmin: true });
    }

    var html = '';
    liens.forEach(function (lien) {
        if (lien.separateur) {
            html += '<div class="separateur-lateral"></div>';
            return;
        }
        // La page sur laquelle on se trouve ne figure pas dans sa propre liste de liens.
        if (lien.href === pageActuelle) return;
        if (lien.reserveAdmin && (!utilisateur || utilisateur.role !== 'admin')) return;
        var id = lien.reserveAdmin ? ' id="lien-agents"' : '';
        html += '<a href="' + lien.href + '" class="lien-lateral"' + id + '>' + lien.texte + '</a>';
    });

    conteneur.innerHTML = html;
}

function injecterBoutonRetour(conteneurId) {
    var conteneur = document.getElementById(conteneurId);
    if (!conteneur) return;
    conteneur.innerHTML = '<a href="accueil.html" class="bouton-retour-accueil">⬅ Retour</a>';
}

function demanderConfirmationDeconnexion() {
    var modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML =
        '<div class="modal-contenu">' +
        '<p style="color: var(--texte-secondaire); margin-bottom: 1rem;">Voulez-vous vraiment vous déconnecter ?</p>' +
        '<div class="modal-actions">' +
        '<button id="confirm-non">NON</button>' +
        '<button id="confirm-oui" style="color:white;">OUI</button>' +
        '</div></div>';
    document.body.appendChild(modal);

    document.getElementById('confirm-non').addEventListener('click', function () {
        modal.remove();
    });
    document.getElementById('confirm-oui').addEventListener('click', function () {
        deconnexion();
    });
}

function afficherToast(message, type) {
    var toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = (type === 'erreur') ? 'toast-erreur' : '';

    setTimeout(function () {
        toast.classList.add('visible');
    }, 10);

    setTimeout(function () {
        toast.classList.remove('visible');
    }, 3000);
}

function formatMontant(montant) {
    return '<span class="prix">' + Number(montant).toLocaleString('fr-FR') + ' FCFA</span>';
}

const LIBELLES_STATUT = {
    ouverture: "Ouverture du dossier",
    en_traitement: "En cours de traitement",
    pret: "Dossier prêt",
    livre: "Livré"
};

function executerSansBloquer(fn) {
    try {
        fn();
    } catch (err) {
        console.error('Erreur interceptée:', err);
        afficherToast('Erreur technique : ' + err.message, 'erreur');
    }
}

window.addEventListener('error', function (e) {
    console.error('Erreur JS globale:', e.message);
    afficherToast('Erreur technique : ' + e.message, 'erreur');
});

window.addEventListener('unhandledrejection', function (e) {
    console.error('Promesse rejetée:', e.reason);
    var msg = (e.reason && e.reason.message) ? e.reason.message : String(e.reason);
    afficherToast('Erreur technique : ' + msg, 'erreur');
});