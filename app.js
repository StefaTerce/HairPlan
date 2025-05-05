const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const hbs = require('hbs');
require('dotenv').config();

// Importa il modulo SQLiteDB che gestisce il database
const SQLiteDB = require('./SQLiteDB.js'); // ASSICURATI CHE QUESTO FILE ESISTA E SIA CORRETTO
const db = new SQLiteDB();

//#region Hbs Helpers
hbs.registerHelper('and', function (a, b) {
    return a && b;
});
hbs.registerHelper('firstLetter', function (name) {
    return name ? name.charAt(0).toUpperCase() : '';
});
hbs.registerHelper('eq', function (a, b) {
    return a === b;
});
hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});
hbs.registerHelper('json', function(context) {
    // Controlla se il contesto è undefined o null prima di stringify
    return JSON.stringify(context || null);
});
hbs.registerHelper('formatDate', function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00'); // Aggiunge T00:00:00 per evitare problemi di timezone
    if (isNaN(date.getTime())) return dateString;
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('it-IT', options);
});
//#endregion

// Crea l'app Express
const app = express();
app.use(session({ secret: 'ssshhhhh', resave: false, saveUninitialized: true }));

// Middleware per il body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Impostazione del motore di rendering Handlebars (hbs)
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views')); // Specifica la cartella delle viste

// Impostazione della cartella public per i file statici
app.use('/static', express.static(path.join(__dirname, 'public')));

//#region Google OAuth (facoltativo)
const passport = require('passport');
try {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback" // Usa variabile d'ambiente o default
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails && profile.emails[0].value;
            if (!email) {
                return done(new Error("Email non fornita da Google."), null);
            }
            let user = await db.getUserByUsername(email); // Usa email come username
            if (!user) {
                // Crea nuovo utente se non esiste
                console.log(`Creazione nuovo utente Google: ${email}`);
                await db.addUser({
                    username: email,
                    password: 'GOOGLE_AUTH_USER', // Password fittizia, l'accesso è via Google
                    ruolo: 'utente',
                    nome: profile.displayName || 'Utente Google',
                    email: email
                    // Altri campi opzionali impostati a null/default
                });
                user = await db.getUserByUsername(email); // Ricarica utente appena creato
            }
            return done(null, user); // Passa l'utente del DB
        } catch (err) {
            return done(err, null);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.username); // Salva solo lo username in sessione
    });

    passport.deserializeUser(async (username, done) => {
        try {
            const user = await db.getUserByUsername(username); // Recupera utente dal DB
            done(null, user); // user sarà null se non trovato
        } catch (err) {
            done(err, null);
        }
    });

    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/auth/google',
        passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    app.get('/auth/google/callback', passport.authenticate('google', {
        failureRedirect: '/login/error?reason=google_failed',
        failureMessage: true // Abilita messaggi di errore in sessione
    }), (req, res) => {
        // Imposta la sessione manualmente dopo l'autenticazione Passport
        req.session.loggedin = true;
        req.session.username = req.user.username; // req.user viene da deserializeUser
        req.session.name = req.user.nome;
        req.session.role = req.user.ruolo;
        console.log(`Login Google riuscito per ${req.user.username}, ruolo: ${req.user.ruolo}`);
        // Reindirizza in base al ruolo
        if (req.user.ruolo === 'admin') return res.redirect('/admin/home');
        else if (req.user.ruolo === 'parrucchiere') return res.redirect('/parrucchiere/appuntamenti');
        else return res.redirect('/utente/home'); // Default per 'utente' o altri ruoli
    });

} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        console.warn("Modulo 'passport-google-oauth20' non trovato. L'autenticazione Google è disabilitata.");
    } else {
        console.error("Errore durante l'inizializzazione di Passport/Google Strategy:", error);
    }
    // Definisci rotte placeholder se passport non è caricato
    app.get('/auth/google', (req, res) => res.status(501).send("Autenticazione Google non configurata."));
    app.get('/auth/google/callback', (req, res) => res.status(501).send("Autenticazione Google non configurata."));
}
//#endregion

