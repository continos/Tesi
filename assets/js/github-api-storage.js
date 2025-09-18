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
  getRepoInfo : function(endpoint) {
    var result = {};
    var parser = document.createElement('a');
    parser.href = endpoint;

    var pathInfo;
    pathInfo = parser.pathname.split("/");
    if (parser.pathname.indexOf("/") === 0) {
      pathInfo.shift();
    }

    if (parser.hostname == "github.com") {
      result.repoUser = pathInfo.shift();
      result.repoName =  pathInfo.shift();
      result.repoBranch = "master";
    } else {
      //github.io;
      result.repoUser = parser.hostname.split(".")[0];
      result.repoName = pathInfo.shift();
      result.repoBranch = "gh-pages";
    }

    if (document.querySelector("[data-simply-repo-branch]")) {
      result.repoBranch = document.querySelector("[data-simply-repo-branch]").getAttribute("data-simply-repo-branch");
    }
    if (document.querySelector("[data-simply-repo-name]")) {
      result.repoName = document.querySelector("[data-simply-repo-name]").getAttribute("data-simply-repo-name");
    }
    if (document.querySelector("[data-simply-repo-user]")) {
      result.repoUser = document.querySelector("[data-simply-repo-user]").getAttribute("data-simply-repo-user");
    }

    var repoPath = pathInfo.join("/");
    repoPath = repoPath.replace(/\/$/, '');

    result.repoPath = repoPath;
    return result;
  },

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
            // Pulisce l'URL per permettere un nuovo tentativo
            history.replaceState(null, null, ' ');
            // NON chiamare la callback, bloccando l'accesso all'edit mode
          } else {
            // Altro tipo di errore (es. di rete)
            alert('Errore di connessione a GitHub: ' + err.error);
            history.replaceState(null, null, ' ');
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
        history.replaceState(null, null, ' ');
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
  // Salva una pagina basata su un template
  saveTemplate: function(pageTemplate, callback) {
    console.log('Custom Storage [githubApiStorage]: Salvataggio template', pageTemplate);
    
    if (!this.repo) {
      console.error("Salvataggio template fallito: nessuna connessione al repository GitHub.");
      if (callback) callback({error: true, message: "Not connected to GitHub"});
      return;
    }

    // Determina il percorso di destinazione
    var dataPath = window.location.pathname;
    
    // Rimuovi il prefisso del repository se presente
    if (dataPath.startsWith('/Tesi/')) {
      dataPath = dataPath.substring('/Tesi'.length);
    }
    if (dataPath.startsWith('/')) {
      dataPath = dataPath.substring(1);
    }
    
    // Se è una directory, aggiungi index.html
    if (dataPath.match(/\/$/)) {
      dataPath += "index.html";
    }

    // Leggi il template
    var repo = this.repo;
    repo.read(this.repoBranch, pageTemplate, function(err, data) {
      if (data) {
        repo.write(repo.repoBranch, dataPath, data, pageTemplate + " (copy)", callback);
      } else {
        if (callback) callback({error: true, message: err});
      }
    });
  },
  sitemap : function() {
    var output = {
      children : {},
      name : 'Sitemap'
    };
    for (var i in this.currentData) {
      var chain = i.split("/");
      chain.shift();
      var lastItem = chain.pop();
      if (lastItem !== "") {
        chain.push(lastItem);
      } else {
        var item = chain.pop();
        if (typeof item === "undefined") {
          item = '';
        }
        chain.push(item + "/");
      }

      var currentNode = output.children;
      var prevNode;
      for (var j = 0; j < chain.length; j++) {
        var wantedNode = chain[j];
        var lastNode = currentNode;
        for (var k in currentNode) {
          if (currentNode[k].name == wantedNode) {
            currentNode = currentNode[k].children;
            break;
          }
        }
        // If we couldn't find an item in this list of children
        // that has the right name, create one:
        if (lastNode == currentNode) {
          currentNode[wantedNode] = {
            name : wantedNode,
            children : {}
          };
          currentNode = currentNode[wantedNode].children;
        }
      }
    }
    return output;
  },
  listSitemap : function(url, callback) {
    if (url.indexOf(this.dataEndpoint) === 0) {
      var subpath = url.replace(this.dataEndpoint, "");
      var sitemap = this.sitemap();
      var result = {
        folders : [],
        files : []
      };
      if (subpath !== "") {
        var pathicles = subpath.split("/");
        pathicles.shift();
        for (var i=0; i<pathicles.length; i++) {
          if (sitemap.children[pathicles[i]]) {
            sitemap = sitemap.children[pathicles[i]];
          } else {
            sitemap = {};
            break;
          }
        }
        result.folders.push({
          url : url.replace(/\/[^\/]+$/, ''),
          name : '..'
        });
      } else {
        result.folders.push({
          url : this.endpoint,
          name : '..'
        });
      }

      for (var j in sitemap.children) {
        if (j=="/") {
          result.files.push({
            url : url + "/",
            name : "Home"
          });
        }

        if (Object.keys(sitemap.children[j].children).length) {
          result.folders.push({
            url : url + "/" + j,
            name : j + "/"
          });
        } else {
          if (j != "/") {
            result.files.push({
              url : url + "/" + j,
              name : j.replace(/\/$/, '')
            });

            if (Object.keys(this.currentData[(url + "/" + j).replace(this.dataEndpoint, "")]).length === 0) {
              result.folders.push({
                url : url + "/" + j.replace(/\/$/, ''),
                name : j
              });
            }
          }
        }
      }

      return callback(result);
    }
  },
  // Lista i file e le cartelle in una directory
  list: function(url, callback) {
    console.log('Custom Storage [githubApiStorage]: List directory', url);
    
    // Se è una richiesta per la sitemap, gestiscila separatamente
    if (url.indexOf(this.dataEndpoint) === 0) {
      return this.listSitemap(url, callback);
    }

    // Estrai le informazioni del repository dall'URL
    var repoInfo = this.getRepoInfo(url);
    var repoUser = repoInfo.repoUser;
    var repoName = repoInfo.repoName;
    var repoBranch = repoInfo.repoBranch;
    var repoPath = repoInfo.repoPath;

    // Usa l'istanza GitHub già esistente invece di crearne una nuova
    var repo = this.repo;
    repo.read(repoBranch, repoPath, function(err, data) {
      var result = {
        images: [],
        folders: [],
        files: []
      };

      if (data) {
        data = JSON.parse(data);
        for (var i = 0; i < data.length; i++) {
          if (data[i].type == "file") {
            var fileData = {
              url: url + data[i].name,
              src: url + data[i].name,
              name: data[i].name
            };
            if (url === this.endpoint && data[i].name === "data.json") {
              fileData.name = "My pages";
              result.folders.push(fileData);
            } else {
              result.files.push(fileData);
              if (fileData.url.match(/(jpg|jpeg|gif|png|bmp|tif|svg)$/i)) {
                result.images.push(fileData);
              }
            }
          } else if (data[i].type == "dir") {
            result.folders.push({
              url: this.endpoint + data[i].path + "/",
              name: data[i].name
            });
          }
        }
        callback(result);
      } else {
        // Directory vuota o non esistente
        callback(result);
      }
    }.bind(this));
  },
  // Lista la sitemap (implementazione originale SimplyEdit)

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