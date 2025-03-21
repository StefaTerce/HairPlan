
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