// Funzione middleware per la protezione delle rotte in base al ruolo
function checkRole(role) {
    return (req, res, next) => {
        // Verifica se l'utente è autenticato tramite sessione standard o Passport
        const isAuthenticated = req.session.loggedin || (req.isAuthenticated && req.isAuthenticated());
        const userRole = req.session.role || (req.user && req.user.ruolo);

        if (isAuthenticated && userRole === role) {
            return next();
        }
        console.warn(`Accesso non autorizzato a rotta ${role}. Utente loggato: ${isAuthenticated}, Ruolo: ${userRole}`);
        // Se non loggato o ruolo errato, reindirizza al login
        res.redirect('/login');
    };
}

//#region Swagger (opzionale)
try {
    const swaggerJSDoc = require('swagger-jsdoc');
    const swaggerUi = require('swagger-ui-express');
    require.resolve('./swagger.js'); // Controlla se il file esiste

    const swaggerOptions = {
        swaggerDefinition: {
            info: {
                title: 'HairPlan API',
                version: '1.0.0',
                description: 'API per la gestione di prenotazioni per parrucchieri',
            },
            basePath: '/',
        },
        apis: ['./swagger.js'], // Assicurati che questo file esista
    };
    const swaggerDocs = swaggerJSDoc(swaggerOptions);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
    console.log("Swagger UI disponibile su /api-docs");
} catch (e) {
    console.warn("swagger.js non trovato o moduli Swagger non installati. API docs disabilitate.");
    app.get('/api-docs', (req, res) => res.status(501).send("Documentazione API (Swagger) non disponibile."));
}
//#endregion

// Crea il server HTTP e integra Socket.io
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let visitorCount = 0; // Contatore visitatori (opzionale)

io.on('connection', (socket) => {
    visitorCount++;
    console.log(`SOCKET.IO: Nuovo client connesso: ${socket.id}. Totale: ${visitorCount}`);
    socket.emit('visitorCount', visitorCount);
    socket.broadcast.emit('visitorCount', visitorCount);

    socket.on('disconnect', () => {
        visitorCount--;
        console.log(`SOCKET.IO: Client disconnesso: ${socket.id}. Totale: ${visitorCount}`);
        io.emit('visitorCount', visitorCount);
    });
});

// --- Rotte di autenticazione, login, registrazione, logout ---

// Rotta per le notizie (assicurati che NEWS_API_KEY sia nel tuo .env)
app.get('/news', async (req, res) => {
    if (!process.env.NEWS_API_KEY) {
        console.warn("NEWS_API_KEY non trovato in .env. Servizio notizie disabilitato.");
        return res.status(503).json({ error: 'Servizio notizie temporaneamente non disponibile.' });
    }
    try {
      const axios = require('axios'); // Importa axios solo se serve
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: 'acconciature OR capelli OR hairstyle OR moda capelli', // Query
          language: 'it',
          sortBy: 'publishedAt', // Ordina per data di pubblicazione
          pageSize: 5, // Numero di notizie
          apiKey: process.env.NEWS_API_KEY
        }
      });
      res.json(response.data.articles || []); // Restituisce array vuoto se non ci sono articoli
    } catch (error) {
      console.error('Errore nel recupero delle notizie da NewsAPI:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Errore nel recupero delle notizie' });
    }
});

// Rotta per ottenere dati di sessione (utile per debug frontend)
app.get('/session', (req, res) => {
    // Rimuovi dati sensibili se necessario prima di inviare
    const sessionData = { ...req.session };
    if (sessionData.cookie) {
        delete sessionData.cookie; // Non inviare il cookie
    }
    res.json(sessionData);
});

