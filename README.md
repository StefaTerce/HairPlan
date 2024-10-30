# HairPlan

**Descrizione**

HairPlan è un'applicazione progettata per la gestione delle prenotazioni nei saloni di parrucchiere. La piattaforma consente ai clienti di prenotare appuntamenti, visualizzare i servizi disponibili e ai saloni di organizzare e gestire i propri calendari. L'obiettivo di HairPlan è migliorare l'efficienza nella gestione delle prenotazioni per i saloni e semplificare l'esperienza di prenotazione per i clienti.

**Target**

Clienti che desiderano prenotare servizi presso i saloni di parrucchiere
Saloni di parrucchiere che cercano una soluzione per gestire in modo efficace le proprie prenotazioni
Problema
HairPlan risolve le problematiche legate alla gestione delle prenotazioni nei saloni, minimizzando sovrapposizioni e facilitando la prenotazione per i clienti.

**Competitor**

SimplyBook.me
Calendly
Acuity Scheduling
Book Like a Boss
Picktime
Doodle
Goldie

**Requisiti di Dominio**

1.1. Conoscenze Specifiche
Servizi Offerti: Conoscenza dei servizi disponibili e gestione delle fasce orarie di disponibilità per ciascun servizio.
Gestione delle Fasce Orarie: Definizione e organizzazione delle disponibilità giornaliere e settimanali del salone, inclusi eventuali blocchi per orari specifici.
Politiche di Cancellazione: Regole chiare per la cancellazione delle prenotazioni, gestite in modo da rispettare le esigenze dei saloni e dei clienti.

1.2. Interazione Cliente-Parrucchiere
Comunicazione: Il sistema facilita la comunicazione tra cliente e parrucchiere per richieste di modifica o chiarimenti sugli appuntamenti.

**Requisiti Funzionali**

2.1. Prenotazione Online
Descrizione: Permette ai clienti di prenotare appuntamenti selezionando data, ora e tipo di servizio.
Tipo: Funzionale

2.2. Gestione del Calendario
Descrizione: I parrucchieri possono creare, modificare e monitorare il proprio calendario delle prenotazioni.
Tipo: Funzionale

2.3. Autenticazione e Recupero Account
Descrizione: Gli utenti possono registrarsi, effettuare il login, recuperare la password e verificare l’indirizzo email.
Tipo: Funzionale

2.4. Notifiche
Descrizione: Invio di notifiche via email o SMS per conferme di appuntamenti, modifiche e annullamenti.
Tipo: Funzionale

2.5. Gestione delle Prenotazioni
Descrizione: Possibilità per i parrucchieri di confermare, rifiutare o annullare prenotazioni.
Tipo: Funzionale

2.6. Messaggistica Interna
Descrizione: Consente la comunicazione diretta tra clienti e parrucchieri per richieste di modifica o dettagli sull’appuntamento.
Tipo: Funzionale

**Requisiti Non Funzionali**
   
3.1. Sicurezza
Descrizione: Utilizzo di HTTPS e crittografia per proteggere i dati personali e le transazioni.
Tipo: Non Funzionale

3.2. Design Responsive
Descrizione: L’interfaccia è ottimizzata per l’uso su desktop e dispositivi mobili.
Tipo: Non Funzionale

3.3. Prestazioni e Scalabilità
Descrizione: Il sistema è progettato per offrire tempi di risposta rapidi e supportare un numero crescente di utenti senza perdita di prestazioni.
Tipo: Non Funzionale

3.4. Accessibilità
Descrizione: L’interfaccia è sviluppata tenendo conto delle linee guida per l’accessibilità, rendendola usabile anche per utenti con disabilità.
Tipo: Non Funzionale

  ![image](https://github.com/user-attachments/assets/03ee1aef-464b-4095-89f7-3ba45184c765)


**è Possibile registrarsi?**

Request

{
  "username":"Terceros",
  "email":"email@email.com",
  "age":"18",
  "pass":"password",
}

Response

{
  "username":"Terceros",
  "status": "Registered In",
}

**In Caso di errore per eta**

Request

{
  "username": "Terceros",
  "email": "email@email.com",
  "age": "12",
  "pass": "password"
}

Response (in caso di errore)

{
  "message": "L'età deve essere almeno 13 anni."
}



**è Possibile fare il login?**

Request

{
  "username":"Terceros",
  "pass":"password",
}

Response

{
  "username":"Terceros",
  "status": "Logged In",
}

Response (in caso di errore)

{
  "message": "Credenziali non valide."
}


**è possibile prenotare**

Request

{
  "username": "Terceros",
  "date": "2024-09-30",
  "time": "15:00"
}

Response

{
  "username": "Terceros",
  "status": "Prenotazione completata",
  "date": "2024-09-30",
  "time": "15:00"
}

Response (in caso di errore)

{
  "message": "Data o ora non disponibili."
}


**È possibile annullare la prenotazione?**


Request

{
  "username": "Terceros",
  "date": "2024-09-30",
  "time": "15:00"
}

Response

{
  "username": "Terceros",
  "status": "Prenotazione annullata",
  "date": "2024-09-30",
  "time": "15:00"
}

Response (in caso di errore)

{
  "message": "Nessuna prenotazione trovata per la data e ora specificate."
}



