import express from 'express';
import session from 'express-session';
import { Sequelize, DataTypes } from 'sequelize';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import passport from 'passport';
import cors from 'cors';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import winston from 'winston';
import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';
// Charger les variables d'environnement
dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, 'users.db');

// Configuration Sequelize avec SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbFilePath
});

// Configuration Passport
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await sequelize.models.User.findByPk(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'votre_secret',
    resave: false,
    saveUninitialized: false
}));
app.use(cors());
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Suppression de la base SQLite existante (uniquement pour le développement)
if (fs.existsSync(dbFilePath)) {
    fs.unlinkSync(dbFilePath);
    console.log('⚠️ Base de données existante supprimée.');
}

// Connexion à SQLite et création des tables
const db = new sqlite3.Database(dbFilePath, (err) => {
    if (err) {
        console.error('❌ Erreur de connexion à SQLite:', err.message);
    } else {
        console.log('✅ Connecté à SQLite.');
        console.log("Création des tables...");
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                email TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                prenom TEXT NOT NULL,
                nom TEXT NOT NULL
            );`,
            `CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                summary TEXT,
                description TEXT,
                date TEXT
            );`,
            `CREATE TABLE IF NOT EXISTS goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                steps INTEGER NOT NULL,
                water REAL NOT NULL,
                sleep REAL NOT NULL,
                mood INTEGER NOT NULL
            );`,
            `CREATE TABLE IF NOT EXISTS moods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                mood TEXT NOT NULL
            );`,
            `CREATE TABLE IF NOT EXISTS wellness_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                sleep REAL NOT NULL,
                water REAL NOT NULL,
                steps INTEGER NOT NULL,
                quality TEXT NOT NULL,
                heartRate INTEGER NOT NULL
            );`,
            `CREATE TABLE IF NOT EXISTS user_points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                points INTEGER DEFAULT 0
            );`,
            `CREATE TABLE IF NOT EXISTS user_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                age INTEGER,
                sex TEXT,
                weight REAL,
                height REAL,
                bmi REAL,
                category TEXT
            );`,
            `CREATE TABLE IF NOT EXISTS emergency_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bloodGroup TEXT,
                allergens TEXT,
                medicalHistory TEXT,
                emergencyContactName TEXT,
                emergencyContactPhone TEXT
            );`,
            `CREATE TABLE IF NOT EXISTS victories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                points INTEGER NOT NULL
            );`,
            `CREATE TABLE IF NOT EXISTS inspirations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                date TEXT NOT NULL,
                points INTEGER NOT NULL
            );`
        ];
      
        db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, rows) => {
            console.log("📋 Tables existantes AVANT requête :", rows);
        });
        setTimeout(() => {
            db.all("SELECT * FROM users;", [], (err, rows) => {
                if (err) {
                    console.error("❌ Erreur récupération utilisateurs :", err.message);
                } else {
                    console.log("✅ Liste des utilisateurs enregistrés :", rows);
                }
            });
        }, 1000); // Attendre 1 seconde pour garantir que `users` est bien créée avant usage
               
        // Exécution des requêtes SQL pour créer les tables
        tables.forEach(query => {
            console.log(`Création de la table...`);
            db.run(query);
        });
        console.log("✅ Toutes les tables ont été créées.");
        tables.forEach(query => {
            db.run(query, (err) => {
                if (err) {
                    console.error('❌ Erreur lors de la création des tables:', err.message);
                } else {
                    console.log('✅ Table créée ou déjà existante.');
                }
            });
        });
        console.log('✅ Toutes les tables ont été créées.');
    }
});db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    prenom TEXT NOT NULL,
    nom TEXT NOT NULL
);`, (err) => {
    if (err) {
        console.error("❌ Erreur création table `users` :", err.message);
    } else {
        console.log("✅ Table `users` créée avec succès !");
    }
});
// Vérification immédiate après la création
db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, rows) => {
    if (err) {
        console.error("❌ Erreur SQLite :", err.message);
    } else {
        console.log("📋 Tables existantes après création :", rows);
    }
});
db.all("SELECT * FROM users;", [], (err, rows) => {
    if (err) {
        console.error("❌ Erreur récupération utilisateurs :", err.message);
    } else {
        console.log("✅ Liste des utilisateurs enregistrés :", rows);
    }
});