// Rotta GET per la pagina di login
app.get('/login', (req, res) => {
    const isAuthenticated = req.session.loggedin || (req.isAuthenticated && req.isAuthenticated());
    if (isAuthenticated) {
        const userRole = req.session.role || (req.user && req.user.ruolo);
        if (userRole === 'admin') return res.redirect('/admin/home');
        else if (userRole === 'parrucchiere') return res.redirect('/parrucchiere/appuntamenti');
        else if (userRole === 'utente') return res.redirect('/utente/home');
        else return res.redirect('/'); // Fallback generico
    }
    // Mostra la pagina di login se non loggato
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rotta radice (/) - si comporta come /login o dashboard
app.get('/', (req, res) => {
    const isAuthenticated = req.session.loggedin || (req.isAuthenticated && req.isAuthenticated());
    if (isAuthenticated) {
        const userRole = req.session.role || (req.user && req.user.ruolo);
        if (userRole === 'admin') return res.redirect('/admin/home');
        else if (userRole === 'parrucchiere') return res.redirect('/parrucchiere/appuntamenti');
        else if (userRole === 'utente') return res.redirect('/utente/home');
        else {
             console.warn("Utente loggato senza ruolo definito reindirizzato a /login");
             return res.redirect('/login'); // O una pagina di errore/selezione ruolo
        }
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rotta per mostrare errore di login (passa messaggio alla vista error.hbs)
app.get('/login/error', (req, res) => {
    const reason = req.query.reason;
    let message = 'Errore di login sconosciuto.';
    if (reason === 'missing_credentials') message = 'Username e password sono obbligatori.';
    else if (reason === 'invalid_credentials') message = 'Username o password non validi.';
    else if (reason === 'server_error') message = 'Errore interno del server durante il login.';
    else if (reason === 'google_failed') message = 'Autenticazione Google fallita o annullata.';
    res.status(401).render('error', { message: message }); // Usa la vista error.hbs
});

// Rotta POST per gestire il tentativo di login (NON Google)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.redirect('/login/error?reason=missing_credentials');
    }
    try {
        const user = await db.getUserByUsername(username);

        // Verifica utente e password (ASSUMENDO password in chiaro - NON SICURO!)
        // In produzione, usare bcrypt.compare(password, user.password)
        if (!user || user.password !== password || user.password === 'GOOGLE_AUTH_USER') { // Impedisci login standard per utenti Google
             console.warn(`Tentativo di login fallito per ${username}`);
             return res.redirect('/login/error?reason=invalid_credentials');
        }
        // Login standard riuscito, imposta la sessione
        req.session.loggedin = true;
        req.session.name = user.nome;
        req.session.username = user.username;
        req.session.role = user.ruolo;
        console.log(`Login standard riuscito per ${username}, ruolo: ${user.ruolo}`);

        // Reindirizza in base al ruolo
        if (user.ruolo === 'admin') return res.redirect('/admin/home');
        else if (user.ruolo === 'parrucchiere') return res.redirect('/parrucchiere/appuntamenti');
        else if (user.ruolo === 'utente') return res.redirect('/utente/home');
        else {
             console.warn(`Utente ${username} loggato con ruolo sconosciuto: ${user.ruolo}`);
             return res.redirect('/'); // Fallback
        }
    } catch (error) {
        console.error(`Errore grave nel POST /login per ${username}:`, error);
        res.redirect('/login/error?reason=server_error');
    }
});

// Rotta GET per la pagina di registrazione
app.get('/register', (req, res) => {
    const isAuthenticated = req.session.loggedin || (req.isAuthenticated && req.isAuthenticated());
    if (isAuthenticated) {
        // Se già loggato, reindirizza alla sua home/dashboard
        const userRole = req.session.role || (req.user && req.user.ruolo);
        if (userRole === 'admin') return res.redirect('/admin/home');
        else if (userRole === 'parrucchiere') return res.redirect('/parrucchiere/appuntamenti');
        else if (userRole === 'utente') return res.redirect('/utente/home');
        else return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'register.html')); // Assicurati che esista
});

// Rotta POST per gestire la registrazione
app.post('/register', async (req, res) => {
    // Aggiunto 'cognome' se presente nel form
    const { username, email, age, password, nome, cognome } = req.body;
    // Validazione base
    if (!username || !email || !password || !nome) {
        return res.status(400).render('error', { message: 'Username, Email, Password e Nome sono obbligatori.' });
    }
    // Validazione email (semplice)
    if (!email.includes('@')) {
         return res.status(400).render('error', { message: 'Formato email non valido.' });
    }
    // Validazione password (esempio: lunghezza minima)
    if (password.length < 6) {
         return res.status(400).render('error', { message: 'La password deve essere lunga almeno 6 caratteri.' });
    }

    try {
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
            return res.status(409).render('error', { message: `Username '${username}' già in uso. Scegli un altro.` });
        }

        // In produzione, la password dovrebbe essere hashata qui (es. con bcrypt)
        // const hashedPassword = await bcrypt.hash(password, 10); // Esempio con bcrypt

        await db.addUser({
            username,
            email,
            age: age || null, // Gestisci età opzionale
            password, // Usa password in chiaro (o hashedPassword in produzione)
            nome,
            cognome: cognome || null, // Gestisci cognome opzionale
            ruolo: 'utente' // Ruolo di default
        });
        console.log(`Nuovo utente registrato: ${username}`);

        // Logga automaticamente l'utente dopo la registrazione
        req.session.loggedin = true;
        req.session.name = nome;
        req.session.username = username;
        req.session.role = 'utente';
        res.redirect('/utente/home'); // Reindirizza alla home utente

    } catch (error) {
        console.error(`Errore nella registrazione per ${username}:`, error);
        res.status(500).render('error', { message: 'Errore durante la registrazione. Riprova più tardi.' });
    }
});

