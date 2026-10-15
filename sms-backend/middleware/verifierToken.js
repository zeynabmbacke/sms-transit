const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifierToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ erreur: 'Authentification requise' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.utilisateur = decoded; // rend l'utilisateur disponible dans les routes suivantes
        next();
    } catch (err) {
        return res.status(401).json({ erreur: 'Session invalide ou expirée' });
    }
}

module.exports = verifierToken;