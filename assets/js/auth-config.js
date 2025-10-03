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
    // Qui potresti voler ricaricare lo stato dell'interfaccia utente
  }
});