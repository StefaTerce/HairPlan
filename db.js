// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'hairplan.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Errore durante l\'apertura del database:', err.message);
  } else {
    console.log('Connesso al database SQLite.');
  }
});

db.serialize(() => {
  // 1. Creazione delle tabelle, se non esistono
  db.run(`
    CREATE TABLE IF NOT EXISTS utenti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      ruolo TEXT CHECK(ruolo IN ('admin', 'parrucchiere', 'utente')) NOT NULL,
      nome TEXT NOT NULL,
      cognome TEXT,
      email TEXT UNIQUE NOT NULL,
      telefono TEXT,
      nome_salone TEXT,
      indirizzo TEXT,
      servizi_offerti TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS calendari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      giorno TEXT NOT NULL,
      slot TEXT,
      prenotazioni TEXT,
      FOREIGN KEY (username) REFERENCES utenti(username) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS appuntamenti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parrucchiere_username TEXT NOT NULL,
      giorno TEXT NOT NULL,
      ora TEXT NOT NULL,
      descrizione TEXT,
      utente TEXT NOT NULL,
      FOREIGN KEY (parrucchiere_username) REFERENCES utenti(username) ON DELETE CASCADE
    )
  `);

  console.log('Tabelle create o già esistenti.');

  // 2. Inserimento utenti di default
  const defaultUsers = [
    {
      username: 'admin',
      password: 'admin123',
      ruolo: 'admin',
      nome: 'Admin',
      cognome: null,
      email: 'admin@example.com',
      telefono: null,
      nome_salone: null,
      indirizzo: null,
      servizi_offerti: null
    },
    {
      username: 'parrucchiere',
      password: 'parrucchiere123',
      ruolo: 'parrucchiere',
      nome: 'Giuseppe',
      cognome: 'Verdi',
      email: 'giuseppe@example.com',
      telefono: '3331234567',
      nome_salone: 'Salone Rusu',
      indirizzo: 'Via Roma 10',
      servizi_offerti: 'Taglio, Colore, Barba'
    },
    {
      username: 'utente',
      password: 'utente123',
      ruolo: 'utente',
      nome: 'Marco',
      cognome: 'Rossi',
      email: 'marco@example.com',
      telefono: null,
      nome_salone: null,
      indirizzo: null,
      servizi_offerti: null
    }
  ];

  // Usa la clausola OR IGNORE per evitare errori se l'utente esiste già
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO utenti 
    (username, password, ruolo, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  defaultUsers.forEach(user => {
    insertStmt.run(
      user.username,
      user.password,
      user.ruolo,
      user.nome,
      user.cognome,
      user.email,
      user.telefono,
      user.nome_salone,
      user.indirizzo,
      user.servizi_offerti
    );
  });

  insertStmt.finalize(() => {
    console.log('Utenti di default inseriti (se non già presenti).');
  });
});

module.exports = db;
