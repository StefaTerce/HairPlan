const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hairplan.db', (err) => {
    if (err) {
        console.error("Errore connessione database", err.message);
    } else {
        console.log("Connesso al database hairplan.");
    }
});

// Creazione tabelle se non esistono
db.serialize(() => {
    // 1. Crea Tabella Utenti (se non esiste)
    db.run(`CREATE TABLE IF NOT EXISTS utenti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        ruolo TEXT NOT NULL CHECK(ruolo IN ('admin', 'parrucchiere', 'utente')),
        nome TEXT NOT NULL,
        cognome TEXT,
        email TEXT UNIQUE,
        telefono TEXT,
        nome_salone TEXT,
        indirizzo TEXT,
        servizi_offerti TEXT
        -- La colonna 'age' verrà aggiunta sotto se manca
    )`, (err) => {
        if (err) console.error("Errore creazione tabella utenti:", err.message);
        else console.log("Tabella 'utenti' verificata/creata.");
    });

    // --- AGGIUNTA COLONNA 'age' SE MANCA ---
    db.run(`ALTER TABLE utenti ADD COLUMN age INTEGER`, (err) => {
        if (err) {
            if (!err.message.includes('duplicate column name')) {
                console.error("Errore aggiunta colonna 'age' a 'utenti':", err.message);
            } else {
                console.log("Colonna 'age' già presente in 'utenti'.");
            }
        } else {
            console.log("Colonna 'age' aggiunta/verificata in 'utenti'.");
        }
    });
    // --- FINE AGGIUNTA 'age' ---

    // 2. Crea Tabella Appuntamenti (se non esiste)
    db.run(`CREATE TABLE IF NOT EXISTS appuntamenti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parrucchiere_username TEXT NOT NULL,
        giorno TEXT NOT NULL,
        ora TEXT NOT NULL,
        descrizione TEXT,
        utente TEXT NOT NULL,
        FOREIGN KEY (parrucchiere_username) REFERENCES utenti(username) ON DELETE CASCADE,
        FOREIGN KEY (utente) REFERENCES utenti(username) ON DELETE CASCADE,
        UNIQUE(parrucchiere_username, giorno, ora) /* Impedisce doppie prenotazioni */
    )`, (err) => {
         if (err) console.error("Errore creazione tabella appuntamenti:", err.message);
         else console.log("Tabella 'appuntamenti' verificata/creata.");
    });

    // 3. Crea Tabella Chat (se non esiste)
    db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_username TEXT NOT NULL,
        receiver_username TEXT NOT NULL,
        message_content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_username) REFERENCES utenti(username) ON DELETE CASCADE,
        FOREIGN KEY (receiver_username) REFERENCES utenti(username) ON DELETE CASCADE
    )`, (err) => {
         if (err) console.error("Errore creazione tabella chat_messages:", err.message);
         else console.log("Tabella 'chat_messages' verificata/creata.");
    });

    // 4. Indici per Performance Chat (Opzionale ma raccomandato)
    db.run(`CREATE INDEX IF NOT EXISTS idx_chat_conversation ON chat_messages (sender_username, receiver_username, timestamp)`, (err) => {
        if (err) console.warn("Attenzione indice idx_chat_conversation:", err.message);
    });
     db.run(`CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages (timestamp)`, (err) => {
        if (err) console.warn("Attenzione indice idx_chat_timestamp:", err.message);
    });

});

module.exports = db;