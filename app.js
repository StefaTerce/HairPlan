const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const hbs = require('hbs');
require('dotenv').config();

// Importa il modulo SQLiteDB che gestisce il database
const SQLiteDB = require('./SQLiteDB.js');
const db = new SQLiteDB();

//#region Hbs
hbs.registerHelper('and', function (a, b) {
    return a && b;
});

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
//#endregion

// Crea l'app Express
const app = express();
app.use(session({ secret: 'ssshhhhh', resave: false, saveUninitialized: true }));

// Middleware per il body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Impostazione del motore di rendering Handlebars (hbs)
app.set('view engine', 'hbs');

// Impostazione della cartella public per i file statici
app.use('/static', express.static(path.join(__dirname, 'public')));

//#region Google OAuth (facoltativo: se non ti serve, puoi rimuovere questa sezione)
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,  
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, 
    callbackURL: "http://localhost:3000/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    req.session.loggedin = true;
    req.session.name = req.user.displayName; 
    // Imposta anche il campo username (potresti usare un identificativo univoco del profilo Google)
    req.session.username = req.user.emails[0].value;
    req.session.role = 'utente';
    res.redirect('/utente/home');
});
//#endregion

// Funzione middleware per la protezione delle rotte in base al ruolo
function checkRole(role) {
    return (req, res, next) => {
        if (req.session.loggedin && req.session.role === role) {
            return next();
        }
        res.redirect('/login');
    };
}

//#region Swagger (opzionale)
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title: 'HairPlan API',
            version: '1.0.0',
            description: 'API per la gestione di prenotazioni per parrucchieri',
        },
        basePath: '/',
    },
    apis: ['./swagger.js'],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
//#endregion

// Dopo aver configurato l'app Express, crea il server HTTP e integra Socket.io
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let visitorCount = 0;

io.on('connection', (socket) => {
    visitorCount++;
    console.log(`Nuovo client connesso: ${socket.id}. Contatore: ${visitorCount}`);
    socket.emit('visitorCount', visitorCount);
    socket.on('disconnect', () => {
        visitorCount--;
        console.log(`Client disconnesso: ${socket.id}. Contatore: ${visitorCount}`);
    });
});
setInterval(() => {
    io.emit('visitorCount', visitorCount);
    console.log('Emesso visitorCount:', visitorCount);
}, 5000);

// --- Rotte di autenticazione, login, registrazione, logout ---

app.get('/session', (req, res) => {
    res.json(req.session);
});

app.get('/login', (req, res) => {
    if (req.session.loggedin) {
        if (req.session.role === 'admin') return res.redirect('/admin/home');
        else if (req.session.role === 'parrucchiere') return res.redirect('/parrucchiere/home');
        else if (req.session.role === 'utente') return res.redirect('/utente/home');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login/error', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login_error.html'));
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.getUserByUsername(username);
        if (!user || user.password !== password) return res.redirect('/login/error');
        req.session.loggedin = true;
        req.session.name = user.nome;
        req.session.username = user.username;
        req.session.role = user.ruolo;
        if (user.ruolo === 'admin') return res.redirect('/admin/home');
        else if (user.ruolo === 'parrucchiere') return res.redirect('/parrucchiere/home');
        else if (user.ruolo === 'utente') return res.redirect('/utente/home');
    } catch (error) {
        console.error('Errore nel login:', error);
        res.redirect('/login/error');
    }
});

