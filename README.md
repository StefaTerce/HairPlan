# HairPlan

## Descrizione

HairPlan è un'applicazione per la gestione delle prenotazioni nei saloni di parrucchiere. La piattaforma consente ai clienti di prenotare appuntamenti e ai saloni di organizzare il proprio calendario, migliorando l'efficienza e semplificando l'esperienza di prenotazione.

## Tag Line

Il modo più semplice per gestire le tue prenotazioni in salone.

## Target

- Clienti che desiderano prenotare servizi presso saloni di parrucchiere.
- Saloni di parrucchiere che cercano una soluzione efficace per la gestione delle prenotazioni.

## Problema

HairPlan risolve le problematiche legate alla gestione e organizzazione delle prenotazioni, minimizzando sovrapposizioni e facilitando il processo sia per i clienti che per i saloni.

## Competitor

- SimplyBook.me  
- Calendly  
- Book Like a Boss  
- Picktime  
- Doodle

## Requisiti Iniziali

### Creazione di Profilo

- **Cliente:** Nome, cognome, email e numero di telefono.
- **Parrucchiere:** Nome, cognome, email, numero di telefono, nome del salone, indirizzo e servizi offerti.

## Funzionalità API Principali

- **Autenticazione:**  
  - `POST /login` – Login (imposta in sessione `username`, `name` e `role`).
  - `POST /register` – Registrazione di un nuovo utente (ruolo predefinito `utente`).
  - `GET /logout` – Logout.

- **Gestione Utenti:**  
  - `GET /api/parrucchieri` – Elenco di tutti i parrucchieri.
  - `GET /api/parrucchieri/filtrati` – Elenco dei parrucchieri filtrati per servizi.

- **Calendario e Prenotazioni:**  
  - `GET /utente/calendario/:parrucchiere` – Visualizza il calendario settimanale per un parrucchiere; consente la navigazione tra settimane.
  - `POST /utente/calendario/:parrucchiere/appuntamento` – Prenotazione di uno slot nel calendario (invia data, ora e descrizione).
  - `DELETE /utente/calendario/:parrucchiere/appuntamento/:id` – Cancellazione di una prenotazione (solo se l'utente è il proprietario).

- **Real Time Updates (Socket.io):**  
  L'applicazione utilizza Socket.io per aggiornare il calendario in tempo reale quando vengono aggiunti o cancellati appuntamenti.

## Setup e Configurazione
### Configurazione di DOCKER

 Requisiti
1. Installa **Docker** (Docker Desktop o Docker Engine) funzionante https://www.docker.com/products/docker-desktop/.

L'immagine ufficiale è ospitata su Docker Hub:
- **Docker Hub Username:** terceros https://hub.docker.com/r/terceros/hairplan
- **Immagine:** `terceros/hairplan:latest`

Per scaricare ed eseguire l'immagine, segui questi passaggi:

1. Scarica l'immagine:
   ```bash
   docker pull terceros/hairplan:latest
   ```

2. Avvia il container (sostituisci i valori delle chiavi API è NECESSARIO):
   ```bash
   docker run -d -p 3000:3000 --name hairplan_container -e GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID -e GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET -e NEWS_API_KEY=YOUR_NEWS_API_KEY terceros/hairplan:latest
   ```
3. Accedi all'applicazione su:
   ```bash
   http://localhost:3000
   ```

## Utenti Preimpostati per il Test

Per facilitare il testing e i login, il database è preconfigurato con i seguenti utenti:

- **Admin**  
  - **Username:** `admin`  
  - **Password:** `admin123`

- **Parrucchiere**  
  - **Username:** `parrucchiere`  
  - **Password:** `parrucchiere123`

- **Utente**  
  - **Username:** `utente`  
  - **Password:** `utente123`

Questi utenti vengono creati automaticamente nel database al momento dell'inizializzazione (vedi il file `db.js`).


## Struttura del Progetto

- **app.js:** File principale che configura Express, le sessioni, le rotte e integra Socket.io.
- **SQLiteDB.js:** Modulo per l'interazione con il database SQLite (gestisce utenti, calendari e appuntamenti).
- **db.js:** Gestisce la connessione a SQLite, creando automaticamente il database e le tabelle se non esistono.
- **/public:** Contiene file statici (CSS, immagini, JS lato client).
- **/views:** Contiene i template Handlebars per le varie pagine (login, home, calendario, ecc.).

## Istruzioni per Contribuire

1. Forka il repository e clona il tuo fork:
   ```bash
   git clone https://github.com/tuo-username/HairPlan.git
   ```
2. Crea un branch per la tua feature:
   ```bash
   git checkout -b feature/nuova-funzionalita
   ```
3. Effettua le modifiche e committa:
   ```bash
   git commit -am "Descrizione della funzionalità aggiunta"
   ```
4. Pusha il branch:
   ```bash
   git push origin feature/nuova-funzionalita
   ```
5. Apri una Pull Request su GitHub.

![image](https://github.com/user-attachments/assets/633bd888-184d-41fe-a3e4-a8ec84c2789b)