// Rotta per il logout
app.get('/logout', (req, res, next) => { // Aggiunto next per gestione errori Passport
    // Gestisce sia logout standard che Passport
    req.logout(function(err) { // req.logout richiede un callback
        if (err) {
            console.error("Errore durante req.logout():", err);
            // Prova comunque a distruggere la sessione
        }
        req.session.destroy(destroyErr => {
            if (destroyErr) {
                console.error("Errore durante session.destroy():", destroyErr);
                // Invia un errore generico se la sessione non può essere distrutta
                return res.status(500).render('error', { message: 'Errore durante il logout.' });
            }
            res.clearCookie('connect.sid'); // Nome standard del cookie di sessione Express
            console.log("Utente sloggato con successo.");
            res.redirect('/login'); // Reindirizza sempre al login dopo logout/distruzione sessione
        });
    });
});


// --- Rotte per le home/dashboard in base al ruolo ---

// Home Admin
app.get('/admin/home', checkRole('admin'), async (req, res) => {
    try {
        const parrucchieri = await db.getAllParrucchieri();
        res.render('admin/home', { // Assicurati che esista views/admin/home.hbs
            layout: false, // Adatta se usi layout globali
            name: req.session.name || (req.user && req.user.nome), // Prendi nome da sessione o user passport
            role: req.session.role || (req.user && req.user.ruolo),
            parrucchieri: parrucchieri || []
        });
    } catch (error) {
        console.error('Errore nel GET /admin/home:', error);
        res.status(500).render('error', { message: 'Errore nel caricamento della dashboard admin.' });
    }
});

// Aggiunta Parrucchiere (da Admin)
app.post('/admin/parrucchieri/add', checkRole('admin'), async (req, res) => {
    const { username, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti, password } = req.body;
    if (!username || !nome || !password) {
         return res.status(400).render('error', { message: 'Username, nome e password sono obbligatori per aggiungere un parrucchiere.' });
    }
    if (password.length < 6) {
         return res.status(400).render('error', { message: 'La password per il parrucchiere deve essere lunga almeno 6 caratteri.' });
    }
    try {
        // In produzione, hashare la password
        // const hashedPassword = await bcrypt.hash(password, 10);
        await db.addUser({
            username, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti,
            password, // o hashedPassword
            ruolo: 'parrucchiere',
        });
        console.log(`Admin ha aggiunto parrucchiere: ${username}`);
        res.redirect('/admin/home');
    } catch (error) {
        console.error(`Errore nell'aggiunta parrucchiere ${username}:`, error);
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
             return res.status(409).render('error', { message: `Errore: Username '${username}' già esistente.` });
        }
        res.status(500).render('error', { message: 'Errore durante l\'aggiunta del parrucchiere.' });
    }
});

// Eliminazione Parrucchiere (da Admin)
app.post('/admin/parrucchieri/delete', checkRole('admin'), async (req, res) => {
    const { id } = req.body;
    if (!id || isNaN(parseInt(id))) { // Controlla che id sia un numero valido
        return res.status(400).render('error', { message: 'ID parrucchiere non valido o non fornito.' });
    }
    try {
        const deleted = await db.deleteUserById(parseInt(id));
        if (deleted) {
            console.log(`Admin ha eliminato parrucchiere con ID: ${id}`);
        } else {
             console.warn(`Admin ha tentato di eliminare parrucchiere con ID ${id}, ma non è stato trovato.`);
        }
        res.redirect('/admin/home');
    } catch (error) {
        console.error(`Errore nell'eliminazione parrucchiere ID ${id}:`, error);
        res.status(500).render('error', { message: 'Errore durante l\'eliminazione del parrucchiere.' });
    }
});

