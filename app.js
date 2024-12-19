const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const mock = require('./DBMock.js'); // Assicurati che DBMock.js esista e contenga la logica del database mock
const db = new mock(); // Istanzia il database mock
const hbs = require('hbs');
const http = require('http');
const axios = require('axios');
const socketIo = require('socket.io');
require('dotenv').config();

// Ora puoi accedere alla tua chiave API tramite process.env
const NEWS_API_KEY = process.env.NEWS_API_KEY;

hbs.registerHelper('and', function (a, b) {
    return a && b;
});


// Registra il helper per ottenere la prima lettera di una stringa
hbs.registerHelper('firstLetter', function (name) {
    return name ? name.charAt(0).toUpperCase() : '';  // Restituisce la prima lettera in maiuscolo
});
hbs.registerHelper('eq', function (a, b) {
    return a === b;
});
// Helper per verificare se uno slot è disponibile
hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});


// Crea l'app Express usando sessione
const app = express();
app.use(session({ secret: 'ssshhhhh', resave: false, saveUninitialized: true }));

// Middleware per il body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Impostazione del motore di rendering Handlebars (hbs)
app.set('view engine', 'hbs');
app.use(express.static('public'));

// Impostazione della cartella public per i file statici
app.use('/static', express.static(path.join(__dirname, 'public')));


// Funzione middleware per la protezione delle rotte in base al ruolo
function checkRole(role) {
    return (req, res, next) => {
        if (req.session.loggedin && req.session.role === role) {
            return next();
        }
        res.redirect('/login');
    };
}
const server = http.createServer(app);
const io = socketIo(server); // Inizializza Socket.io

// Fai una richiesta per ottenere le notizie
async function getFashionNews() {
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: 'fashion',
                apiKey: NEWS_API_KEY,
                language: 'it',
                pageSize: 5,
            }
        });
        return response.data.articles;
    } catch (error) {
        console.error('Errore nel recupero delle notizie:', error);
        return [];
    }
}
// Setup per inviare le notizie ogni 10 minuti
setInterval(async () => {
    const news = await getFashionNews();
    io.emit('news-update', news); // Invia le notizie a tutti i client connessi
}, 10 * 60 * 1000); // Ogni 10 minuti (600,000 ms)

// Route Login Page
app.get('/login', async (req, res) => {
    // Se l'utente è già loggato, reindirizza in base al ruolo
    if (req.session.loggedin) {
        if (req.session.role === 'admin') {
            return res.redirect('/admin/home');
        } else if (req.session.role === 'parrucchiere') {
            return res.redirect('/parrucchiere/home');
        } else if (req.session.role === 'utente') {
            return res.redirect('/utente/home');
        }
    }
    // Ottieni le notizie iniziali
    const news = await getFashionNews();
    req.session.news = news;
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// La connessione socket.io deve essere configurata in questo modo
io.on('connection', (socket) => {
    console.log('Un client si è connesso');
    
    // Quando il client si connette, invia un messaggio
    socket.emit('news-update', ['Notizia 1', 'Notizia 2']);
    
    // Gestisci la disconnessione
    socket.on('disconnect', () => {
        console.log('Un client si è disconnesso');
    });
});

//#region Swagger
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Definisci la configurazione di base per Swagger
const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title: 'HairPlan API',
            version: '1.0.0',
            description: 'API per la gestione di prenotazioni per parrucchieri',
        },
        basePath: '/',
    },
    apis: ['./app.js'], // Specifica il percorso ai file che contengono la documentazione
};

// Crea la documentazione Swagger
const swaggerDocs = swaggerJSDoc(swaggerOptions);

// Usa Swagger UI per visualizzare la documentazione
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

//#endregion

// Route Login Page
app.get('/register', (req, res) => {
    if (req.session.loggedin) {
        if (req.session.role === 'admin') {
            return res.redirect('/admin/home');
        } else if (req.session.role === 'parrucchiere') {
            return res.redirect('/parrucchiere/home');
        } else if (req.session.role === 'utente') {
            return res.redirect('/utente/home');
        }
    }
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
// Login POST (gestione dell'autenticazione dell'utente)
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const user = db.getUserByUsername(username);

    if (!user || user.password !== password) {
        return res.redirect('/login/error');
    }

    req.session.loggedin = true;
    req.session.name = user.nome;
    req.session.role = user.ruolo;

    if (user.ruolo === 'admin') {
        return res.redirect('/admin/home');
    } else if (user.ruolo === 'parrucchiere') {
        return res.redirect('/parrucchiere/home');
    } else if (user.ruolo === 'utente') {
        return res.redirect('/utente/home');
    }
});
// Rotta per la pagina di errore
app.get('/ajax', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ajaxpage.html'));
});
// Rotta per la pagina di errore
app.get('/login/error', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login_error.html'));
});


