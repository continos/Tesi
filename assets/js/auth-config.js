// assets/js/auth-config.js

let auth0Client = null;

// Funzione per configurare e inizializzare il client Auth0
const configureClient = async () => {
  auth0Client = await auth0.createAuth0Client({
    domain: "dev-v7o1tlrqzjq36zmy.us.auth0.com", 
    clientId: "8tkrmF8JOmtabmZi3roQvEkTlnCHKUl2", 
    authorizationParams: {
      redirect_uri: window.location.origin + '/Tesi/' // Assicura che il redirect sia corretto per GitHub Pages
    }
  });
};

// Funzione per gestire il login
const login = async () => {
  await auth0Client.loginWithRedirect();
};

// Funzione per gestire il logout
const logout = () => {
  auth0Client.logout({
    logoutParams: {
      returnTo: window.location.origin + '/Tesi/'
    }
  });
};

// Funzione per controllare se l'utente è autenticato
const isAuthenticated = async () => {
  return await auth0Client.isAuthenticated();
};

// Funzione per ottenere il profilo dell'utente
const getUser = async () => {
  return await auth0Client.getUser();
};

// Esegui la configurazione al caricamento dello script
window.addEventListener('load', async () => {
  await configureClient();

  // Gestisce il reindirizzamento dopo il login
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {
    await auth0Client.handleRedirectCallback();
    window.history.replaceState({}, document.title, "/Tesi/");
    await checkUserRole(); // Controlla e salva il ruolo dopo il login
  }
  await checkUserRole(); // Controlla il ruolo anche al caricamento normale della pagina
  updateUI(); // Aggiorna l'interfaccia
});

// --- FUNZIONE PER AGGIORNARE L'INTERFACCIA UTENTE ---
const updateUI = async () => {
  const isAuth = await isAuthenticated();
  const userRole = localStorage.getItem('userRole');
  const editModeButton = document.getElementById('edit-mode-button');
  const authLink = document.querySelector('#footer .footer-links a');

  // La visibilità del pulsante di modifica dipende dal RUOLO (autorizzazione)
  if (editModeButton) {
    editModeButton.style.display = (userRole === 'administrator') ? 'flex' : 'none';
  }

  // Il link Accedi/Logout dipende dallo STATO DI LOGIN (autenticazione)
  if (authLink) {
    if (isAuth) {
      authLink.textContent = 'Logout';
      authLink.href = '#';
      authLink.onclick = (e) => {
        e.preventDefault();
        if (confirm('Sei sicuro di voler effettuare il logout?')) {
          logout();
        }
      };
    } else {
      authLink.textContent = 'Accedi';
      authLink.href = '#';
      authLink.onclick = (e) => {
        e.preventDefault();
        login();
      };
    }
  }
};

// --- NUOVA FUNZIONE PER LA GESTIONE DEI RUOLI ---
const checkUserRole = async () => {
  const isAuthenticated = await auth0Client.isAuthenticated();
  if (!isAuthenticated) {
    // Se non è autenticato, pulisci i dati di ruolo e utente
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    return null;
  }

  try {
    const user = await auth0Client.getUser();
    // Aggiungo un parametro per forzare il ricaricamento del file JSON (cache-busting)
    const response = await fetch('/Tesi/auth/auth-roles.json?t=' + new Date().getTime());
    if (!response.ok) {
      throw new Error('File dei ruoli non trovato.');
    }
    const roles = await response.json();

    // --- LOG DI DEBUG ---
    console.log("Dati caricati da auth-roles.json:", roles);
    console.log("Lista amministratori:", roles.administrators);
    // ------------------

    // L'identificativo univoco dell'utente è nel campo 'sub'
    const userId = user.sub;
    let userRole = 'guest'; // Ruolo di default

    // --- LOG DI DEBUG ---
    console.log(`ID utente da controllare: '${userId}' (tipo: ${typeof userId})`);
    // ------------------

    if (roles.administrators.includes(userId)) {
      userRole = 'administrator';
    } else if (roles.professors.includes(userId)) {
      userRole = 'professor';
    }

    // Salva ruolo e nome utente nel localStorage per un accesso rapido
    localStorage.setItem('userRole', userRole);
    localStorage.setItem('userName', user.name); // Usiamo il nome visualizzato per comodità
    
    console.log(`Utente '${user.name}' (ID: ${userId}) ha effettuato l'accesso con ruolo: '${userRole}'`);
    return userRole;

  } catch (error) {
    console.error("Errore nel controllo del ruolo:", error);
    localStorage.setItem('userRole', 'guest'); // In caso di errore, assegna un ruolo sicuro
    localStorage.setItem('userName', 'unknown');
    return 'guest';
  }
};