const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const mock = require('./DBMock.js'); // Assicurati che DBMock.js esista e contenga la logica del database mock
const db = new mock(); // Istanzia il database mock
const hbs = require('hbs');

// Registra il helper per ottenere la prima lettera di una stringa
hbs.registerHelper('firstLetter', function(name) {
    return name ? name.charAt(0).toUpperCase() : '';  // Restituisce la prima lettera in maiuscolo
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

// Route Login Page
app.get('/login', (req, res) => {
    if (req.session.loggedin) {
        if (req.session.role === 'admin') {
            return res.redirect('/admin/home');
        } else if (req.session.role === 'parrucchiere') {
            return res.redirect('/parrucchiere/home');
        } else if (req.session.role === 'utente') {
            return res.redirect('/utente/home');
        }
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

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

    // Verifica se le credenziali sono corrette
    const user = db.getUserByUsername(username);
    if (user && user.password === password) {
        req.session.loggedin = true;
        req.session.name = user.nome;
        req.session.role = user.ruolo;

        // Redirigi in base al ruolo
        if (user.ruolo === 'admin') {
            return res.redirect('/admin/home');
        } else if (user.ruolo === 'parrucchiere') {
            return res.redirect('/parrucchiere/home');
        } else if (user.ruolo === 'utente') {
            return res.redirect('/utente/home');
        }
    } else {
        res.render('error', {
            message: 'Credenziali errate, per favore riprova!'
        });
    }
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

// Route Home per Admin
app.get('/admin/home', checkRole('admin'), (req, res) => {
    res.render('admin/home', {
        name: req.session.name,
        role: req.session.role,
        message: `Benvenuto, ${req.session.name}!`
    });
});

// Route Home per Parrucchiere
app.get('/parrucchiere/home', checkRole('parrucchiere'), (req, res) => {
    res.render('parrucchiere/home', {
        name: req.session.name,
        role: req.session.role,
        message: `Benvenuto, ${req.session.name}!`
    });
});

// Route Home per Utente
app.get('/utente/home', checkRole('utente'), (req, res) => {
    res.render('utente/home', {
        name: req.session.name,
        role: req.session.role,
        message: `Benvenuto, ${req.session.name}!`
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

// Start del server
const port = 3000;
app.listen(port, () => console.log(`Server started on port ${port}`));
