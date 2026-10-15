const bcrypt = require('bcrypt');
const db = require('../config/db');
require('dotenv').config();

// Recupere le nom d'utilisateur et le mot de passe passes en argument
// Exemple d'utilisation : node scripts/creerAdmin.js zey monMotDePasse123
const [,, nomUtilisateur, motDePasse] = process.argv;

if (!nomUtilisateur || !motDePasse) {
    console.log('Usage: node scripts/creerAdmin.js <nom_utilisateur> <mot_de_passe>');
    process.exit(1);
}

async function creerAdmin() {
    try {
        const hash = await bcrypt.hash(motDePasse, 10);

        await db.query(
            'INSERT INTO users (nom_utilisateur, mot_de_passe_hash, role) VALUES (?, ?, ?)',
            [nomUtilisateur, hash, 'admin']
        );

        console.log(`Compte admin "${nomUtilisateur}" cree avec succes.`);
        process.exit(0);
    } catch (err) {
        console.error('Erreur lors de la creation de l\'admin:', err.message);
        process.exit(1);
    }
}

creerAdmin();