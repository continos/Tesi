/**
 * Custom SimplyEdit Storage Driver per GitHub API
 * 
 * Questo driver utilizza l'API di GitHub per leggere e scrivere dati,
 * bypassando la cache aggressiva di raw.githubusercontent.com.
 */
window.githubApiStorage = {
  repoName : null,
  repoUser : null,
  repoBranch : "gh-pages",
  dataFile : "data.json",
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
  checkJail : function(url) {
    var repo1 = this.getRepoInfo(url);
    var repo2 = this.getRepoInfo(this.endpoint);

    if (
      (repo1.repoUser == repo2.repoUser) && 
      (repo1.repoName == repo2.repoName) &&
      (repo1.repoBranch == repo2.repoBranch)
    ) {
      return true;
    }
    return false;
  },
  init : function(endpoint) {
    if (endpoint === null) {
      endpoint = document.location.href.replace(document.location.hash, "");
    }
    var script = document.createElement("SCRIPT");
    script.src = editor.baseURLClean + "github.js";
    document.head.appendChild(script);

    var repoInfo = this.getRepoInfo(endpoint);
    this.repoUser = repoInfo.repoUser;
    this.repoName = repoInfo.repoName;
    this.repoBranch = repoInfo.repoBranch;

    this.endpoint = endpoint;
    this.dataFile = "data.json";
    this.dataEndpoint = endpoint + "data.json";

    this.sitemap = storage.default.sitemap;
    this.listSitemap = storage.default.listSitemap;
    this.page = storage.default.page;
    this.escape = storage.default.escape;

    if (editor.responsiveImages) {
      if (
        editor.settings['simply-image'] &&
        editor.settings['simply-image'].responsive
      ) {
        if (typeof editor.settings['simply-image'].responsive.sizes === "function") {
          editor.responsiveImages.sizes = editor.settings['simply-image'].responsive.sizes;
        } else if (typeof editor.settings['simply-image'].responsive.sizes === "object") {
          editor.responsiveImages.sizes = (function(sizes) {
            return function(src) {
              var result = {};
              var info = src.split(".");
              var extension = info.pop().toLowerCase();
              if (extension === "jpg" || extension === "jpeg" || extension === "png") {
                for (var i=0; i<sizes.length; i++) {
                  result[sizes[i] + "w"] = info.join(".") + "-simply-scaled-" + sizes[i] + "." + extension;
                }
              }
              return result;
            };
          }(editor.settings['simply-image'].responsive.sizes));
        }
      }
      window.addEventListener("resize", editor.responsiveImages.resizeHandler);
    }
  },
  connect : function(callback) {
    if (typeof Github === "undefined") {
      return false;
    }

    if (!editor.storage.key) {
      editor.storage.key = localStorage.storageKey;
    }
    if (!editor.storage.key) {
      editor.storage.key = prompt("Please enter your authentication key");
    }

    if (editor.storage.validateKey(editor.storage.key)) {
      if (!this.repo) {
        localStorage.storageKey = editor.storage.key;
        this.github = new Github({
          token: editor.storage.key,
          auth: "oauth"
        });
        this.repo = this.github.getRepo(this.repoUser, this.repoName);
      }
      if (typeof callback === "function") {
        callback();
      }
      return true;
    } else {
      return editor.storage.connect(callback);
    }
  },
  disconnect : function(callback) {
    delete this.repo;
    delete localStorage.storageKey;
    if (typeof callback === "function") {
      callback();
    }
    return true;
  },
  validateKey : function(key) {
    return true;
  },
  file : {
    save : function(path, data, callback) {
      if (path.match(/\/$/)) {
        // github will create directories as needed.
        var saveResult = {path : path, response: "Saved."};
        return callback(saveResult);
      }

      var saveCallback = function(err) {
        if (err === null) {
          var saveResult = {path : path, response: "Saved."};
          return callback(saveResult);
        }

        if (err.error == 401) {
          return callback({message : "Authorization failed.", error: true});
        }
        return callback({message : "SAVE FAILED: Could not store.", error: true});
      };

      var executeSave = function(path, data) {
        editor.storage.repo.write(editor.storage.repoBranch, path, data, "Simply edit changes on " + new Date().toUTCString(), saveCallback);
      };
      if (data instanceof File) {
        var fileReader = new FileReader();
        fileReader.onload = function(evt) {
          executeSave(path, this.result);
        };
        fileReader.readAsBinaryString(data);
      } else {
        executeSave(path, data);
      }
    },
    delete : function(path, callback) {
      editor.storage.repo.delete(editor.storage.repoBranch, path, callback);
    }
  },
  save : function(data, callback) {
    return editor.storage.file.save("data.json", data, callback);
  },
  /**
   * Caricamento: legge il file data.json tramite l'API per bypassare la cache
   */
  load: function(callback) {
    console.log('Custom Storage [githubApiStorage]: Caricamento dati via API...');

    const apiUrl = `https://api.github.com/repos/${this.repoUser}/${this.repoName}/contents/${this.dataFile}?ref=${this.repoBranch}`;

    // Aggiungiamo un parametro per il cache-busting, che aiuta con le API
    const cacheBustUrl = apiUrl + '&t=' + new Date().getTime();

    fetch(cacheBustUrl)
      .then(response => {
        if (response.status === 404) {
          // Il file non esiste, è il primo avvio o il repo è vuoto
          console.log('Custom Storage [githubApiStorage]: data.json non trovato (404). Restituisco dati vuoti.');
          return Promise.resolve(null);
        }
        if (!response.ok) {
          throw new Error(`Errore di rete dall'API GitHub: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data) {
          // Gestisce il caso 404
          callback('{}');
          return;
        }
        // Il contenuto del file dall'API è codificato in Base64
        const content = atob(data.content);
        console.log('Custom Storage [githubApiStorage]: Dati caricati e decodificati con successo.');
        callback(content);
      })
      .catch(error => {
        console.error('Custom Storage [githubApiStorage]: Errore durante il caricamento via API:', error);
        // In caso di errore, restituisce un oggetto JSON vuoto per non bloccare l'editor
        callback('{}');
      });
  },
  saveTemplate : function(pageTemplate, callback) {
    var dataPath = location.pathname.split(/\//, 3)[2];
    if (dataPath.match(/\/$/)) {
      dataPath += "index.html";
    }

    var repo = this.repo;
    repo.read(this.repoBranch, pageTemplate, function(err, data) {
      if (data) {
        repo.write(this.repoBranch, dataPath, data, pageTemplate + " (copy)", callback);
      }
    });
  },
  list : function(url, callback) {
    if (url.indexOf(editor.storage.dataEndpoint) === 0) {
      return this.listSitemap(url, callback);
    }

    var repoInfo = this.getRepoInfo(url);

    var repoUser = repoInfo.repoUser;
    var repoName = repoInfo.repoName;
    var repoBranch = repoInfo.repoBranch;
    var repoPath = repoInfo.repoPath;

    var github = new Github({});
    var repo = github.getRepo(repoUser, repoName);
    repo.read(repoBranch, repoPath, function(err, data) {
      var result = {
        images : [],
        folders : [],
        files : []
      };

      if (data) {
        data = JSON.parse(data);
        for (var i=0; i<data.length; i++) {
          if (data[i].type == "file") {
            var fileData = {
              url : url + data[i].name,
              src : url + data[i].name,
              name : data[i].name // data[i].download_url
            };
            if (url === editor.storage.endpoint && data[i].name === "data.json") {
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
              url : editor.storage.endpoint + data[i].path + "/",
              name : data[i].name
            });
          }
        }
        callback(result);
      } else {
        // Empty (non-existant) directory - return the empty resultset, github will create the dir automatically when we save things to it.");
        callback(result);
      }
    });
  }
};