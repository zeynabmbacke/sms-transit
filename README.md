# SMS – Import · Export · Transit

Application web de gestion des clients, dossiers de transit et versements.

- `sms-backend/` : API Node.js / Express + MySQL (JWT, rôles admin / agent)
- `sms-frontend/` : interface HTML / CSS / JS (servie en statique)
- `schema.sql` : structure de la base (vide, sans données)

## Mise en place

1. Créer une base MySQL/MariaDB vide et importer `schema.sql`.
2. Backend : copier `sms-backend/.env.example` vers `.env`, remplir les valeurs
   (`JWT_SECRET` : une longue valeur aléatoire propre à ce projet), puis
   `npm install` et `npm start`.
3. Créer le compte administrateur : `node scripts/creerAdmin.js <nom> <mot_de_passe>`.
4. Frontend : dans `sms-frontend/common.js`, mettre l'URL du backend dans `API_URL`.

Ne jamais committer de fichier `.env` ni de sauvegarde SQL contenant des données réelles.
