const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const verifierToken = require('../middleware/verifierToken');

router.post('/login', async (req, res) => {
    const { nom_utilisateur, mot_de_passe } = req.body;

    if (!nom_utilisateur || !mot_de_passe) {
        return res.status(400).json({ erreur: 'Nom d\'utilisateur et mot de passe requis' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE nom_utilisateur = ?', [nom_utilisateur]);
        if (users.length === 0) {
            return res.status(401).json({ erreur: 'Identifiants incorrects' });
        }

        const utilisateur = users[0];
        const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe_hash);
        if (!motDePasseValide) {
            return res.status(401).json({ erreur: 'Identifiants incorrects' });
        }

        const token = jwt.sign(
            { id: utilisateur.id, nom_utilisateur: utilisateur.nom_utilisateur, role: utilisateur.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token: token,
            utilisateur: { id: utilisateur.id, nom_utilisateur: utilisateur.nom_utilisateur, role: utilisateur.role }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la connexion' });
    }
});

router.post('/creer-utilisateur', verifierToken, async (req, res) => {
    if (req.utilisateur.role !== 'admin') {
        return res.status(403).json({ erreur: 'Seul l\'administrateur peut créer des comptes' });
    }

    const { nom_utilisateur, mot_de_passe } = req.body;
    if (!nom_utilisateur || !mot_de_passe) {
        return res.status(400).json({ erreur: 'Nom d\'utilisateur et mot de passe requis' });
    }

    try {
        const hash = await bcrypt.hash(mot_de_passe, 10);
        const [result] = await db.query(
            'INSERT INTO users (nom_utilisateur, mot_de_passe_hash, role) VALUES (?, ?, ?)',
            [nom_utilisateur, hash, 'agent']
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ erreur: 'Ce nom d\'utilisateur existe déjà' });
        }
        res.status(500).json({ erreur: 'Erreur lors de la création du compte' });
    }
});

router.get('/utilisateurs', verifierToken, async (req, res) => {
    if (req.utilisateur.role !== 'admin') {
        return res.status(403).json({ erreur: 'Accès réservé à l\'administrateur' });
    }
    try {
        const [rows] = await db.query(
            'SELECT id, nom_utilisateur, role, date_creation FROM users ORDER BY date_creation DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la récupération des utilisateurs' });
    }
});

router.delete('/utilisateurs/:id', verifierToken, async (req, res) => {
    if (req.utilisateur.role !== 'admin') {
        return res.status(403).json({ erreur: 'Accès réservé à l\'administrateur' });
    }

    try {
        const [cible] = await db.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
        if (cible.length === 0) {
            return res.status(404).json({ erreur: 'Utilisateur introuvable' });
        }
        if (cible[0].role === 'admin') {
            return res.status(403).json({ erreur: 'Impossible de supprimer un compte administrateur' });
        }

        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ succes: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la suppression du compte' });
    }
});

router.patch('/utilisateurs/:id/reinitialiser-mdp', verifierToken, async (req, res) => {
    if (req.utilisateur.role !== 'admin') {
        return res.status(403).json({ erreur: 'Accès réservé à l\'administrateur' });
    }

    const { nouveau_mot_de_passe } = req.body;
    if (!nouveau_mot_de_passe || nouveau_mot_de_passe.length < 4) {
        return res.status(400).json({ erreur: 'Le nouveau mot de passe doit contenir au moins 4 caractères' });
    }

    try {
        const hash = await bcrypt.hash(nouveau_mot_de_passe, 10);
        await db.query('UPDATE users SET mot_de_passe_hash = ? WHERE id = ?', [hash, req.params.id]);
        res.json({ succes: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: 'Erreur lors de la réinitialisation du mot de passe' });
    }
});

module.exports = router;