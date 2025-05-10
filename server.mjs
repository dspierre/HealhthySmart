import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'rate-limiter-flexible';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
// Créer l'application Express
const app = express();
const PORT = 3000;
// Recréer __dirname pour ES Modules
const __dirname = fileURLToPath(new URL('.', import.meta.url));
// Middleware de base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, 'public'))); // Fichiers statiques (HTML, CSS, JS)
app.use(helmet()); // Sécurisation des en-têtes HTTP
app.use(morgan('combined')); // Journalisation des requêtes HTTP
// Gestion du limiteur de débit
const rateLimiter = new rateLimit.RateLimiterMemory({
  points: 10, // Nombre de requêtes autorisées
  duration: 1, // Fenêtre de temps (en secondes)
});
app.use((req, res, next) => {
  rateLimiter
      .consume(req.ip)
      .then(() => next())
      .catch(() => res.status(429).send('Trop de requêtes, veuillez réessayer plus tard.'));
});
// Connexion à SQLite
const db = new sqlite3.Database('./healthsmart.db', (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données SQLite:', err.message);
  } else {
    console.log('Connecté à la base de données SQLite.');
  }
});
// Routes publiques pour les pages principales
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index_premium.html'));
});
app.get('/bibliotheque_de_sante', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Bibliothèque de Santé.html'));
});
app.get('/equilibre_total', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Équilibre_Total.html'));
});
app.get('/agenda_medical', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'medical_agenda2.html'));
});
app.get('/calculateur_imc', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Calculateur_IMC.html'));
});
app.get('/rappels_de_vaccination', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Rappels_de_Vaccination.html'));
});
app.get('/urgence', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'urgence.html'));
});
// Authentification (Inscription & Connexion)
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors du cryptage du mot de passe.' });
    }
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function (err) {
      if (err) {
        return res.status(500).json({ message: "Erreur d'inscription." });
      }
      res.json({ success: true, message: 'Utilisateur inscrit avec succès.' });
    });
  });
});
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ message: "Nom d'utilisateur non trouvé." });
    }
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        const token = jwt.sign({ id: user.id, username: user.username }, 'secret_key', { expiresIn: '1h' });
        res.json({ success: true, token });
      } else {
        res.status(401).json({ message: 'Mot de passe incorrect.' });
      }
    });
  });
});
// Gestion des rappels médicaux
app.post('/add-reminder', (req, res) => {
  const { title, description, date } = req.body;
  db.run(`INSERT INTO reminders (title, description, date) VALUES (?, ?, ?)`, [title, description, date], function (err) {
    if (err) {
      return res.status(500).json({ message: "Erreur lors de l'ajout du rappel." });
    }
    res.json({ success: true, message: 'Rappel ajouté avec succès.' });
  });
});
app.get('/reminders', (req, res) => {
  db.all(`SELECT * FROM reminders`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la récupération des rappels.' });
    }
    res.json({ success: true, data: rows });
  });
});
// Route pour les erreurs 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});
// Lancer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
