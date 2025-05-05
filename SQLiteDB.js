// SQLiteDB.js
const db = require('./db'); // Assicura che db.js esporti l'istanza sqlite3.Database

// Funzione Helper per query SELECT con Promise
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error("Errore DB (runQuery):", sql, params, err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Funzione Helper per INSERT, UPDATE, DELETE con Promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) { // Usa function() per 'this'
      if (err) {
        console.error("Errore DB (run):", sql, params, err.message);
        reject(err);
      } else {
        // Restituisce lastID per INSERT, changes per UPDATE/DELETE
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

class SQLiteDB {
  // --- Gestione Utenti ---
  async getUserByUsername(username) {
    // Seleziona campi essenziali, escludi password se possibile
    const rows = await runQuery('SELECT id, username, password, ruolo, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti FROM utenti WHERE username = ?', [username]);
    return rows[0];
  }

  async addUser(user) {
    // Validazione input essenziali lato DB (anche se già fatta in app.js)
    if (!user || !user.username || !user.password || !user.ruolo || !user.nome) {
        throw new Error("Dati utente essenziali mancanti per addUser.");
    }
    // In produzione: assicurarsi che la password sia hashata PRIMA di arrivare qui
    const result = await run(
      `INSERT INTO utenti
         (username, password, ruolo, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti, age)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.username, user.password, user.ruolo, user.nome,
        user.cognome || null, user.email || null, user.telefono || null,
        user.nome_salone || null, user.indirizzo || null, user.servizi_offerti || null,
        user.age || null
      ]
    );
    console.log(`DB: Utente aggiunto con ID: ${result.lastID}`);
    return result.lastID;
  }

  async getAllParrucchieri() {
    // Seleziona solo campi utili per la visualizzazione
    const rows = await runQuery('SELECT id, username, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti FROM utenti WHERE ruolo = ? ORDER BY nome_salone, nome', ['parrucchiere']);
    return rows;
  }

  async deleteUserById(id) {
    // Considera cancellazione logica (flag 'deleted') invece di fisica in produzione
    console.warn(`DB: Tentativo cancellazione fisica utente ID: ${id}`);
    // Potrebbe essere necessario cancellare dati correlati (appuntamenti, ecc.) o usare ON DELETE CASCADE
    const result = await run('DELETE FROM utenti WHERE id = ?', [id]);
    console.log(`DB: Cancellazione utente ID ${id}, righe modificate: ${result.changes}`);
    return result.changes > 0; // True se cancellato
  }

  // --- Gestione Appuntamenti ---

  // Recupera TUTTI gli appuntamenti per un parrucchiere
  async getAppointments(parrucchiereUsername) {
    const rows = await runQuery('SELECT id, parrucchiere_username, giorno, ora, descrizione, utente FROM appuntamenti WHERE parrucchiere_username = ?', [parrucchiereUsername]);
    return rows;
  }

  // Recupera UN SINGOLO appuntamento per ID
  async getAppointmentById(id) {
    console.log(`DB DEBUG: Eseguo getAppointmentById con ID: ${id}`);
    if (isNaN(id)) { console.error("DB: getAppointmentById chiamato con ID non numerico:", id); return undefined; }
    const rows = await runQuery('SELECT id, parrucchiere_username, giorno, ora, descrizione, utente FROM appuntamenti WHERE id = ?', [id]);
    console.log(`DB DEBUG: Risultato getAppointmentById (${id}):`, rows[0] ? 'Trovato' : 'Non Trovato');
    return rows[0]; // Restituisce appuntamento o undefined
  }

  // Aggiunge un nuovo appuntamento (usato da prenotaSlot)
  async addAppointment(parrucchiereUsername, appointment) {
    if (!parrucchiereUsername || !appointment || !appointment.giorno || !appointment.ora || !appointment.utente) {
         throw new Error("Dati appuntamento essenziali mancanti per addAppointment.");
    }
    const result = await run(
      'INSERT INTO appuntamenti (parrucchiere_username, giorno, ora, descrizione, utente) VALUES (?, ?, ?, ?, ?)',
      [parrucchiereUsername, appointment.giorno, appointment.ora, appointment.descrizione || '', appointment.utente]
    );
    console.log(`DB: Appuntamento aggiunto (ID: ${result.lastID}) per ${parrucchiereUsername} da ${appointment.utente} il ${appointment.giorno} alle ${appointment.ora}`);
    return result.lastID;
  }

  // Prenota uno slot (logica semplificata basata solo su tabella appuntamenti)
  async prenotaSlot(parrucchiereUsername, giorno, ora, descrizione, utente) {
    // 1. Controllo atomico (o quasi) per evitare race conditions
    // Usare una transazione sarebbe ideale, ma più complesso con sqlite3 base
    const existing = await runQuery(
        'SELECT id FROM appuntamenti WHERE parrucchiere_username = ? AND giorno = ? AND ora = ?',
        [parrucchiereUsername, giorno, ora]
    );

    if (existing.length > 0) {
        console.warn(`DB: Slot ${giorno} ${ora} per ${parrucchiereUsername} già prenotato (ID: ${existing[0].id}). Prenotazione fallita.`);
        return false; // Già prenotato
    }

    // 2. Se libero, prova ad inserire
    try {
        const appointment = { giorno, ora, descrizione, utente: utente.username };
        await this.addAppointment(parrucchiereUsername, appointment);
        return true; // Successo
    } catch (error) {
        // Potrebbe fallire per constraint UNIQUE se c'è race condition, o altri errori DB
        console.error(`DB: Errore durante addAppointment in prenotaSlot per ${parrucchiereUsername} (${giorno} ${ora}):`, error.message);
        return false; // Fallito
    }
  }

  // Cancella appuntamento verificando ownership UTENTE (chiamato da API utente)
  async deleteAppointment(parrucchiereTarget, appointmentId, requestingUser) {
    const appointment = await this.getAppointmentById(appointmentId);
    if (!appointment) {
      console.warn(`DB: Tentativo cancellazione utente (${requestingUser.username}) per appuntamento non trovato ID: ${appointmentId}`);
      throw new Error('Appuntamento non trovato'); // Errore specifico
    }
    // Verifica ownership
    if (appointment.utente !== requestingUser.username) {
      console.warn(`DB: Tentativo cancellazione utente (${requestingUser.username}) non autorizzato per appuntamento ID ${appointmentId} (proprietario: ${appointment.utente})`);
      throw new Error('Non autorizzato a cancellare questo appuntamento'); // Errore specifico
    }
    // Verifica (opzionale) coerenza parrucchiere
     if (appointment.parrucchiere_username !== parrucchiereTarget) {
         console.warn(`DB: Incongruenza parrucchiere durante cancellazione utente: appuntamento ${appointmentId} di ${appointment.parrucchiere_username}, richiesto per ${parrucchiereTarget}`);
         // Decidi se bloccare o loggare solo
     }

    // Procedi con cancellazione per ID
    return this.deleteAppointmentById(appointmentId); // Riusa la funzione di cancellazione diretta
  }

  // Cancella appuntamento per ID (chiamato da API parrucchiere o da deleteAppointment)
  async deleteAppointmentById(id) {
    console.log(`DB DEBUG: Eseguo deleteAppointmentById con ID: ${id}`);
    if (isNaN(id)) { console.error("DB: deleteAppointmentById chiamato con ID non numerico:", id); return false; }
    // La verifica autorizzazione parrucchiere è fatta in app.js PRIMA di chiamare qui
    const result = await run('DELETE FROM appuntamenti WHERE id = ?', [id]);
    console.log(`DB DEBUG: Risultato deleteAppointmentById (${id}), changes: ${result.changes}`);
    return result.changes > 0; // True se cancellato
  }
}

module.exports = SQLiteDB; // Esporta la classe