// Registrazione Utente
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.post('/register', (req, res) => {
    const { username, email, age, password, nome } = req.body;

    // Verifica se l'utente esiste già
    const existingUser = db.getUserByUsername(username);
    if (existingUser) {
        return res.render('error', { message: 'Username già in uso, scegli un altro.' });
    }

    // Aggiungi l'utente al mock database con il ruolo 'utente'
    db.addUser({ username, email, age, password, nome, ruolo: 'utente' });

    // Imposta la sessione per il login automatico
    req.session.loggedin = true;
    req.session.name = nome;
    req.session.role = 'utente';

    // Redirige direttamente alla pagina home dell'utente
    res.redirect('/utente/home');
});

// Route Home per Parrucchiere
app.get('/parrucchiere/home', checkRole('parrucchiere'), (req, res) => {
    res.render('parrucchiere/home', {
        name: req.session.name,
        role: req.session.role,
        message: `Benvenuto, ${req.session.name}!`
    });
});


// Route Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/home');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// Visualizza la home dell'admin con la gestione parrucchieri
app.get('/admin/home', checkRole('admin'), (req, res) => {
    // Ottieni tutti i parrucchieri
    const parrucchieri = db.getAllParrucchieri();

    // Passa i dati alla vista
    res.render('admin/home', {
        name: req.session.name,
        role: req.session.role,
        message: `Benvenuto, ${req.session.name}!`,
        parrucchieri // Passa la lista dei parrucchieri
    });
});

// Aggiungi un nuovo parrucchiere
app.post('/admin/parrucchieri/add', (req, res) => {
    if (req.session.role !== 'admin') {
        return res.redirect('/login');
    }

    const { username, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti, password } = req.body;

    // Aggiungi il nuovo parrucchiere
    db.addUser({
        username,
        nome,
        cognome,
        email,
        telefono,
        nome_salone,
        indirizzo,
        servizi_offerti,
        password,
        ruolo: 'parrucchiere',
    });

    res.redirect('/admin/home');
});

// Rimuovi un parrucchiere
app.post('/admin/parrucchieri/delete', (req, res) => {
    if (req.session.role !== 'admin') {
        return res.redirect('/login');
    }

    const { username } = req.body;
    db.deleteUserByUsername(username);

    res.redirect('/admin/home');
});


// Route Home per Parrucchiere
app.get('/parrucchiere/home', checkRole('parrucchiere'), (req, res) => {
    res.render('parrucchiere/home', {
        name: req.session.name,
        role: req.session.role,
        message: `Benvenuto, ${req.session.name}!`
    });
});

app.get('/utente/home', checkRole('utente'), (req, res) => {
    const parrucchieri = db.getAllParrucchieri();
    res.render('utente/home', {
        name: req.session.name,
        username: req.session.username,  // Assicurati che il 'username' sia presente nel sessione
        role: req.session.role,
        message: `Benvenuto, ${req.session.name}!`,
        parrucchieri: parrucchieri.map(parrucchiere => ({
            username: parrucchiere.username,
            nome_salone: parrucchiere.nome_salone,
            indirizzo: parrucchiere.indirizzo,
            telefono: parrucchiere.telefono,
            servizi: parrucchiere.servizi_offerti
        }))
    });
});

// Route per altre pagine protette
app.get('/otherPage', (req, res) => {
    if (!req.session.loggedin) {
        return res.redirect('/login');
    }
    // Logica per altre pagine protette...
    res.render('otherPage');
});


app.get('/utente/calendario/:username', (req, res) => {
    const username = req.params.username;

    // Simulazione di appuntamenti (questi dati dovrebbero provenire dal database)
    const appuntamenti = [
        { giorno: 'Lunedì', ora: '10:00', utente: 'Mario Rossi', descrizione: 'Taglio capelli' },
        { giorno: 'Mercoledì', ora: '15:00', utente: 'Luigi Bianchi', descrizione: 'Colore capelli' },
    ];

    // Render della vista calendario
    res.render('calendari/calendario-settimana', {
        username,
        settimana: '18-24 dicembre 2024', // Puoi calcolare la settimana dinamicamente
        giorni: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
        ore: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',],
        appuntamenti
    });
});

app.post('/parrucchiere/:username/appuntamento', (req, res) => {
    const { username } = req.params;
    const { giorno, ora, descrizione, cliente } = req.body;

    // Crea un nuovo appuntamento
    const nuovoAppuntamento = {
        id: Date.now(), // Genera un ID unico
        giorno,
        ora,
        descrizione,
        cliente
    };

    // Aggiungi l'appuntamento per il parrucchiere specifico
    db.addAppointment(username, nuovoAppuntamento);

    res.json({ success: true, message: 'Appuntamento aggiunto con successo!' });
});
app.get('/parrucchiere/:username/appuntamenti', (req, res) => {
    const { username } = req.params;

    // Ottieni gli appuntamenti per il parrucchiere specifico
    const appuntamenti = db.getAppointments(username);

    res.render('calendari/calendario-settimana', {
        username,
        appuntamenti,
        settimana: '18-24 dicembre 2024', // Calcola dinamicamente
        giorni: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
        ore: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',]
    });
});
app.delete('/parrucchiere/:username/appuntamento/:id', (req, res) => {
    const { username, id } = req.params;

    db.deleteAppointment(username, parseInt(id));

    res.json({ success: true, message: 'Appuntamento eliminato con successo!' });
});