db.all("SELECT email, prenom, nom FROM users;", [], (err, rows) => {
    if (err) {
        console.error("❌ Erreur récupération utilisateurs :", err.message);
    } else {
        console.log("✅ Utilisateurs :", JSON.stringify(rows, null, 2));
    }
});
db.all("PRAGMA table_info(users);", [], (err, rows) => {
    if (err) {
        console.error("❌ Erreur PRAGMA :", err.message);
    } else {
        console.log("📋 Structure de la table `users` :", rows);
    }
});
setTimeout(() => {
    db.all("SELECT * FROM users;", [], (err, rows) => {
        if (err) {
            console.error("❌ Erreur récupération utilisateurs :", err.message);
        } else {
            console.log("✅ Liste des utilisateurs enregistrés :", rows);
        }
    });
}, 1000); // Ajout d'un délai pour être sûr que la table est bien créée avant de l'utiliser
setTimeout(() => {
    db.run("INSERT INTO users (email, password, prenom, nom) VALUES (?, ?, ?, ?)", 
        ["jean@example.com", "secret123", "Jean", "Dupont"], 
        function (err) {
            if (err) {
                console.error("❌ Erreur d'insertion :", err.message);
            } else {
                console.log("✅ Utilisateur ajouté !");
            }
        }
    );
}, 1000); // Attendre 1 seconde pour garantir que `users` est bien créée avant insertion


