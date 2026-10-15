const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../config/db');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const TYPES_AUTORISES = ['application/pdf', 'image/jpeg', 'image/png'];

// Toutes les factures des dossiers d'un client (sans le contenu du fichier)
router.get('/client/:clientId', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT f.id, f.dossier_id, f.nom_fichier, f.type_mime, f.date_ajout
             FROM factures f
             JOIN dossiers d ON d.id = f.dossier_id
             WHERE d.client_id = ?`,
            [req.params.clientId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des factures' });
    }
});

// Rattacher une facture à un dossier
router.post('/dossier/:dossierId', function (req, res) {
    upload.single('fichier')(req, res, async function (err) {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'Fichier trop volumineux (10 Mo maximum)'
                : 'Erreur lors de l\'envoi du fichier';
            return res.status(400).json({ erreur: message });
        }

        if (!req.file) {
            return res.status(400).json({ erreur: 'Aucun fichier reçu' });
        }

        if (TYPES_AUTORISES.indexOf(req.file.mimetype) === -1) {
            return res.status(400).json({ erreur: 'Format non accepté (PDF, JPG ou PNG uniquement)' });
        }

        try {
            const [dossier] = await db.query('SELECT id FROM dossiers WHERE id = ?', [req.params.dossierId]);
            if (dossier.length === 0) {
                return res.status(404).json({ erreur: 'Dossier introuvable' });
            }

            const [existante] = await db.query('SELECT id FROM factures WHERE dossier_id = ?', [req.params.dossierId]);
            if (existante.length > 0) {
                return res.status(400).json({ erreur: 'Ce dossier a déjà une facture. Retire-la d\'abord pour en rattacher une autre.' });
            }

            // multer lit le nom du fichier en latin1 : on le remet en UTF-8 pour garder les accents
            const nomFichier = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

            const [result] = await db.query(
                'INSERT INTO factures (dossier_id, nom_fichier, type_mime, contenu) VALUES (?, ?, ?, ?)',
                [req.params.dossierId, nomFichier, req.file.mimetype, req.file.buffer]
            );
            res.status(201).json({ id: result.insertId });
        } catch (erreurBase) {
            console.error(erreurBase);
            res.status(500).json({ erreur: 'Erreur lors de l\'enregistrement de la facture' });
        }
    });
});

// Ouvrir le fichier d'une facture
router.get('/:id/fichier', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT nom_fichier, type_mime, contenu FROM factures WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ erreur: 'Facture introuvable' });
        }
        const facture = rows[0];
        res.setHeader('Content-Type', facture.type_mime);
        res.setHeader('Content-Disposition', "inline; filename*=UTF-8''" + encodeURIComponent(facture.nom_fichier));
        res.send(facture.contenu);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la lecture de la facture' });
    }
});

// Retirer une facture d'un dossier
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM factures WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ erreur: 'Facture introuvable' });
        }
        res.json({ succes: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors du retrait de la facture' });
    }
});

module.exports = router;