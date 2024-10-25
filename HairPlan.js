const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors'); 
const PORT = 3000;

const app = express();

// Abilita il CORS per tutte le richieste
app.use(cors());

// Middleware per il parsing del body delle richieste
app.use(bodyParser.json());

// Connessione al database SQLite
const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
        console.error('Errore durante l\'apertura del database:', err.message);
    } else {
        console.log('Connesso al database SQLite.');

        // Inizializza il database creando le tabelle se non esistono
        db.serialize(() => {
            // Tabella utenti
            db.run(`CREATE TABLE IF NOT EXISTS utenti (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL,
                age INTEGER NOT NULL,
                pass TEXT NOT NULL
            )`, (err) => {
                if (err) {
                    console.error('Errore durante la creazione della tabella utenti:', err.message);
                } else {
                    console.log('Tabella utenti creata o già esistente.');
                }
            });

            // Tabella calendari con descrizione
            db.run(`CREATE TABLE IF NOT EXISTS calendari (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                descrizione TEXT,  -- Aggiunto campo descrizione
                utente_id INTEGER NOT NULL,
                FOREIGN KEY(utente_id) REFERENCES utenti(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('Errore durante la creazione della tabella calendari:', err.message);
                } else {
                    console.log('Tabella calendari creata o già esistente.');
                }
            });

            // Tabella prenotazioni
            db.run(`CREATE TABLE IF NOT EXISTS prenotazioni (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                calendario_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                FOREIGN KEY(calendario_id) REFERENCES calendari(id) ON DELETE CASCADE,
                UNIQUE(calendario_id, date, time)
            )`, (err) => {
                if (err) {
                    console.error('Errore durante la creazione della tabella prenotazioni:', err.message);
                } else {
                    console.log('Tabella prenotazioni creata o già esistente.');
                }
            });
        });
    }
});

// Route per il login
app.post('/login', (req, res) => {
    const { username, pass } = req.body;

    console.log('Tentativo di login:', username); // Log dell'username

    const query = `SELECT * FROM utenti WHERE username = ? AND pass = ?`;
    db.get(query, [username, pass], (err, row) => {
        if (err) {
            res.status(500).json({ message: 'Errore durante la lettura del database' });
        } else if (row) {
            res.status(200).json({
                success: true, // Aggiungi questo campo
                username: row.username,
                status: "Logged In"
            });
        } else {
            console.log('Credenziali non valide'); // Log dell'errore
            res.status(401).json({ success: false, message: 'Credenziali non valide.' }); // Aggiungi success: false
        }
    });
});

// Route per ottenere tutti gli utenti
app.get('/utenti', (req, res) => {
    const query = `SELECT * FROM utenti`;

    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ message: 'Errore durante la lettura del database' });
        } else {
            res.status(200).json(rows);
        }
    });
});

// Route per creare un nuovo utente
app.post('/utenti', (req, res) => {
    const { username, email, age, pass } = req.body;

    if (!username || !email || !age || !pass) {
        return res.status(400).json({ message: 'Dati mancanti: username, email, age o password' });
    }

    if (parseInt(age) < 13) {
        return res.status(400).json({ message: "L'età deve essere almeno 13 anni." });
    }

    const queryInsert = `INSERT INTO utenti (username, email, age, pass) VALUES (?, ?, ?, ?)`;

    db.run(queryInsert, [username, email, age, pass], function (err) {
        if (err) {
            return res.status(500).json({ message: 'Errore durante l\'inserimento del nuovo utente nel database' });
        }
        res.status(201).json({ username: username, status: "Registered In" });
    });
});

// Route per creare un calendario per un utente
app.post('/calendari', (req, res) => {
    const { nome, descrizione, utente_id } = req.body; // Aggiunto descrizione

    if (!nome || !utente_id) {
        return res.status(400).json({ message: 'Dati mancanti: nome o utente_id' });
    }

    const queryInsert = `INSERT INTO calendari (nome, descrizione, utente_id) VALUES (?, ?, ?)`; // Aggiunto descrizione

    db.run(queryInsert, [nome, descrizione, utente_id], function (err) {
        if (err) {
            return res.status(500).json({ message: 'Errore durante la creazione del calendario' });
        }
        res.status(201).json({ calendario_id: this.lastID, status: "Calendario creato" });
    });
});

// Route per creare una prenotazione in un calendario
app.post('/prenotazione', (req, res) => {
    const { calendario_id, date, time } = req.body;

    if (!calendario_id || !date || !time) {
        return res.status(400).json({ message: 'Dati mancanti: calendario_id, data o ora' });
    }

    const queryCheck = `SELECT * FROM prenotazioni WHERE calendario_id = ? AND date = ? AND time = ?`;
    db.get(queryCheck, [calendario_id, date, time], (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Errore durante la verifica della disponibilità' });
        }
        if (row) {
            return res.status(400).json({ message: 'Data o ora non disponibili.' });
        }

        const queryInsert = `INSERT INTO prenotazioni (calendario_id, date, time) VALUES (?, ?, ?)`;
        db.run(queryInsert, [calendario_id, date, time], function (err) {
            if (err) {
                return res.status(500).json({ message: 'Errore durante l\'inserimento della prenotazione nel database' });
            }
            res.status(201).json({
                "calendario_id": calendario_id,
                "status": "Prenotazione completata",
                "date": date,
                "time": time
            });
        });
    });
});

// Route per eliminare un utente e i suoi calendari/prenotazioni
app.delete('/utenti', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ message: 'Dati mancanti: username' });
    }

    const queryDeleteUtente = `DELETE FROM utenti WHERE username = ?`;
    db.run(queryDeleteUtente, [username], function (err) {
        if (err) {
            return res.status(500).json({ message: 'Errore durante l\'eliminazione dell\'utente' });
        }

        if (this.changes > 0) {
            res.status(200).json({
                "username": username,
                "status": "Utente, calendari e prenotazioni cancellati"
            });
        } else {
            res.status(404).json({ message: 'Utente non trovato.' });
        }
    });
});

// Avvio del server
app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
});
