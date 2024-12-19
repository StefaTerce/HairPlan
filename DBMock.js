class MockDB {
    constructor() {
        this.users = [
            { username: 'admin', password: 'admin123', ruolo: 'admin', nome: 'Admin', email: 'admin@example.com' },
            { username: 'parrucchiere', password: 'parrucchiere123', ruolo: 'parrucchiere', nome: 'Giuseppe', cognome: 'Verdi', email: 'giuseppe@example.com', telefono: '3331234567', nome_salone: 'Salone Giuseppe', indirizzo: 'Via Roma 10', servizi_offerti: 'Taglio, Colore, Barba' },
            { username: 'utente', password: 'utente123', ruolo: 'utente', nome: 'Marco', cognome: 'Rossi', email: 'marco@example.com' }
        ];
        
        this.calendari = {
            parrucchiere: [] // calendario associato all'utente 'parrucchiere'
        };
        this.appointments = []; // Array per salvare gli appuntamenti
    }

    // Recupera il calendario di un parrucchiere
    getCalendario(username) {
        this.setupCalendario(username);
        return this.calendari[username];
    }
    
    setupCalendario(username) {
        if (!this.calendari[username]) {
            this.calendari[username] = []; // Inizializza il calendario come array vuoto
            console.log(`Calendario creato per ${username}.`);
        }
    }
    
    // Crea un calendario per un parrucchiere
    creaCalendario(username, giorno, slot) {
        if (!this.calendari[username]) {
            this.calendari[username] = [];
        }
        const giornoCalendario = this.calendari[username].find(c => c.giorno === giorno);
        if (!giornoCalendario) {
            this.calendari[username].push({
                giorno: giorno,
                slot: slot,
                prenotazioni: slot.reduce((acc, cur) => {
                    acc[cur] = null; // Nessuna prenotazione inizialmente
                    return acc;
                }, {})
            });
        }
    }

// Aggiungi un appuntamento nel MockDB
addAppointment(parrucchiereUsername, appointment) {
    if (!this.appointments[parrucchiereUsername]) {
        this.appointments[parrucchiereUsername] = []; // Crea un array vuoto se non esiste
    }
    this.appointments[parrucchiereUsername].push(appointment);
    console.log(`Appuntamento aggiunto per ${parrucchiereUsername}`);
}

// Prenota uno slot per un parrucchiere
prenotaSlot(username, giorno, ora, descrizione, utente) {
    const calendario = this.getCalendario(username);
    const slotPrenotato = calendario.find(item => item.giorno === giorno && item.slot === ora && item.prenotazioni[ora] === null);

    if (slotPrenotato) {
        slotPrenotato.prenotazioni[ora] = utente.username; // Aggiungi la prenotazione
        // Aggiungi l'appuntamento alla lista degli appuntamenti
        this.addAppointment(username, {
            id: Date.now(), // Usa un ID unico per l'appuntamento
            giorno: giorno,
            ora: ora,
            descrizione: descrizione,
            utente: utente.username
        });
        return true;
    }

    return false; // Slot già prenotato
}
getAllUsers() {
    return this.users;
}

    // Recupera un utente per username
    getUserByUsername(username) {
        return this.users.find(user => user.username === username);
    }

    // Aggiungi un nuovo utente
    addUser(user) {
        const newId = this.users.length ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
        this.users.push({ id: newId, ...user });
    }

    // Recupera tutti i parrucchieri
    getAllParrucchieri() {
        return this.users.filter(user => user.ruolo === 'parrucchiere');
    }

    // Elimina un utente per ID
    deleteUserById(id) {
        this.users = this.users.filter(user => user.id !== id);
    }

    // Ottieni tutti gli appuntamenti di un parrucchiere (per giorno)
    getAppuntamenti(username) {
        const calendario = this.getCalendario(username);
        return calendario;
    }
    addUser(user) {
        this.users.push(user);
        if (user.ruolo === 'parrucchiere') {
            this.appointments[user.username] = []; // Ogni parrucchiere inizia con zero appuntamenti
        }
    }

    getUserByUsername(username) {
        return this.users.find(user => user.username === username);
    }


    getAppointments(parrucchiereUsername) {
        return this.appointments[parrucchiereUsername] || [];
    }

    deleteAppointment(parrucchiereUsername, appointmentId) {
        if (this.appointments[parrucchiereUsername]) {
            this.appointments[parrucchiereUsername] = this.appointments[parrucchiereUsername].filter(app => app.id !== appointmentId);
        }
    }
}

module.exports = MockDB;
