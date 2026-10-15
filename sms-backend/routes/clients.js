const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                c.*,
                COUNT(DISTINCT d.id) AS nombre_dossiers,
                COALESCE(SUM(d.montant_total_du), 0) - COALESCE((
                    SELECT SUM(p.montant) FROM paiements p
                    JOIN dossiers d2 ON d2.id = p.dossier_id
                    WHERE d2.client_id = c.id
                ), 0) AS reste_a_payer_total
            FROM clients c
            LEFT JOIN dossiers d ON d.client_id = c.id
            GROUP BY c.id
            ORDER BY c.nom
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des clients' });
    }
});

router.get('/actifs/fifo', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                c.id, c.prenom, c.nom, c.telephone,
                COUNT(d.id) AS nombre_dossiers_en_cours,
                MIN(d.date_creation) AS premier_dossier_en_cours
            FROM clients c
            JOIN dossiers d ON d.client_id = c.id AND d.statut != 'livre'
            GROUP BY c.id
            ORDER BY premier_dossier_en_cours ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des clients actifs' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [client] = await db.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (client.length === 0) {
            return res.status(404).json({ erreur: 'Client introuvable' });
        }

        const [dossiers] = await db.query(`
            SELECT
                d.*,
                COALESCE(SUM(p.montant), 0) AS montant_verse,
                d.montant_total_du - COALESCE(SUM(p.montant), 0) AS reste_a_payer
            FROM dossiers d
            LEFT JOIN paiements p ON p.dossier_id = d.id
            WHERE d.client_id = ?
            GROUP BY d.id
            ORDER BY d.date_creation DESC
        `, [req.params.id]);

        const totalFacture = dossiers.reduce((somme, d) => somme + Number(d.montant_total_du), 0);
        const totalReste = dossiers.reduce((somme, d) => somme + Number(d.reste_a_payer), 0);

        res.json({ ...client[0], dossiers, total_facture: totalFacture, total_reste: totalReste });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la récupération de la fiche client' });
    }
});

router.post('/', async (req, res) => {
    const { prenom, nom, telephone, adresse } = req.body;
    if (!prenom || !nom || !telephone) {
        return res.status(400).json({ erreur: 'Prénom, nom et téléphone sont obligatoires' });
    }
    try {
        const [result] = await db.query(
            'INSERT INTO clients (prenom, nom, telephone, adresse) VALUES (?, ?, ?, ?)',
            [prenom, nom, telephone, adresse || null]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la création du client' });
    }
});

router.put('/:id', async (req, res) => {
    const { prenom, nom, telephone, adresse } = req.body;
    if (!prenom || !nom || !telephone) {
        return res.status(400).json({ erreur: 'Prénom, nom et téléphone sont obligatoires' });
    }
    try {
        const [result] = await db.query(
            'UPDATE clients SET prenom = ?, nom = ?, telephone = ?, adresse = ? WHERE id = ?',
            [prenom, nom, telephone, adresse || null, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ erreur: 'Client introuvable' });
        }
        res.json({ succes: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la modification du client' });
    }
});

module.exports = router;