// Home Parrucchiere (Dashboard semplice)
app.get('/parrucchiere/home', checkRole('parrucchiere'), (req, res) => {
    // Potrebbe mostrare statistiche o link utili
    res.render('parrucchiere/home', { // Assicurati che esista views/parrucchiere/home.hbs
        layout: false,
        name: req.session.name || (req.user && req.user.nome),
        role: req.session.role || (req.user && req.user.ruolo),
        message: `Benvenuto nella tua Dashboard!`
    });
});

// Lista Appuntamenti Parrucchiere (Pagina Principale Parrucchiere)
app.get('/parrucchiere/appuntamenti', checkRole('parrucchiere'), async (req, res) => {
    const parrucchiereUsername = req.session.username || (req.user && req.user.username);
    if (!parrucchiereUsername) {
         console.error("Username parrucchiere non trovato in sessione per /parrucchiere/appuntamenti");
         return res.redirect('/login');
    }
    console.log(`--- Caricamento Lista Appuntamenti per Parrucchiere: ${parrucchiereUsername} ---`);
    try {
        let appuntamenti = await db.getAppointments(parrucchiereUsername);

        if (appuntamenti && appuntamenti.length > 0) {
            appuntamenti.sort((a, b) => {
                try {
                    const dateA = new Date(`${a.giorno}T${a.ora || '00:00'}:00`);
                    const dateB = new Date(`${b.giorno}T${b.ora || '00:00'}:00`);
                    if (isNaN(dateA.getTime())) return 1;
                    if (isNaN(dateB.getTime())) return -1;
                    return dateA - dateB; // Ordina dal più vicino al più lontano
                } catch (e) {
                     console.error("Errore parsing date per ordinamento:", a, b, e);
                     return 0;
                }
            });
        } else {
             appuntamenti = [];
        }
        console.log(`Recuperati ${appuntamenti.length} appuntamenti per ${parrucchiereUsername}`);

        res.render('parrucchiere/appuntamenti-lista', {
            layout: false,
            name: req.session.name || (req.user && req.user.nome),
            role: req.session.role || (req.user && req.user.ruolo),
            username: parrucchiereUsername, // Per Socket.io nel frontend
            appuntamenti: appuntamenti
        });
    } catch (error) {
        console.error(`Errore nel GET /parrucchiere/appuntamenti per ${parrucchiereUsername}:`, error);
        res.status(500).render('error', { message: 'Errore nel caricamento degli appuntamenti.' });
    }
});

// Home Utente
app.get('/utente/home', checkRole('utente'), async (req, res) => {
    try {
        const parrucchieri = await db.getAllParrucchieri();
        res.render('utente/home', { // Assicurati che esista views/utente/home.hbs
            layout: false,
            name: req.session.name || (req.user && req.user.nome),
            username: req.session.username || (req.user && req.user.username),
            role: req.session.role || (req.user && req.user.ruolo),
            parrucchieri: (parrucchieri || []).map(p => ({
                 username: p.username,
                 nome_salone: p.nome_salone || p.nome, // Usa nome parrucchiere se manca nome salone
                 indirizzo: p.indirizzo || 'Indirizzo non specificato',
                 servizi: p.servizi_offerti || 'Nessun servizio specificato'
            }))
        });
    } catch (error) {
        console.error('Errore nel GET /utente/home:', error);
        res.status(500).render('error', { message: 'Errore nel caricamento della dashboard utente.' });
    }
});


// --- Funzione Helper per Settimana ---
// Funzione helper per calcolare l'inizio della settimana (Lunedì)
function getWeekStartDate(offset = 0) {
    const today = new Date();
    // Sposta la data di N settimane avanti/indietro
    today.setDate(today.getDate() + offset * 7);
    const currentDay = today.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
    // Calcola la differenza per arrivare a Lunedì (considera Domenica come giorno 7 per il calcolo)
    const diffToMonday = today.getDate() - (currentDay === 0 ? 6 : currentDay - 1);
    const monday = new Date(today.setDate(diffToMonday));
    // Formatta come YYYY-MM-DD
    const year = monday.getFullYear();
    const month = (monday.getMonth() + 1).toString().padStart(2, '0');
    const day = monday.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}