db.all("SELECT * FROM events;", [], (err, rows) => {
    if (err) {
        console.error("❌ Erreur :", err.message);
    } else {
        console.log("✅ Événements enregistrés :", rows);
    }
});
// Route pour obtenir des statistiques
app.get('/api/stats', (req, res) => {
    res.json({ /* Vos données */ });
});
// Ajouter une victoire
app.post('/victories', (req, res) => {
    const { text, category, date, points } = req.body;
    const query = 'INSERT INTO victories (text, category, date, points) VALUES (?, ?, ?, ?)';
    db.run(query, [text, category, date, points], function (err) {
        if (err) {
            console.error('❌ Erreur lors de l\'ajout d\'une victoire:', err.message);
            res.status(500).send({ message: 'Erreur interne du serveur.' });
        } else {
            res.status(201).send({ message: '✅ Victoire ajoutée', id: this.lastID });
        }
    });
});
// Récupérer toutes les victoires
app.get('/victories', (req, res) => {
    const query = 'SELECT * FROM victories';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Erreur lors de la récupération des victoires:', err.message);
            res.status(500).send({ message: 'Erreur interne du serveur.' });
        } else {
            res.status(200).send(rows);
        }
    });
});
// Supprimer une victoire
app.delete('/victories/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM victories WHERE id = ?';
    db.run(query, [id], function (err) {
        if (err) {
            console.error('Erreur lors de la suppression d\'une victoire :', err.message);
            res.status(500).send({ message: 'Erreur interne du serveur.' });
        } else {
            if (this.changes > 0) {
                res.status(200).send({ message: 'Victoire supprimée' });
            } else {
                res.status(404).send({ message: 'Victoire non trouvée.' });
            }
        }
    });
});
//------------------------------------ ROUTES EVENTS -----------------------------------//
app.post("/add_event", (req, res) => {
    const { summary, description, date } = req.body;
    db.run("INSERT INTO events (summary, description, date) VALUES (?, ?, ?)",
        [summary, description, date],
        function (err) {
            if (err) {
                console.error("❌ Erreur d'insertion :", err.message);
                return res.status(500).json({ error: "Erreur serveur." });
            }
            res.status(201).json({ message: "✅ Événement enregistré avec succès !" });
        }
    );
});
// Route pour récupérer tous les événements
app.get('/events', (req, res) => {
    const query = 'SELECT * FROM events';
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).send({ error: 'Erreur lors de la récupération des événements.' });
        } else {
            res.send(rows);
        }
    });
});
app.post("/enregistrer-utilisateur", async (req, res) => {
    console.log("📥 Données reçues :", req.body); // Vérification des données reçues
    const { prenom, nom, email, password } = req.body;
    if (!prenom || !nom || !email || !password) {
        return res.status(400).json({ error: "❌ Tous les champs sont requis." });
    }
    try {
        // Ajout de l'utilisateur dans SQLite
        db.run("INSERT INTO users (prenom, nom, email, password) VALUES (?, ?, ?, ?)", 
            [prenom, nom, email, password], 
            function (err) {
                if (err) {
                    console.error("❌ Erreur d'insertion :", err.message);
                    return res.status(500).json({ error: "Erreur serveur." });
                }
                res.status(201).json({ message: "✅ Utilisateur enregistré avec succès !" });
            }
        );
    } catch (error) {
        console.error("❌ Erreur serveur :", error.message);
        return res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

db.run("INSERT INTO users (email, password, prenom, nom) VALUES (?, ?, ?, ?)", 
    ["jean@example.com", "secret123", "Jean", "Dupont"], 
    function (err) {
        if (err) {
            console.error("❌ Erreur d'insertion :", err.message);
        } else {
            console.log("✅ Utilisateur ajouté !");
        }
    }
);
app.post("/enregistrer-utilisateur", (req, res) => {
    console.log("📥 Données reçues :", req.body);
});

//------------------------------------ ROUTES GOALS -----------------------------------//
// Route pour ajouter un objectif
app.post('/add-goal', (req, res) => {
    const { date, steps, water, sleep, mood } = req.body;
    if (!date || !steps || !water || !sleep || !mood) {
        return res.status(400).send({ error: 'Tous les champs sont requis.' });
    }
    const query = 'INSERT INTO goals (date, steps, water, sleep, mood) VALUES (?, ?, ?, ?, ?)';
    db.run(query, [date, steps, water, sleep, mood], function (err) {
        if (err) {
            res.status(500).send({ error: 'Erreur lors de l\'ajout de l\'objectif.' });
        } else {
            res.send({ message: 'Objectif ajouté avec succès.', goalId: this.lastID });
        }
    });
});
// Route pour récupérer tous les objectifs
app.get('/goals', (req, res) => {
    const query = 'SELECT * FROM goals';
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).send({ error: 'Erreur lors de la récupération des objectifs.' });
        } else {
            res.send(rows);
        }
    });
});
//------------------------------------ ROUTE POUR ENREGISTRER LES DONNÉES D'URGENCE -----------------------------------//

app.post('/save-emergency', (req, res) => {
    const { bloodGroup, allergens, medicalHistory, emergencyContactName, emergencyContactPhone } = req.body;
    const query = `
    INSERT INTO emergency_info (bloodGroup, allergens, medicalHistory, emergencyContactName, emergencyContactPhone)
    VALUES (?, ?, ?, ?, ?)
  `;
    db.run(query, [bloodGroup, allergens, medicalHistory, emergencyContactName, emergencyContactPhone], function (err) {
        if (err) {
            res.status(500).send({ error: 'Erreur lors de l\'enregistrement des données d\'urgence.' });
        } else {
            res.status(200).send({ message: 'Données d\'urgence sauvegardées avec succès !' });
        }
    });
});
// Route pour récupérer tous les objectifs
app.get('/goals', (req, res) => {
    console.log('Requête reçue pour /goals');
    const query = 'SELECT * FROM goals';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erreur SQL:', err);
            res.status(500).send({ error: 'Erreur lors de la récupération des objectifs.' });
        } else {
            res.json(rows);
        }
    });
});

