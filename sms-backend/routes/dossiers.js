const express = require('express');
const router = express.Router();
const db = require('../config/db');

function vide(valeur) {
    return (valeur === undefined || valeur === null || valeur === '') ? null : valeur;
}

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                d.*,
                c.prenom AS client_prenom,
                c.nom AS client_nom,
                d.montant_total_du - COALESCE(SUM(p.montant), 0) AS reste_a_payer
            FROM dossiers d
            JOIN clients c ON c.id = d.client_id
            LEFT JOIN paiements p ON p.dossier_id = d.id
            GROUP BY d.id
            ORDER BY d.date_creation DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des dossiers' });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const [[stats]] = await db.query(`
            SELECT
                COUNT(DISTINCT CASE WHEN d.statut != 'livre' THEN d.id END) AS dossiers_en_cours,
                COUNT(DISTINCT d.id) AS dossiers_total,
                (SELECT COUNT(*) FROM clients) AS clients_actifs,
                COALESCE(SUM(d.montant_total_du), 0) - COALESCE((SELECT SUM(montant) FROM paiements), 0) AS total_reste_a_payer,
                COUNT(DISTINCT CASE WHEN d.statut = 'ouverture' THEN d.id END) AS ouverture,
                COUNT(DISTINCT CASE WHEN d.statut = 'en_traitement' THEN d.id END) AS en_traitement,
                COUNT(DISTINCT CASE WHEN d.statut = 'pret' THEN d.id END) AS pret
            FROM dossiers d
        `);

        const [impayesRows] = await db.query(`
            SELECT d.client_id, d.montant_total_du - COALESCE(SUM(p.montant), 0) AS reste
            FROM dossiers d
            LEFT JOIN paiements p ON p.dossier_id = d.id
            GROUP BY d.id
            HAVING reste > 0
        `);
        const clientsAvecImpayes = new Set(impayesRows.map(r => r.client_id)).size;

        res.json({ ...stats, clients_avec_impayes: clientsAvecImpayes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors du calcul des statistiques' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                d.*,
                DATE_FORMAT(d.date_arrivee_prevue, '%Y-%m-%d') AS date_arrivee_prevue,
                c.prenom AS client_prenom,
                c.nom AS client_nom,
                COALESCE((SELECT SUM(p.montant) FROM paiements p WHERE p.dossier_id = d.id), 0) AS montant_verse
            FROM dossiers d
            JOIN clients c ON c.id = d.client_id
            WHERE d.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ erreur: 'Dossier introuvable' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la récupération du dossier' });
    }
});

router.post('/', async (req, res) => {
    const {
        reference, client_id, numero_conteneur, nature_marchandise, volume,
        compagnie_maritime, numero_declaration, date_arrivee_prevue, montant_total_du
    } = req.body;

    if (!client_id || !reference) {
        return res.status(400).json({ erreur: 'Référence et client obligatoires' });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO dossiers
            (reference, client_id, type_operation, numero_conteneur, nature_marchandise, volume,
             compagnie_maritime, numero_declaration, date_arrivee_prevue, statut, montant_total_du)
            VALUES (?, ?, 'transit', ?, ?, ?, ?, ?, ?, 'ouverture', ?)`,
            [reference, client_id, vide(numero_conteneur), vide(nature_marchandise), vide(volume),
             vide(compagnie_maritime), vide(numero_declaration), vide(date_arrivee_prevue),
             Number(montant_total_du) || 0]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ erreur: 'Cette référence de dossier existe déjà' });
        }
        res.status(500).json({ erreur: 'Erreur lors de la création du dossier' });
    }
});

router.put('/:id', async (req, res) => {
    const {
        reference, numero_conteneur, nature_marchandise, volume,
        compagnie_maritime, numero_declaration, date_arrivee_prevue, montant_total_du
    } = req.body;

    if (!reference) {
        return res.status(400).json({ erreur: 'La référence est obligatoire' });
    }

    const montant = Number(montant_total_du) || 0;
    if (montant < 0) {
        return res.status(400).json({ erreur: 'Le montant ne peut pas être négatif' });
    }

    try {
        const [result] = await db.query(
            `UPDATE dossiers SET
                reference = ?, numero_conteneur = ?, nature_marchandise = ?, volume = ?,
                compagnie_maritime = ?, numero_declaration = ?, date_arrivee_prevue = ?,
                montant_total_du = ?
             WHERE id = ?`,
            [reference, vide(numero_conteneur), vide(nature_marchandise), vide(volume),
             vide(compagnie_maritime), vide(numero_declaration), vide(date_arrivee_prevue),
             montant, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ erreur: 'Dossier introuvable' });
        }
        res.json({ succes: true });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ erreur: 'Cette référence de dossier existe déjà' });
        }
        res.status(500).json({ erreur: 'Erreur lors de la modification du dossier' });
    }
});

router.patch('/:id/statut', async (req, res) => {
    const { statut } = req.body;
    const statutsValides = ['ouverture', 'en_traitement', 'pret', 'livre'];
    if (!statutsValides.includes(statut)) {
        return res.status(400).json({ erreur: 'Statut invalide' });
    }
    try {
        await db.query('UPDATE dossiers SET statut = ? WHERE id = ?', [statut, req.params.id]);
        res.json({ succes: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la mise à jour du statut' });
    }
});

module.exports = router;