// --- Calendario e Prenotazioni (Logica Utente) ---

// GET: Mostra il calendario dinamico per un parrucchiere (per l'utente)
app.get('/utente/calendario/:parrucchiere', checkRole('utente'), async (req, res) => {
    const parrucchiereUsername = req.params.parrucchiere;
    const loggedInUsername = req.session.username || (req.user && req.user.username);
     if (!loggedInUsername) {
         console.error("Username utente non trovato in sessione per /utente/calendario/");
         return res.redirect('/login');
     }

    // ---- Gestione Offset Settimana ----
    const weekOffset = parseInt(req.query.offset) || 0; // Prende l'offset dalla query, default 0
    const startDate = getWeekStartDate(weekOffset); // Calcola il Lunedì della settimana target
    const prevWeekOffset = weekOffset - 1;
    const nextWeekOffset = weekOffset + 1;
    // ---- FINE ----

    try {
        const parrucchiereInfo = await db.getUserByUsername(parrucchiereUsername);
        if (!parrucchiereInfo || parrucchiereInfo.ruolo !== 'parrucchiere') {
            return res.status(404).render('error', { message: 'Parrucchiere non trovato.' });
        }

        // Ottimizzazione (Opzionale ma raccomandata): Fetchare solo appuntamenti della settimana?
        // Per ora, recuperiamo tutti e filtriamo nel frontend/JS
        const appuntamenti = await db.getAppointments(parrucchiereUsername);
        console.log(`Caricato calendario per ${parrucchiereUsername} (Offset: ${weekOffset}, Start: ${startDate}) con ${appuntamenti.length} appuntamenti totali.`);

        res.render('calendari/calendario-settimana', {
            layout: false,
            parrucchiere: parrucchiereInfo,
            username: loggedInUsername,
            name: req.session.name || (req.user && req.user.nome),
            role: req.session.role || (req.user && req.user.ruolo),
            giorni: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
            ore: ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'],
            appuntamenti: appuntamenti || [],
            // ---- Passa dati settimana alla vista ----
            weekOffset: weekOffset,
            startDate: startDate, // Passa la data di inizio settimana (Lunedì)
            prevWeekOffset: prevWeekOffset,
            nextWeekOffset: nextWeekOffset
            // ---- FINE ----
        });
    } catch (error) {
        console.error(`Errore caricamento GET /utente/calendario/${parrucchiereUsername}?offset=${weekOffset}:`, error);
        res.status(500).render('error', { message: 'Errore nel caricamento del calendario del parrucchiere.' });
    }
});

// POST: Crea un nuovo appuntamento (da Utente)
app.post('/utente/calendario/:parrucchiere/appuntamento', checkRole('utente'), async (req, res) => {
  const parrucchiereUsername = req.params.parrucchiere;
  const { giorno, ora, descrizione } = req.body;
  const utenteUsername = req.session.username || (req.user && req.user.username);

  if (!utenteUsername) {
      return res.status(401).json({ success: false, message: 'Utente non identificato.' });
  }
  if (!giorno || !ora) {
      return res.status(400).json({ success: false, message: 'Giorno e ora sono obbligatori.' });
  }
  // Validazione formato data (YYYY-MM-DD) e ora (HH:MM) - Semplice
  if (!/^\d{4}-\d{2}-\d{2}$/.test(giorno) || !/^\d{2}:\d{2}$/.test(ora)) {
       return res.status(400).json({ success: false, message: 'Formato data (YYYY-MM-DD) o ora (HH:MM) non valido.' });
  }

  try {
      const success = await db.prenotaSlot(parrucchiereUsername, giorno, ora, descrizione || '', { username: utenteUsername });

      if (success) {
          // Emetti evento Socket.io
          console.log(`SERVER: Emetto 'appointmentUpdated' per prenotazione parrucchiere: ${parrucchiereUsername}`); // <-- LOG EMISSIONE
          io.emit('appointmentUpdated', { parrucchiere: parrucchiereUsername });
          return res.json({ success: true, message: 'Prenotazione effettuata con successo!' });
      } else {
          // Lo slot potrebbe essere già occupato o errore DB
          return res.status(409).json({ success: false, message: 'Slot non disponibile o errore nella prenotazione.' }); // 409 Conflict
      }
  } catch (error) {
      console.error(`Errore API POST /utente/calendario/${parrucchiereUsername}/appuntamento:`, error);
      return res.status(500).json({ success: false, message: 'Errore interno del server durante la prenotazione.' });
  }
});