app.put('/edit-goal/:id', (req, res) => {
    const { id } = req.params;
    const { date, steps, water, sleep, mood } = req.body;
    if (!date || !steps || !water || !sleep || !mood) {
        return res.status(400).send({ error: 'Tous les champs sont requis.' });
    }
    const query = 'UPDATE goals SET date = ?, steps = ?, water = ?, sleep = ?, mood = ? WHERE id = ?';
    db.run(query, [date, steps, water, sleep, mood, id], function (err) {
        if (err) {
            return res.status(500).send({ error: 'Erreur lors de la modification de l\'objectif.' });
        }
        if (this.changes === 0) {
            return res.status(404).send({ error: 'Objectif non trouvé.' });
        }
        res.send({ message: 'Objectif modifié avec succès.' });
    });
});
app.delete('/delete-goal/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM goals WHERE id = ?';
    db.run(query, [id], function (err) {
        if (err) {
            return res.status(500).send({ error: 'Erreur lors de la suppression de l\'objectif.' });
        }
        if (this.changes === 0) {
            return res.status(404).send({ error: 'Objectif non trouvé.' });
        }
        res.send({ message: 'Objectif supprimé avec succès.' });
    });
});
app.post("/add_event", (req, res) => {
    const { date, hour, name } = req.body;
    if (!date || !hour || !name) {
        return res.status(400).json({ error: "Tous les champs sont requis (date, hour, name)." });
    }
    db.run("INSERT INTO events (date, hour, name) VALUES (?, ?, ?)", [date, hour, name], function(err) {
        if (err) {
            console.error("❌ Erreur SQLite (Ajout événement) :", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: "✅ Événement enregistré !" });
    });
});

