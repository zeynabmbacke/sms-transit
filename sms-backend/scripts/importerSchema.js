// Importe schema.sql dans une base MySQL vide.
// Usage : node scripts/importerSchema.js "<URL de connexion MySQL>"
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const url = process.argv[2];
if (!url) {
    console.log('Usage: node scripts/importerSchema.js "<URL de connexion MySQL>"');
    process.exit(1);
}

(async () => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8');
        const connexion = await mysql.createConnection({ uri: url, multipleStatements: true });
        await connexion.query(sql);
        const [tables] = await connexion.query('SHOW TABLES');
        console.log('Schema importe. Tables creees :');
        tables.forEach(t => console.log(' - ' + Object.values(t)[0]));
        await connexion.end();
        process.exit(0);
    } catch (err) {
        console.error('Erreur :', err.message);
        process.exit(1);
    }
})();