// DELETE: Cancella un appuntamento (da Utente)
app.delete('/utente/calendario/:parrucchiere/appuntamento/:id', checkRole('utente'), async (req, res) => {
    const appointmentId = parseInt(req.params.id);
    const utenteUsername = req.session.username || (req.user && req.user.username);
    const parrucchiereUsername = req.params.parrucchiere; // Recupera parrucchiere dal parametro rotta

     if (!utenteUsername) {
        return res.status(401).json({ success: false, message: 'Utente non identificato.' });
    }
    if (isNaN(appointmentId)) {
        return res.status(400).json({ success: false, message: 'ID appuntamento non valido.' });
    }

    try {
        // Usa la funzione specifica per la cancellazione utente in SQLiteDB.js
        // che include il controllo di proprietà
        const deleted = await db.deleteAppointment(parrucchiereUsername, appointmentId, { username: utenteUsername });

        if (deleted) {
            console.log(`Utente ${utenteUsername} ha cancellato appuntamento ${appointmentId}`);
            // Notifica via Socket.io usando il parrucchiere dalla rotta
            console.log(`SERVER: Emetto 'appointmentUpdated' per cancellazione (utente) parrucchiere: ${parrucchiereUsername}`); // <-- LOG EMISSIONE
            io.emit('appointmentUpdated', { parrucchiere: parrucchiereUsername });
            return res.json({ success: true, message: 'Appuntamento cancellato con successo.' });
        } else {
             // La funzione potrebbe restituire false se non trovato o non autorizzato
             return res.status(404).json({ success: false, message: 'Appuntamento non trovato o non autorizzato alla cancellazione.' });
        }

    } catch (error) {
        console.error(`Errore API DELETE /utente/calendario/.../appuntamento/${appointmentId}:`, error);
        // Distingui errori di autorizzazione da altri errori
        if (error.message.includes('Non autorizzato')) {
             return res.status(403).json({ success: false, message: error.message }); // 403 Forbidden
        } else if (error.message.includes('non trovato')) {
             return res.status(404).json({ success: false, message: error.message }); // 404 Not Found
        }
        return res.status(500).json({ success: false, message: 'Errore interno del server durante la cancellazione.' });
    }
});

// GET: Recupera appuntamenti per un parrucchiere (API usata dal frontend calendario utente per aggiornamenti)
app.get('/utente/calendario/:parrucchiere/appuntamenti', async (req, res) => {
    // Potrebbe essere utile proteggere questa API (es. checkRole('utente'))
    const parrucchiereUsername = req.params.parrucchiere;
    try {
        const appointments = await db.getAppointments(parrucchiereUsername);
        res.json(appointments || []); // Restituisce sempre un array
    } catch (error) {
        console.error(`Errore API GET /utente/calendario/${parrucchiereUsername}/appuntamenti:`, error);
        res.status(500).json({ error: 'Errore nel recupero degli appuntamenti' });
    }
});


// --- Endpoint API per Parrucchieri ---

// GET: Lista tutti i parrucchieri (usato da admin e utente home)
app.get('/api/parrucchieri', async (req, res) => {
    try {
        const parrucchieri = await db.getAllParrucchieri();
        res.json(parrucchieri || []);
    } catch (error) {
        console.error('Errore API GET /api/parrucchieri:', error);
        res.status(500).json({ error: 'Errore nel recupero dei parrucchieri' });
    }
});