app.get("/events", (req, res) => {
    db.all("SELECT * FROM events", [], (err, rows) => {
        if (err) {
            console.error("❌ Erreur SQLite (Lecture événements) :", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.put('/edit-event/:id', (req, res) => {
    const { id } = req.params;
    const { date, hour, name } = req.body;
    if (!date || !hour || !name) {
        return res.status(400).send({ error: 'Tous les champs sont requis.' });
    }
    const query = 'UPDATE events SET date = ?, hour = ?, name = ? WHERE id = ?';
    db.run(query, [date, hour, name, id], function (err) {
        if (err) {
            return res.status(500).send({ error: 'Erreur lors de la modification de l\'événement.' });
        }
        if (this.changes === 0) {
            return res.status(404).send({ error: 'Événement non trouvé.' });
        }
        res.send({ message: 'Événement modifié avec succès.' });
    });
});
//------------------------------------ ROUTES MOODS -----------------------------------//
// Route pour ajouter une humeur
app.post('/add-mood', (req, res) => {
    const { date, mood } = req.body;
    if (!date || !mood) {
        return res.status(400).send({ error: 'Date et humeur sont obligatoires.' });
    }
    const query = 'INSERT INTO moods (date, mood) VALUES (?, ?)';
    db.run(query, [date, mood], function (err) {
        if (err) {
            res.status(500).send({ error: 'Erreur lors de l\'ajout de l\'humeur.' });
        } else {
            res.send({ message: 'Humeur ajoutée avec succès.', moodId: this.lastID });
        }
    });
});
// Route pour récupérer toutes les humeurs
app.get('/moods', (req, res) => {
    const query = 'SELECT * FROM moods';
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).send({ error: 'Erreur lors de la récupération des humeurs.' });
        } else {
            res.send(rows);
        }
    });
});
app.put('/edit-mood/:id', (req, res) => {
    const { id } = req.params;
    const { date, mood } = req.body;
    if (!date || !mood) {
        return res.status(400).send({ error: 'Tous les champs sont requis.' });
    }
    const query = 'UPDATE moods SET date = ?, mood = ? WHERE id = ?';
    db.run(query, [date, mood, id], function (err) {
        if (err) {
            return res.status(500).send({ error: 'Erreur lors de la modification de l\'humeur.' });
        }
        if (this.changes === 0) {
            return res.status(404).send({ error: 'Humeur non trouvée.' });
        }
        res.send({ message: 'Humeur modifiée avec succès.' });
    });
});
app.delete('/delete-mood/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM moods WHERE id = ?';
    db.run(query, [id], function (err) {
        if (err) {
            return res.status(500).send({ error: 'Erreur lors de la suppression de l\'humeur.' });
        }
        if (this.changes === 0) {
            return res.status(404).send({ error: 'Humeur non trouvée.' });
        }
        res.send({ message: 'Humeur supprimée avec succès.' });
    });
});
app.delete('/delete-event/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM events WHERE id = ?';
    db.run(query, [id], function (err) {
        if (err) {
            return res.status(500).send({ error: 'Erreur lors de la suppression de l\'événement.' });
        }
        if (this.changes === 0) {
            return res.status(404).send({ error: 'Événement non trouvé.' });
        }
        res.send({ message: 'Événement supprimé avec succès.' });
    });
});
//------------------------------------ ROUTES WELLNESS -----------------------------------//
// Route pour ajouter une donnée bien-être
app.post('/add-wellness', (req, res) => {
    const { date, sleep, water, steps, quality, heartRate } = req.body;
    if (!date || !sleep || !water || !steps || !quality || !heartRate) {
        return res.status(400).send({ error: 'Tous les champs sont requis.' });
    }
    const query = `INSERT INTO wellness_data (date, sleep, water, steps, quality, heartRate) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(query, [date, sleep, water, steps, quality, heartRate], function (err) {
        if (err) {
            return res.status(500).send({ error: 'Erreur lors de l\'insertion des données.' });
        }
        res.send({ message: 'Données bien-être enregistrées avec succès.', id: this.lastID });
    });
});
// Route pour récupérer toutes les données bien-être
app.get('/wellness', (req, res) => {
    const query = `SELECT * FROM wellness_data`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).send({ error: 'Erreur lors de la récupération des données.' });
        }
        res.send(rows);
    });
});
app.put('/edit-wellness/:id', (req, res) => {
    const { id } = req.params;
    const { date, sleep, water, steps, quality, heartRate } = req.body;
    if (!date || !sleep || !water || !steps || !quality || !heartRate) {
        return res.status(400).send({ error: 'Tous les champs sont requis.' });
    }
    const query = 'UPDATE wellness_data SET date = ?, sleep = ?, water = ?, steps = ?, quality = ?, heartRate = ? WHERE id = ?';
    db.run(query, [date, sleep, water, steps, quality, heartRate, id], function (err) {
        if (err) {
            return res.status(500).send({ error: 'Erreur lors de la modification des données bien-être.' });
        }
        if (this.changes === 0) {
            return res.status(404).send({ error: 'Données bien-être non trouvées.' });
        }
        res.send({ message: 'Données bien-être modifiées avec succès.' });
    });
});
app.get('/', (req, res) =>
{
    res.sendFile(path.join(__dirname, 'public', 'index_premium.html'));
});
app.delete('/delete-wellness/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM wellness_data WHERE id = ?';
    db.run(query, [id], function (err) {
        if (err) {
            return res.status(500).send({ error: 'Erreur lors de la suppression des données bien-être.' });
        }
        if (this.changes === 0) {
            return res.status(404).send({ error: 'Données bien-être non trouvées.' });
        }
        res.send({ message: 'Données bien-être supprimées avec succès.' });
    });
});
app.get('/api/summaries', (req, res) => {
    const query = `
    SELECT 
      SUM(sleep) as totalSleep,
      SUM(water) as totalWater,
      SUM(steps) as totalSteps,
      AVG(heartRate) as averageHeartRate
    FROM wellness_data;
  `;
    db.get(query, [], (err, row) => {
        if (err) {
            res.status(500).send({ error: 'Erreur lors de la récupération des résumés.' });
        } else {
            res.send(row); // Envoie les résultats sous forme JSON
        }
    });
});
app.post('/points', (req, res) => {
    const { date, points } = req.body;
    if (!date || !points) {
        return res.status(400).json({ message: 'Date ou points non spécifiés.' });
    }
    const query = 'INSERT INTO user_points (date, points) VALUES (?, ?)';
    db.run(query, [date, points], function (err) {
        if (err) {
            console.error('Erreur lors de l\'insertion des points:', err.message);
            return res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement des points.' });
        }
        res.status(201).json({ message: 'Points enregistrés avec succès.', id: this.lastID });
    });
});
app.delete('/user-points/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM user_points WHERE id = ?';
    db.run(query, [id], function (err) {
        if (err) {
            console.error('Erreur lors de la suppression des points utilisateur:', err.message);
            return res.status(500).json({ message: 'Erreur serveur lors de la suppression des points.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Points utilisateur non trouvés.' });
        }
        res.status(200).json({ message: 'Points utilisateur supprimés avec succès.' });
    });
});
app.post("/save", (req, res) => {
    const { age, sex, weight, height, bmi, category } = req.body;
    db.run(
        `INSERT INTO user_data (age, sex, weight, height, bmi, category) VALUES (?, ?, ?, ?, ?, ?)`,
        [age, sex, weight, height, bmi, category],
        function (err) {
            if (err) {
                console.error("Erreur lors de l'insertion des données:", err.message);
                res.status(500).json({ message: "Échec de l'enregistrement des données." });
            } else {
                res.status(200).json({ message: "Données enregistrées avec succès !" });
            }
        }
    );
});
app.get("/api/all_stats", (req, res) => {
    db.all("SELECT * FROM wellness_data", [], (err, rows) => {
        if (err) {
            console.error("❌ Erreur SQLite :", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("✅ Données envoyées :", rows); // Vérification console
        res.json(rows || []);
    });
});

app.get('/points-sum', (req, res) => {
    const query = 'SELECT SUM(points) AS totalPoints FROM user_points';
    db.get(query, [], (err, row) => {
        if (err) {
            console.error('Erreur lors du calcul de la somme des points:', err.message);
            res.status(500).json({ message: 'Erreur serveur lors du calcul des points.' });
        } else {
            res.status(200).json({ totalPoints: row.totalPoints || 0 });
        }
    });
});
// 🔑 Hachage des mots de passe avec bcrypt.js
function hashPassword(password) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
}
// 🎟 Génération d'un token JWT pour authentification
function generateToken(email) {
    return jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });
}
// 🔐 Chiffrement des données sensibles (exemple: numéros de téléphone)
function encryptData(data) {
    return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
}
// 🚀 **Inscription d'un utilisateur sécurisé**
app.post('/register', (req, res) => {
    const { email, password, prenom, nom } = req.body;
    const hashedPassword = hashPassword(password);

    db.run(`INSERT INTO users (email, password, prenom, nom) VALUES (?, ?, ?, ?)`, 
        [email, hashedPassword, prenom, nom], 
        (err) => {
            if (err) {
                return res.status(500).json({ message: "Erreur lors de l'inscription.", error: err.message });
            }
            const token = generateToken(email);
            res.json({ message: "Inscription réussie !", token });
        });
});
// 🔑 **Authentification et connexion sécurisée**
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }
        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Mot de passe incorrect." });
        }
        const token = generateToken(email);
        res.json({ message: "Connexion réussie.", token });
    });
});
// 📊 **Logs et surveillance avec Winston.js**
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs/errors.log', level: 'error' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});
// 🛡 **API sécurisée avec JWT**
app.get('/secure-data', (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(403).json({ message: "Accès refusé." });

    try {
        const decoded = jwt.verify(token.replace("Bearer ", ""), SECRET_KEY);
        res.json({ message: "Données sécurisées accessibles !", email: decoded.email });
    } catch (error) {
        res.status(403).json({ message: "Token invalide." });
    }
});

// Définir un port dynamique ou 3000 par défaut
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

