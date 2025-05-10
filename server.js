const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path"); // ✅ Ajout de path
const app = express();
const db = new sqlite3.Database("./guests.db");
app.use(express.json());
app.use(cors());
// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public"))); // ✅ Servir le dossier public
// Création de la table
db.run("CREATE TABLE IF NOT EXISTS guests (id INTEGER PRIMARY KEY, name TEXT)");
// Ajouter un invité
app.post("/addGuest", (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO guests (name) VALUES (?)", [name], () => {
        res.json({ message: "Invité ajouté !" });
    });
});
// Récupérer les invités
app.get("/getGuests", (req, res) => {
    db.all("SELECT * FROM guests", [], (err, rows) => {
        res.json(rows);
    });
});
// Supprimer un invité
app.delete("/deleteGuest/:id", (req, res) => {
    db.run("DELETE FROM guests WHERE id = ?", [req.params.id], () => {
        res.json({ message: "Invité supprimé !" });
    });
});
// Afficher `index.html` sur `/`
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
// Route pour gérer les erreurs 404
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});
// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
