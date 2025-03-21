// SQLiteDB.js
const db = require('./db');

// Funzioni helper per lavorare con sqlite3 in modalità Promise
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this); // "this" contiene proprietà come lastID
    });
  });
}

class SQLiteDB {
  // Utenti
  async getUserByUsername(username) {
    const rows = await runQuery('SELECT * FROM utenti WHERE username = ?', [username]);
    return rows[0];
  }

  async addUser(user) {
    await run(
      `INSERT INTO utenti 
        (username, password, ruolo, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.username,
        user.password,
        user.ruolo,
        user.nome,
        user.cognome || null,
        user.email,
        user.telefono || null,
        user.nome_salone || null,
        user.indirizzo || null,
        user.servizi_offerti || null
      ]
    );
  }

  async getAllParrucchieri() {
    const rows = await runQuery('SELECT * FROM utenti WHERE ruolo = ?', ['parrucchiere']);
    return rows;
  }

  async deleteUserById(id) {
    await run('DELETE FROM utenti WHERE id = ?', [id]);
  }

  // Calendario e Appuntamenti

  // Recupera il calendario per un dato parrucchiere e giorno
  async getCalendario(username, giorno) {
    const rows = await runQuery('SELECT * FROM calendari WHERE username = ? AND giorno = ?', [username, giorno]);
    return rows[0]; // Restituisce il record, se esiste
  }

  // Recupera tutti gli appuntamenti per un determinato parrucchiere
  async getAppointments(parrucchiereUsername) {
    const rows = await runQuery('SELECT * FROM appuntamenti WHERE parrucchiere_username = ?', [parrucchiereUsername]);
    return rows;
  }

  // Aggiunge un appuntamento alla tabella "appuntamenti"
  async addAppointment(parrucchiereUsername, appointment) {
    await run(
      'INSERT INTO appuntamenti (parrucchiere_username, giorno, ora, descrizione, utente) VALUES (?, ?, ?, ?, ?)',
      [parrucchiereUsername, appointment.giorno, appointment.ora, appointment.descrizione, appointment.utente]
    );
    console.log(`Appuntamento aggiunto per ${parrucchiereUsername}`);
  }

  // Prenota uno slot per un parrucchiere.
  // Se non esiste ancora un calendario per il giorno, lo crea automaticamente.
  async prenotaSlot(username, giorno, ora, descrizione, utente) {
    // Recupera il calendario per il giorno specifico
    let calendar = await this.getCalendario(username, giorno);
    if (!calendar) {
      // Se non esiste, crea un nuovo calendario con slot predefiniti
      const slots = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
      // La colonna "slot" contiene i tempi disponibili (per eventuale uso futuro)
      // La colonna "prenotazioni" contiene un oggetto in cui ogni chiave (orario) è inizializzata a null
      const prenotazioni = {};
      slots.forEach(slot => {
        prenotazioni[slot] = null;
      });
      await run(
        'INSERT INTO calendari (username, giorno, slot, prenotazioni) VALUES (?, ?, ?, ?)',
        [username, giorno, JSON.stringify(slots), JSON.stringify(prenotazioni)]
      );
      calendar = await this.getCalendario(username, giorno);
    }
    
    let prenotazioni = JSON.parse(calendar.prenotazioni);
    // Verifica se lo slot richiesto è disponibile
    if (prenotazioni[ora] === null) {
      prenotazioni[ora] = utente.username;
      await run(
        'UPDATE calendari SET prenotazioni = ? WHERE id = ?',
        [JSON.stringify(prenotazioni), calendar.id]
      );
      const appointment = { giorno, ora, descrizione, utente: utente.username };
      await this.addAppointment(username, appointment);
      return true;
    }
    return false;
  }

  // Cancella un appuntamento se appartiene all'utente
  async deleteAppointment(parrucchiereUsername, appointmentId, utente) {
    // Recupera gli appuntamenti per verificare la proprietà
    const appointments = await this.getAppointments(parrucchiereUsername);
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) {
      throw new Error('Appuntamento non trovato');
    }
    if (appointment.utente !== utente.username) {
      throw new Error('Non autorizzato a cancellare questo appuntamento');
    }
    // Opzionalmente: aggiornare il calendario rimuovendo la prenotazione dallo slot
    const calendarRows = await runQuery('SELECT * FROM calendari WHERE username = ? AND giorno = ?', [parrucchiereUsername, appointment.giorno]);
    if (calendarRows && calendarRows.length > 0) {
      let calendar = calendarRows[0];
      let prenotazioni = JSON.parse(calendar.prenotazioni);
      if (prenotazioni[appointment.ora] === utente.username) {
        prenotazioni[appointment.ora] = null;
        await run(
          'UPDATE calendari SET prenotazioni = ? WHERE id = ?',
          [JSON.stringify(prenotazioni), calendar.id]
        );
      }
    }
    await run(
      'DELETE FROM appuntamenti WHERE parrucchiere_username = ? AND id = ?',
      [parrucchiereUsername, appointmentId]
    );
  }
}

module.exports = SQLiteDB;
