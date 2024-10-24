# HairPlan
Una piattaforma intuitiva per gestire appuntamenti dei parrucchieri, pensato per professionisti che desiderano organizzare le proprie prenotazioni con facilità ed efficienza.

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


  ![image](https://github.com/user-attachments/assets/03ee1aef-464b-4095-89f7-3ba45184c765)