app.get('/register', (req, res) => {
    if (req.session.loggedin) {
        if (req.session.role === 'admin') return res.redirect('/admin/home');
        else if (req.session.role === 'parrucchiere') return res.redirect('/parrucchiere/home');
        else if (req.session.role === 'utente') return res.redirect('/utente/home');
    }
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', async (req, res) => {
    const { username, email, age, password, nome } = req.body;
    try {
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) return res.render('error', { message: 'Username già in uso, scegli un altro.' });
        await db.addUser({ username, email, age, password, nome, ruolo: 'utente' });
        req.session.loggedin = true;
        req.session.name = nome;
        req.session.username = username;
        req.session.role = 'utente';
        res.redirect('/utente/home');
    } catch (error) {
        console.error('Errore nella registrazione:', error);
        res.render('error', { message: 'Errore durante la registrazione.' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect('/home');
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// --- Rotte per le home in base al ruolo ---

app.get('/admin/home', checkRole('admin'), async (req, res) => {
    try {
        const parrucchieri = await db.getAllParrucchieri();
        res.render('admin/home', {
            name: req.session.name,
            role: req.session.role,
            message: `Benvenuto, ${req.session.name}!`,
            parrucchieri
        });
    } catch (error) {
        console.error('Errore nel recupero dei parrucchieri:', error);
        res.render('error', { message: 'Errore nel recupero dei parrucchieri.' });
    }
});

app.post('/admin/parrucchieri/add', checkRole('admin'), async (req, res) => {
    const { username, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti, password } = req.body;
    try {
        await db.addUser({
            username, nome, cognome, email, telefono, nome_salone, indirizzo, servizi_offerti, password,
            ruolo: 'parrucchiere',
        });
        res.redirect('/admin/home');
    } catch (error) {
        console.error('Errore nell\'aggiunta del parrucchiere:', error);
        res.render('error', { message: 'Errore durante l\'aggiunta del parrucchiere.' });
    }
});

app.post('/admin/parrucchieri/delete', checkRole('admin'), async (req, res) => {
    const { id } = req.body;
    try {
        await db.deleteUserById(parseInt(id));
        res.redirect('/admin/home');
    } catch (error) {
        console.error('Errore nell\'eliminazione del parrucchiere:', error);
        res.render('error', { message: 'Errore durante l\'eliminazione del parrucchiere.' });
    }
});

app.get('/parrucchiere/home', checkRole('parrucchiere'), (req, res) => {
    res.render('parrucchiere/home', {
        name: req.session.name,
        role: req.session.role,
        message: `Benvenuto, ${req.session.name}!`
    });
});

app.get('/utente/home', checkRole('utente'), async (req, res) => {
    try {
        const parrucchieri = await db.getAllParrucchieri();
        res.render('utente/home', {
            name: req.session.name,
            username: req.session.username,
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
    } catch (error) {
        console.error('Errore nel recupero dei parrucchieri:', error);
        res.render('error', { message: 'Errore nel recupero dei parrucchieri.' });
    }
});

app.get('/otherPage', (req, res) => {
    if (!req.session.loggedin) return res.redirect('/login');
    res.render('otherPage');
});

// --- Calendario e Prenotazioni ---

// GET: Mostra il calendario dinamico per un determinato parrucchiere  
app.get('/utente/calendario/:parrucchiere', async (req, res) => {
    const parrucchiere = req.params.parrucchiere;
    try {
        // Recupera il calendario (potresti usare db.getCalendario) e gli appuntamenti dal DB
        const appuntamenti = await db.getAppointments(parrucchiere);
        // Imposta qui giorni e ore (o calcolali dinamicamente)
        res.render('calendari/calendario-settimana', {
            username: parrucchiere,
            settimana: 'Settimana corrente', // Puoi renderla dinamica
            giorni: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
            ore: ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'],
            appuntamenti
        });
    } catch (error) {
        console.error('Errore nel caricamento del calendario:', error);
        res.render('error', { message: 'Errore nel caricamento del calendario.' });
    }
});

app.post('/utente/calendario/:parrucchiere/appuntamento', async (req, res) => {
  const parrucchiere = req.params.parrucchiere;
  const { giorno, ora, descrizione } = req.body;
  const utente = req.session.username;
  if (!utente) return res.status(401).json({ error: 'Non autorizzato' });
  try {
      const success = await db.prenotaSlot(parrucchiere, giorno, ora, descrizione, { username: utente });
      if (success) {
          io.emit('appointmentUpdated', { parrucchiere });
          return res.json({ success: true, message: 'Prenotazione effettuata' });
      } else {
          return res.status(400).json({ success: false, message: 'Slot non disponibile' });
      }
  } catch (error) {
      console.error('Errore nella prenotazione:', error);
      return res.status(500).json({ error: 'Errore interno' });
  }
});


// DELETE: Cancella una prenotazione, solo se appartiene all'utente loggato
app.delete('/utente/calendario/:parrucchiere/appuntamento/:id', async (req, res) => {
    const parrucchiere = req.params.parrucchiere;
    const appointmentId = parseInt(req.params.id);
    const utente = req.session.username;
    if (!utente) return res.status(401).json({ error: 'Non autorizzato' });
    try {
        const appointments = await db.getAppointments(parrucchiere);
        const appointment = appointments.find(a => a.id === appointmentId);
        if (!appointment) return res.status(404).json({ error: 'Appuntamento non trovato' });
        if (appointment.utente !== utente) return res.status(403).json({ error: 'Non puoi cancellare questo appuntamento' });
        await db.deleteAppointment(parrucchiere, appointmentId);
        io.emit('appointmentUpdated', { parrucchiere });
        return res.json({ success: true, message: 'Appuntamento cancellato' });
    } catch (error) {
        console.error('Errore nella cancellazione:', error);
        return res.status(500).json({ error: 'Errore interno' });
    }
});

// --- Endpoint API per parrucchieri ---
app.get('/api/parrucchieri', async (req, res) => {
    try {
        const parrucchieri = await db.getAllParrucchieri();
        res.json(parrucchieri);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero dei parrucchieri' });
    }
});

app.get('/api/parrucchieri/filtrati', async (req, res) => {
    const serviziRicercati = req.query.servizi;
    if (!serviziRicercati) return res.status(400).json({ error: 'Servizi non specificati' });
    const serviziArray = serviziRicercati.split(',');
    try {
        const parrucchieri = await db.getAllParrucchieri();
        const parrucchieriFiltrati = parrucchieri.filter(parrucchiere => {
            if (!parrucchiere.servizi_offerti) return false;
            const serviziOfferti = parrucchiere.servizi_offerti.split(',');
            return serviziArray.every(servizio => serviziOfferti.includes(servizio.trim()));
        });
        res.json(parrucchieriFiltrati);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero dei parrucchieri' });
    }
});

// Avvio del server
const port = 3000;
http.listen(port, () => console.log(`Server started on port ${port}`));