// GET: Filtra parrucchieri per servizi
app.get('/api/parrucchieri/filtrati', async (req, res) => {
    const serviziRicercati = req.query.servizi;
    if (!serviziRicercati) {
        return res.status(400).json({ error: 'Specificare almeno un servizio nella query ?servizi=nome_servizio' });
    }
    const serviziArray = serviziRicercati.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
    if (serviziArray.length === 0) {
         return res.status(400).json({ error: 'Formato servizi non valido.' });
    }
    try {
        const parrucchieri = await db.getAllParrucchieri();
        const parrucchieriFiltrati = (parrucchieri || []).filter(p => {
            const serviziOfferti = (p.servizi_offerti || '').split(',').map(s => s.trim().toLowerCase());
            return serviziArray.every(reqServ => serviziOfferti.includes(reqServ));
        });
        res.json(parrucchieriFiltrati);
    } catch (error) {
        console.error('Errore API GET /api/parrucchieri/filtrati:', error);
        res.status(500).json({ error: 'Errore nel recupero dei parrucchieri filtrati' });
    }
});

// DELETE: Cancella appuntamento (da Parrucchiere) - Protetto da checkRole
app.delete('/api/parrucchiere/appuntamenti/:id', checkRole('parrucchiere'), async (req, res) => {
    const appointmentId = parseInt(req.params.id);
    const parrucchiereUsername = req.session.username || (req.user && req.user.username);

    if (!parrucchiereUsername) {
        return res.status(401).json({ success: false, message: 'Parrucchiere non identificato.' });
    }
    if (isNaN(appointmentId)) {
        return res.status(400).json({ success: false, message: 'ID appuntamento non valido.' });
    }

    try {
        // 1. Recupera l'appuntamento per verificare che appartenga a questo parrucchiere
        const appointment = await db.getAppointmentById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appuntamento non trovato.' });
        }

        // 2. Verifica l'autorizzazione (campo corretto: parrucchiere_username)
        if (appointment.parrucchiere_username !== parrucchiereUsername) {
             console.warn(`Tentativo non autorizzato di cancellare appuntamento ${appointmentId} da ${parrucchiereUsername}. Appuntamento appartiene a ${appointment.parrucchiere_username}`);
             return res.status(403).json({ success: false, message: 'Non autorizzato a cancellare questo appuntamento.' });
        }

        // 3. Cancella l'appuntamento usando la funzione diretta per ID
        const success = await db.deleteAppointmentById(appointmentId);

        if (success) {
            console.log(`Parrucchiere ${parrucchiereUsername} ha cancellato appuntamento ${appointmentId}`);
            // Emetti evento per aggiornare i client
            console.log(`SERVER: Emetto 'appointmentUpdated' per cancellazione (parrucchiere) parrucchiere: ${parrucchiereUsername}`); // <-- LOG EMISSIONE
            io.emit('appointmentUpdated', { parrucchiere: parrucchiereUsername });
            return res.json({ success: true, message: 'Appuntamento cancellato con successo.' });
        } else {
             // Potrebbe succedere se l'appuntamento viene cancellato da un'altra richiesta concorrente
             console.warn(`Parrucchiere ${parrucchiereUsername} ha tentato di cancellare appuntamento ${appointmentId}, ma db.deleteAppointmentById ha restituito false.`);
             return res.status(404).json({ success: false, message: 'Appuntamento non trovato o già cancellato.' });
        }

    } catch (error) {
        console.error(`Errore API DELETE /api/parrucchiere/appuntamenti/${appointmentId}:`, error);
        return res.status(500).json({ success: false, message: 'Errore interno del server durante la cancellazione.' });
    }
});


// --- Gestione Errori Generica (mettere alla fine) ---

// Gestore 404 - Pagina non trovata
app.use((req, res, next) => {
  res.status(404).render('error', { message: `Pagina non trovata: ${req.originalUrl}` });
});

// Gestore errori generico (500)
app.use((err, req, res, next) => {
  console.error(`ERRORE SERVER NON GESTITO (${req.method} ${req.originalUrl}):`, err);
  // Non inviare lo stack trace in produzione
  const errorMessage = process.env.NODE_ENV === 'production'
     ? 'Si è verificato un errore interno del server. Riprova più tardi.'
     : err.message || 'Errore sconosciuto'; // Mostra messaggio specifico in dev

  // Se la risposta è già stata inviata, delega al gestore errori default di Express
  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).render('error', {
      message: errorMessage
      // Potresti aggiungere err.stack in modalità sviluppo:
      // stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});


// --- Avvio del server ---
const port = process.env.PORT || 3000;
http.listen(port, () => console.log(`Server HairPlan avviato e in ascolto sulla porta ${port}`));
