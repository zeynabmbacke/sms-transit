const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post('/', async (req, res) => {
    const { dossier_id, montant, date_versement, mode_paiement } = req.body;

    if (!dossier_id || !montant || Number(montant) <= 0) {
        return res.status(400).json({ erreur: 'Dossier et montant (supérieur à 0) obligatoires' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO paiements (dossier_id, montant, date_versement, mode_paiement) VALUES (?, ?, ?, ?)',
            [dossier_id, montant, date_versement || new Date(), mode_paiement || 'especes']
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de l\'enregistrement du paiement' });
    }
});

router.get('/dossier/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, dossier_id, montant, mode_paiement,
                    DATE_FORMAT(date_versement, '%Y-%m-%d') AS date_versement
             FROM paiements WHERE dossier_id = ? ORDER BY id DESC`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des paiements' });
    }
});

router.delete('/:id', async (req, res) => {
    // Seul l'administrateur (le directeur) peut annuler un versement.
    if (!req.utilisateur || req.utilisateur.role !== 'admin') {
        return res.status(403).json({ erreur: 'Seul l\'administrateur peut annuler un versement' });
    }
    try {
        const [result] = await db.query('DELETE FROM paiements WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ erreur: 'Versement introuvable' });
        }
        res.json({ succes: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de l\'annulation du versement' });
    }
});

module.exports = router;