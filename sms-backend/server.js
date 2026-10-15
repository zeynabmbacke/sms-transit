const express = require('express');
const cors = require('cors');
require('dotenv').config();

const clientsRouter = require('./routes/clients');
const dossiersRouter = require('./routes/dossiers');
const paiementsRouter = require('./routes/paiements');
const facturesRouter = require('./routes/factures');
const authRouter = require('./routes/auth');
const verifierToken = require('./middleware/verifierToken');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);

app.use('/api/clients', verifierToken, clientsRouter);
app.use('/api/dossiers', verifierToken, dossiersRouter);
app.use('/api/paiements', verifierToken, paiementsRouter);
app.use('/api/factures', verifierToken, facturesRouter);

app.get('/', (req, res) => {
    res.json({ message: 'API SMS - Gestion des conteneurs et clients' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur SMS demarre sur http://localhost:${PORT}`);
});