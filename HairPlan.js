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
            // Tabella parrucchieri con il campo username
            db.run(`CREATE TABLE IF NOT EXISTS parrucchieri (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE, -- Aggiunto campo username univoco
                nome TEXT NOT NULL,
                cognome TEXT NOT NULL,
                email TEXT NOT NULL,
                telefono TEXT NOT NULL,
                nome_salone TEXT,
                indirizzo TEXT,
                servizi_offerti TEXT,
                pass TEXT NOT NULL
            )`, (err) => {
                if (err) {
                    console.error('Errore durante la creazione della tabella parrucchieri:', err.message);
                } else {
                    console.log('Tabella parrucchieri creata o già esistente.');
                }
            });

        });
    }
});


app.post('/parrucchieri', (req, res) => {
    const { username, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti, pass } = req.body;

    // Controlla se tutti i dati richiesti sono presenti
    if (!username || !nome || !cognome || !email || !telefono || !pass) {
        return res.status(400).json({ message: 'Dati mancanti: username, nome, cognome, email, telefono o password' });
    }

    // Verifica che l'username sia unico in entrambe le tabelle
    const queryCheckUsername = `
        SELECT username FROM utenti WHERE username = ? 
        UNION 
        SELECT username FROM parrucchieri WHERE username = ?
    `;

    db.all(queryCheckUsername, [username, username], (err, rows) => {
        if (err) {
            console.error('Errore durante il controllo dell\'username:', err); // Log dell'errore
            return res.status(500).json({ message: 'Errore durante il controllo dell\'username' });
        }

        // Se ci sono risultati, l'username è già in uso
        if (rows.length > 0) {
            return res.status(400).json({ message: 'Username già in uso.' });
        }

        // Procedi con l'inserimento se l'username è unico
        const queryInsert = `INSERT INTO parrucchieri (username, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti, pass) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(queryInsert, [username, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti, pass], function (err) {
            if (err) {
                console.error('Errore durante la creazione del profilo parrucchiere:', err); // Log dell'errore
                return res.status(500).json({ message: 'Errore durante la creazione del profilo parrucchiere' });
            }
            res.status(201).json({ id: this.lastID, username: username, status: "Parrucchiere registrato" });
        });
    });
});


// Route per il login
app.post('/login', (req, res) => {
    const { username, pass } = req.body;

    console.log('Tentativo di login:', username); // Log dell'username

    const queryUtenti = `SELECT * FROM utenti WHERE username = ? AND pass = ?`;
    const queryParrucchieri = `SELECT * FROM parrucchieri WHERE username = ? AND pass = ?`;

    // Controlla prima nella tabella utenti
    db.get(queryUtenti, [username, pass], (err, userRow) => {
        if (err) {
            return res.status(500).json({ message: 'Errore durante la lettura del database' });
        }
        if (userRow) {
            // Utente trovato
            return res.status(200).json({
                success: true,
                username: userRow.username,
                status: "Logged In",
                role: "utente" // Specifica che è un utente
            });
        }

        // Se non trovato tra gli utenti, controlla i parrucchieri
        db.get(queryParrucchieri, [username, pass], (err, barberRow) => {
            if (err) {
                return res.status(500).json({ message: 'Errore durante la lettura del database' });
            }
            if (barberRow) {
                // Parrucchiere trovato
                return res.status(200).json({
                    success: true,
                    username: barberRow.username,
                    status: "Logged In",
                    role: "parrucchiere" // Specifica che è un parrucchiere
                });
            }

            console.log('Credenziali non valide'); // Log dell'errore
            return res.status(401).json({ success: false, message: 'Credenziali non valide.' });
        });
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

    // Controlla se tutti i dati richiesti sono presenti
    if (!username || !email || !age || !pass) {
        return res.status(400).json({ message: 'Dati mancanti: username, email, age o password' });
    }

    // Verifica che l'username sia unico
    const queryCheckUsername = `
        SELECT username FROM utenti WHERE username = ? 
        UNION 
        SELECT username FROM parrucchieri WHERE username = ?
    `;

    db.get(queryCheckUsername, [username, username], (err, row) => {
        if (err) {
            console.error('Errore durante il controllo dell\'username:', err); // Log dell'errore
            return res.status(500).json({ message: 'Errore durante il controllo dell\'username' });
        }

        // Se l'username è già in uso
        if (row) {
            return res.status(400).json({ message: 'Username già in uso.' });
        }

        // Procedi con l'inserimento se l'username è unico
        const queryInsert = `INSERT INTO utenti (username, email, age, pass) VALUES (?, ?, ?, ?)`;
        db.run(queryInsert, [username, email, age, pass], function (err) {
            if (err) {
                console.error('Errore durante l\'inserimento del nuovo utente nel database:', err); // Log dell'errore
                return res.status(500).json({ message: 'Errore durante l\'inserimento del nuovo utente nel database' });
            }
            res.status(201).json({ username: username, status: "Utente registrato con successo" });
        });
    });
});


// Route per creare un calendario per un parrucchiere
app.post('/calendari', (req, res) => {
    const { nome, descrizione, parrucchiere_id } = req.body; // Modificato a parrucchiere_id

    if (!nome || !parrucchiere_id) {
        return res.status(400).json({ message: 'Dati mancanti: nome o parrucchiere_id' });
    }

    // Verifica che il parrucchiere esista
    const queryCheckParrucchiere = `SELECT * FROM parrucchieri WHERE id = ?`;
    db.get(queryCheckParrucchiere, [parrucchiere_id], (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Errore durante la verifica del parrucchiere' });
        }
        
        if (!row) {
            return res.status(404).json({ message: 'Parrucchiere non trovato.' });
        }

        // Se il parrucchiere esiste, crea il calendario
        const queryInsert = `INSERT INTO calendari (nome, descrizione, utente_id) VALUES (?, ?, ?)`;
        db.run(queryInsert, [nome, descrizione, parrucchiere_id], function (err) {
            if (err) {
                return res.status(500).json({ message: 'Errore durante la creazione del calendario' });
            }
            res.status(201).json({ calendario_id: this.lastID, status: "Calendario creato" });
        });
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

    // Verifica la presenza dell'utente in entrambe le tabelle e cancellalo se esiste
    const queryDeleteUser = `
        DELETE FROM utenti WHERE username = ?;
        DELETE FROM parrucchieri WHERE username = ?;
    `;

    db.serialize(() => {
        db.run(queryDeleteUser, [username, username], function (err) {
            if (err) {
                return res.status(500).json({ message: 'Errore durante l\'eliminazione dell\'utente o del parrucchiere' });
            }

            if (this.changes > 0) {
                res.status(200).json({
                    "username": username,
                    "status": "Utente o parrucchiere, calendari e prenotazioni cancellati"
                });
            } else {
                res.status(404).json({ message: 'Utente o parrucchiere non trovato.' });
            }
        });
    });
});
// Endpoint per ottenere tutti i calendari
app.get('/calendari', (req, res) => {
    const query = 'SELECT * FROM calendari';
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Errore durante il recupero dei calendari:', err);
            return res.status(500).json({ message: 'Errore durante il recupero dei calendari' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Nessun calendario trovato.' });
        }

        res.status(200).json(rows);
    });
});
app.get('/parrucchieri/servizio/:servizio', (req, res) => {
    const servizio = req.params.servizio;

    const queryParrucchieri = `
        SELECT * FROM parrucchieri 
        WHERE servizi_offerti LIKE ?
    `;

    db.all(queryParrucchieri, [`%${servizio}%`], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Errore nel recupero dei parrucchieri.' });
        }

        res.status(200).json(rows);
    });
});
app.get('/utenti/:id', (req, res) => {
    const id = req.params.id;

    const queryUtenti = `SELECT * FROM utenti WHERE id = ?`;

    db.all(queryUtenti, [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Errore nel recupero degli utenti.' });
        }

        res.status(200).json(rows);
    });
});


// Avvio del server
app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
});