// Endpoint per ottenere tutti i parrucchieri
app.get('/api/parrucchieri', (req, res) => {
    const parrucchieri = db.getAllParrucchieri(); // Ottieni solo i parrucchieri dal database
    res.json(parrucchieri);
});

// Endpoint per ottenere la lista dei parrucchieri filtrata per i servizi offerti
app.get('/api/parrucchieri/filtrati', (req, res) => {
    const serviziRicercati = req.query.servizi; // Servizi passati nella query, separati da virgola
    if (!serviziRicercati) {
        return res.status(400).json({ error: 'Servizi non specificati' });
    }

    const serviziArray = serviziRicercati.split(',');  // Converte la stringa dei servizi in un array

    const parrucchieriFiltrati = db.getAllParrucchieri().filter(parrucchiere => {
        // Controlla se i servizi offerti dal parrucchiere contengono tutti i servizi richiesti
        const serviziOfferti = parrucchiere.servizi_offerti.split(',');  // Servizi offerti separati da virgola
        return serviziArray.every(servizio => serviziOfferti.includes(servizio.trim()));
    });

    res.json(parrucchieriFiltrati);
});



/**
 * @swagger
 * /login:
 *   post:
 *     description: Autentica un utente.
 *     parameters:
 *       - in: body
 *         name: user
 *         description: Le credenziali dell'utente.
 *         schema:
 *           type: object
 *           required:
 *             - username
 *             - password
 *           properties:
 *             username:
 *               type: string
 *             password:
 *               type: string
 *     responses:
 *       200:
 *         description: Autenticazione avvenuta con successo
 *       401:
 *         description: Credenziali non valide
 */
/**
 * @swagger
 * /register:
 *   post:
 *     description: Registrazione di un nuovo utente.
 *     parameters:
 *       - in: body
 *         name: user
 *         description: Dati dell'utente da registrare.
 *         schema:
 *           type: object
 *           required:
 *             - username
 *             - password
 *             - email
 *             - nome
 *             - cognome
 *           properties:
 *             username:
 *               type: string
 *               description: Nome utente univoco.
 *             password:
 *               type: string
 *               description: Password dell'utente.
 *             email:
 *               type: string
 *               description: Email dell'utente.
 *             nome:
 *               type: string
 *               description: Nome dell'utente.
 *             cognome:
 *               type: string
 *               description: Cognome dell'utente.
 *     responses:
 *       201:
 *         description: Registrazione avvenuta con successo.
 *       400:
 *         description: Dati non validi o errore nella registrazione.
 */

/**
 * @swagger
 * /admin/home:
 *   get:
 *     description: Pagina home per l'amministratore, mostra i parrucchieri.
 *     responses:
 *       200:
 *         description: Elenco dei parrucchieri.
 *         schema:
 *           type: object
 *           properties:
 *             parrucchieri:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                   nome:
 *                     type: string
 *                   cognome:
 *                     type: string
 *                   email:
 *                     type: string
 *       404:
 *         description: Nessun parrucchiere trovato.
 */

/**
 * @swagger
 * /admin/parrucchieri/add:
 *   post:
 *     description: Aggiungi un nuovo parrucchiere.
 *     parameters:
 *       - in: body
 *         name: parrucchiere
 *         description: Dati del parrucchiere da aggiungere.
 *         schema:
 *           type: object
 *           required:
 *             - username
 *             - password
 *             - email
 *             - nome
 *             - cognome
 *           properties:
 *             username:
 *               type: string
 *               description: Nome utente univoco del parrucchiere.
 *             password:
 *               type: string
 *               description: Password del parrucchiere.
 *             email:
 *               type: string
 *               description: Email del parrucchiere.
 *             nome:
 *               type: string
 *               description: Nome del parrucchiere.
 *             cognome:
 *               type: string
 *               description: Cognome del parrucchiere.
 *     responses:
 *       201:
 *         description: Parrucchiere aggiunto con successo.
 *       400:
 *         description: Dati non validi o errore nell'aggiungere il parrucchiere.
 */

/**
 * @swagger
 * /parrucchiere/{username}/appuntamenti:
 *   get:
 *     description: Visualizza gli appuntamenti del parrucchiere.
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         description: Nome utente del parrucchiere.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Elenco degli appuntamenti del parrucchiere.
 *         schema:
 *           type: object
 *           properties:
 *             appuntamenti:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   data:
 *                     type: string
 *                     example: "2024-12-19"
 *                   orario:
 *                     type: string
 *                     example: "10:00"
 *                   cliente:
 *                     type: string
 *                     example: "Luca Verdi"
 *                   servizio:
 *                     type: string
 *                     example: "Taglio"
 *       404:
 *         description: Nessun appuntamento trovato per il parrucchiere.
 */


// Start del server
const port = 3000;
app.listen(port, () => console.log(`Server started on port ${port}`));
