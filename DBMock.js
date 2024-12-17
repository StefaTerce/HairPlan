class MockDB {
    constructor() {
        this.users = [
            { username: 'admin', password: 'admin123', ruolo: 'admin', nome: 'Admin', email: 'admin@example.com' },
            { username: 'parrucchiere', password: 'parrucchiere123', ruolo: 'parrucchiere', nome: 'Giuseppe', email: 'giuseppe@example.com' },
            { username: 'utente', password: 'utente123', ruolo: 'utente', nome: 'Marco', email: 'marco@example.com' }
        ];
    }

    getUserByUsername(username) {
        return this.users.find(user => user.username === username);
    }

    addUser(user) {
        this.users.push(user);
    }
}

module.exports = MockDB;
