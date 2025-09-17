/**
 * Custom SimplyEdit Storage Driver per GitHub API
 * 
 * Questo driver utilizza l'API di GitHub per leggere e scrivere dati,
 * bypassando la cache aggressiva di raw.githubusercontent.com.
 */
window.githubApiStorage = {
  // --- Proprietà del driver ---
  repo: null,
  github: null,
  key: null,
  
  // Informazioni del repository (verranno lette dal tag <script>)
  repoUser: null,
  repoName: null,
  repoBranch: 'gh-pages',
  dataFile: 'data.json',

  /**
   * Inizializzazione: legge la configurazione dal tag <script>
   */
  init: function(endpoint) {
    console.log('Custom Storage [githubApiStorage]: Inizializzazione...');
    
    this.repoUser = document.querySelector('[data-simply-repo-user]').getAttribute('data-simply-repo-user');
    this.repoName = document.querySelector('[data-simply-repo-name]').getAttribute('data-simply-repo-name');
    const branch = document.querySelector('[data-simply-repo-branch]');
    if (branch) {
      this.repoBranch = branch.getAttribute('data-simply-repo-branch');
    }

    // Carica la libreria GitHub se non è già presente
    if (typeof Github === 'undefined') {
        const script = document.createElement("SCRIPT");
        // Assicurati che il percorso sia corretto per il tuo sito
        script.src = "/Tesi/simplyedit/github.js"; 
        document.head.appendChild(script);
    }

    console.log(`Custom Storage [githubApiStorage]: Repo configurato su ${this.repoUser}/${this.repoName}, branch ${this.repoBranch}`);
  },

  /**
   * Connessione: gestisce l'autenticazione tramite token
   */
  connect: function(callback) {
    console.log('Custom Storage [githubApiStorage]: Tentativo di connessione...');
    
    if (typeof Github === 'undefined') {
        setTimeout(() => this.connect(callback), 100);
        return;
    }

    if (!this.key) {
      this.key = localStorage.getItem('githubToken');
    }
    if (!this.key) {
      this.key = prompt('Please enter your GitHub Personal Access Token');
    }

    if (this.key) {
      this.github = new Github({
        token: this.key,
        auth: "oauth"
      });
      this.repo = this.github.getRepo(this.repoUser, this.repoName);

      // --- VERIFICA DEL TOKEN ---
      this.github.getUser().show(null, (err, user) => {
        if (err) {
          // Errore 401 significa token non valido
          if (err.error === 401) {
            alert('Autenticazione fallita. Il token GitHub non è valido o è scaduto.');
            localStorage.removeItem('githubToken'); // Pulisce il token errato
            this.key = null;
            // NON chiamare la callback, bloccando l'accesso all'edit mode
          } else {
            // Altro tipo di errore (es. di rete)
            alert('Errore di connessione a GitHub: ' + err.error);
          }
          return; // Blocca l'esecuzione
        }
        
        // Se la chiamata ha successo, il token è valido
        console.log(`Custom Storage [githubApiStorage]: Connesso come ${user.login}.`);
        localStorage.setItem('githubToken', this.key);
        if (callback) callback(); // Prosegui e attiva l'edit mode
      });

    } else {
        alert("Token di autenticazione per GitHub non fornito.");
        // L'utente ha annullato il prompt, non fare nulla
    }
  },

  /**
   * Salvataggio: scrive il file data.json tramite l'API
   */
  save: function(data, callback) {
    console.log('Custom Storage [githubApiStorage]: Salvataggio dati via API...');
    if (!this.repo) {
        console.error("Salvataggio fallito: nessuna connessione al repository GitHub.");
        if (callback) callback({error: true, message: "Not connected to GitHub"});
        return;
    }

    this.repo.write(this.repoBranch, this.dataFile, data, 'SimplyEdit: Aggiornamento contenuti', (err) => {
        if (err) {
            console.error('Custom Storage [githubApiStorage]: Errore durante il salvataggio:', err);
            if (callback) callback({error: true, message: err});
        } else {
            console.log('Custom Storage [githubApiStorage]: Dati salvati con successo.');
            if (callback) callback({});
        }
    });
  },

  /**
   * Caricamento: legge il file data.json tramite l'API per bypassare la cache
   */
  load: function(callback) {
    console.log('Custom Storage [githubApiStorage]: Caricamento dati via API...');

    const apiUrl = `https://api.github.com/repos/${this.repoUser}/${this.repoName}/contents/${this.dataFile}?ref=${this.repoBranch}`;
    const cacheBustUrl = apiUrl + '&t=' + new Date().getTime();

    fetch(cacheBustUrl, {
      headers: {
        // L'autenticazione non è necessaria per leggere un file pubblico,
        // ma può aiutare con i rate limit dell'API.
        // Se il repo è privato, questa parte è FONDAMENTALE.
        ...(this.key && { 'Authorization': `token ${this.key}` })
      }
    })
    .then(response => {
      if (response.status === 404) {
        console.log('Custom Storage [githubApiStorage]: data.json non trovato (404). Restituisco dati vuoti.');
        return null;
      }
      if (!response.ok) {
        throw new Error(`Errore di rete dall'API GitHub: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data || !data.content) {
        callback('{}');
        return;
      }
      const content = atob(data.content);
      console.log('Custom Storage [githubApiStorage]: Dati caricati e decodificati con successo.');
      callback(content);
    })
    .catch(error => {
      console.error('Custom Storage [githubApiStorage]: Errore durante il caricamento via API:', error);
      callback('{}');
    });
  },

  /**
   * Disconnessione: pulisce il token salvato
   */
  disconnect: function(callback) { 
    localStorage.removeItem('githubToken');
    this.key = null;
    this.github = null;
    this.repo = null;
    console.log('Custom Storage [githubApiStorage]: Disconnesso.');
    if (callback) callback(); 
  },

  // Funzione per validare la chiave (semplice, ritorna sempre true)
  validateKey: function(key) {
    return !!key;
  }
};