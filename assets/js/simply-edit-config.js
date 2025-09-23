/**
 * Configurazione Globale per SimplyEdit
 */

 /* --- GESTIONE AUTENTICAZIONE ---
document.addEventListener('DOMContentLoaded', function() {
  const editModeButton = document.getElementById('edit-mode-button');

  // Controlla se l'utente è autenticato
  fetch('/check-auth')
    .then(response => response.json())
    .then(data => {
      if (data.isAuthenticated) {
        // Mostra il pulsante di modifica se l'utente è loggato
        if(editModeButton) editModeButton.style.display = 'flex';
      } else {
        // Nascondi il pulsante se non è loggato
        if(editModeButton) editModeButton.style.display = 'none';
      }
    });

  // Controlla se l'utente sta cercando di entrare in edit mode manualmente
  window.addEventListener('hashchange', function() {
    if (window.location.hash === '#simply-edit') {
      fetch('/check-auth')
        .then(response => response.json())
        .then(data => {
          if (!data.isAuthenticated) {
            // Se non è loggato, reindirizza alla pagina di login
            window.location.href = '/login.html';
          }
        });
    }
  });
  // Esegue il controllo anche al caricamento iniziale della pagina
  if (window.location.hash === '#simply-edit') {
      fetch('/check-auth')
        .then(response => response.json())
        .then(data => {
          if (!data.isAuthenticated) {
            window.location.href = '/login.html';
          }
        });
  }
});

document.addEventListener('simply-content-loaded', function() {
  // Ora che SimplyEdit ha caricato il footer, possiamo modificarlo.
  fetch('/check-auth')
      .then(response => response.json())
      .then(data => {
          const authLink = document.querySelector('#footer .footer-links a');
          if (authLink) {
              if (data.isAuthenticated) {
                  authLink.textContent = 'Logout';
                  authLink.href = '#';
                  authLink.onclick = function(e) {
                    e.preventDefault();
                    if (confirm('Sei sicuro di voler terminare la sessione di modifica?')) {
                      fetch('/logout', { method: 'POST' })
                      .then(() => {
                          alert('Logout effettuato con successo.');
                          window.location.href = window.location.pathname + window.location.search; // Naviga via dall'edit mode
                      });
                    }
                  };
              } else {
                  authLink.textContent = 'Accedi';
                  authLink.href = '/login.html';
                  authLink.onclick = null;
              }
          }
      });
  });

// --- PERSONALIZZAZIONE TOOLBAR DI SIMPLYEDIT ---
document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor) return;

  // Rinomina il pulsante di default "Logout" in "Exit"
  const defaultExitButton = document.querySelector('#simply-main-toolbar button[data-simply-action="simply-logout"]');
  if (defaultExitButton) {
    const icon = defaultExitButton.querySelector('i');
    // Pulisci il contenuto del pulsante per sicurezza
    while(defaultExitButton.firstChild) {
        defaultExitButton.removeChild(defaultExitButton.firstChild);
    }
    // Ricomponi con icona e nuovo testo
    if(icon) defaultExitButton.appendChild(icon);
    defaultExitButton.appendChild(document.createTextNode(' Exit Edit'));
  }
})*/

// 1. Definizione delle impostazioni globali (es. template di pagina)
var customSettings = {
  pageTemplates: {
    templates: [
      { name: 'Blank Page', template: 'blank-template.html'},
      { name: 'Research Page', template: 'research-template.html' }
    ]
  }
};
/*
// 2. Estensione delle funzionalità di SimplyEdit (es. creazione pagine da template)
document.addEventListener('simply-storage-init', function() {
  if (!window.editor || editor.storage.saveTemplate) {
    return; // Esce se l'editor non è pronto o se la funzione esiste già
  }

  console.log('Aggiungo la funzione custom saveTemplate al motore di storage.');

  // Aggiunge la capacità di creare un file da un template
  editor.storage.saveTemplate = function(templatePath, callback) {
    const newPagePath = window.location.pathname;

    console.log(`Richiesta di creazione per ${newPagePath} dal template ${templatePath}`);

    fetch('/create-page-from-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template: templatePath,
        path: newPagePath
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Il server ha risposto con un errore durante la creazione della pagina.');
      }
      return response.json();
    })
    .then(data => {
      console.log('Risposta del server:', data.message);
      // In caso di successo, esegui la callback che ricaricherà la pagina.
      if (callback) {
        callback();
      }
    })
    .catch(error => {
      console.error('Errore durante la creazione della pagina dal template:', error);
      alert('Errore: Impossibile creare la nuova pagina. Controlla la console del server.');
    });
  };

  // Sovrascrive la funzione di default per la creazione di una nuova pagina (che causa l'errore "insecure")
  editor.storage.page.save = function(url) {
    let newPagePath = new URL(url, window.location.origin).pathname;

    // Rimuovi qualsiasi slash/backslash finale per evitare errori nel path
    if (newPagePath.endsWith('/') || newPagePath.endsWith('\\')) {
      newPagePath = newPagePath.slice(0, -1)
    }

    console.log(`Richiesta di creazione pagina vuota per il percorso: ${newPagePath}`);

    fetch('/create-blank-page', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: newPagePath })
    })
    .then(response => {
      if (!response.ok) {
        // Se il file esiste già (409 Conflict), procedi comunque alla navigazione.
        if (response.status === 409) {
          console.log('Il file esiste già. Procedo con la navigazione.');
          return response.json();
        }
        throw new Error('Il server ha risposto con un errore durante la creazione della pagina.');
      }
      return response.json();
    })
    .then(data => {
      console.log('Risposta del server:', data.message);
      // Dopo che il server ha confermato la creazione, esegui la redirezione.
      const correctUrl = new URL(newPagePath, window.location.origin);
      document.location.href = correctUrl.href + '#simply-edit';
    })
    .catch(error => {
      console.error('Errore durante la creazione della pagina:', error);
      alert('Errore: Impossibile creare la nuova pagina. Controlla la console del server.');
    });
  };
});*/

//4. Gestione comportamento accordion in modalità modifica
document.addEventListener('DOMContentLoaded', function() {
    // Funzione per gestire il comportamento degli accordion
    function setupAccordions() {
        const isEditMode = document.body.hasAttribute('data-simply-edit');
        const accordionItems = document.querySelectorAll('#topics-accordion-parent .accordion-item');
        
        accordionItems.forEach((item, index) => {
            const button = item.querySelector('.accordion-button');
            const collapse = item.querySelector('.accordion-collapse');
            
            // Genera un ID univoco se non esiste
            if (!collapse.id) {
                collapse.id = 'collapse-' + Date.now() + '-' + index;
            }
            
            // Imposta il target del button
            if (!isEditMode) {
                button.setAttribute('data-bs-target', '#' + collapse.id);
                button.setAttribute('aria-controls', collapse.id);
            }
            
            if (isEditMode) {
                // Modalità modifica: forza apertura di tutti gli accordion
                button.classList.remove('collapsed');
                collapse.classList.add('show');
                
                // Rimuovi il comportamento di toggle in modalità modifica
                button.setAttribute('data-bs-toggle', '');
                
                // Cambia il cursore per indicare che il testo è modificabile
                button.style.cursor = 'text';
            } else {
                // Modalità normale: abilita il comportamento standard
                button.setAttribute('data-bs-toggle', 'collapse');
                
                // Assicurati che il cursore sia quello predefinito
                button.style.cursor = 'pointer';
            }
        });
    }
    
    // Configura gli accordion al caricamento della pagina
    setupAccordions();
    
    // Riconfigura gli accordion quando SimplyEdit cambia modalità
    const simplyEditObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'data-simply-edit') {
                setupAccordions();
            }
        });
    });
    
    simplyEditObserver.observe(document.body, {
        attributes: true
    });
    
    // Gestione per i nuovi elementi aggiunti dinamicamente
    const listObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                // Aspetta che SimplyEdit abbia completato il rendering
                setTimeout(setupAccordions, 100);
            }
        });
    });
    
    const topicsList = document.getElementById('topics-accordion-parent');
    if (topicsList) {
        listObserver.observe(topicsList, {
            childList: true,
            subtree: true
        });
    }
});

/* --- GESTIONE CREAZIONE PAGINE (ADATTATA PER LO STORAGE GITHUB) ---
document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor) return;

  // Funzione per attendere che lo storage di GitHub sia inizializzato
  function waitForGithubRepo(callback) {
    if (editor.storage && editor.storage.repo) {
      callback();
    } else {
      setTimeout(() => waitForGithubRepo(callback), 100);
    }
  }

  waitForGithubRepo(() => {
    // Aggiunge la capacità di creare un file da un template
    editor.storage.saveTemplate = function(templatePath, callback) {
      let newPagePath = window.location.pathname;
      
      /* Rimuovi il nome del repo dal path per GitHub Pages se presente
      if (newPagePath.startsWith('/Tesi/')) {
        newPagePath = newPagePath.substring('/Tesi'.length);
      }
      if (newPagePath.startsWith('/')) {
        newPagePath = newPagePath.substring(1);
      }/

      fetch('/Tesi/templates/' + templatePath)
        .then(response => {
          if (!response.ok) throw new Error('Template non trovato: ' + templatePath);
          return response.text();
        })
        .then(templateContent => {
          editor.storage.repo.write(
            editor.storage.repoBranch,
            newPagePath,
            templateContent,
            `Create new page from template (${newPagePath})`,  // Backtick corretto
            (err) => {
              if (err) {
                console.error('Errore GitHub:', err);
                alert('Errore: Impossibile creare la pagina su GitHub.');
                return;
              }
              if (callback) callback();
            }
          );
        })
        .catch(error => {
          console.error('Errore fetch template:', error);
          alert('Errore: Impossibile caricare il template.');
        });
    };

    // Sovrascrive la funzione di default per la creazione di una nuova pagina
    editor.storage.page.save = function(url) {
      let newPagePath = new URL(url, window.location.origin).pathname;
      
      // Rimuovi il nome del repo dal path per GitHub Pages se presente
      if (newPagePath.startsWith('/Tesi/')) {
        newPagePath = newPagePath.substring('/Tesi'.length);
      }
      if (newPagePath.startsWith('/')) {
        newPagePath = newPagePath.substring(1);
      }

      fetch('/Tesi/templates/blank-template.html')
        .then(response => {
          if (!response.ok) throw new Error('Blank template non trovato.');
          return response.text();
        })
        .then(templateContent => {
          editor.storage.repo.write(
            editor.storage.repoBranch,
            newPagePath,
            templateContent,
            `Create blank page (${newPagePath})`,  // Backtick corretto
            (err) => {
              if (err && err.error !== 422) { // Ignora l'errore se il file esiste già
                console.error('Errore GitHub:', err);
                alert('Errore: Impossibile creare la pagina su GitHub.');
                return;
              }
              // Reindirizza all'URL corretto su GitHub Pages
              const finalUrl = new URL('/Tesi/' + newPagePath, window.location.origin);
              document.location.href = finalUrl.href + '#simply-edit';
            }
          );
        })
        .catch(error => {
          console.error('Errore fetch template:', error);
          alert('Errore: Impossibile caricare il template.');
        });
    };
  });
});*/

/* --- GESTIONE AUTENTICAZIONE E OVERRIDE DELLO STORAGE ---
document.addEventListener('simply-storage-init', function() {
  if (!window.editor) return;

  // Funzione per attendere che la libreria dello storage 'github' sia caricata e pronta
  function waitForGithubStorage(callback) {
    if (editor.storage.github) {
      callback();
    } else {
      setTimeout(() => waitForGithubStorage(callback), 100);
    }
  }

  waitForGithubStorage(() => {
    const storageType = editor.storage.getType();
    if (storageType !== 'github') {
      return;
    }

    console.log("Storage GitHub rilevato. Applico le personalizzazioni.");

    // --- INIZIO MODIFICA CHIAVE ---
    // Sovrascriviamo la funzione 'load' originale dello storage github
    // con la nostra versione che usa l'API invece di raw.githubusercontent.com
    console.log("Sovrascrivo la funzione 'load' dello storage GitHub.");
    editor.storage.github.load = function(callback) {
        console.log("Eseguo la funzione LOAD sovrascritta tramite API GitHub.");

        if (!this.repo) {
            console.error("Connessione al repository non ancora stabilita. Riprovo a breve.");
            setTimeout(() => { this.load(callback); }, 200);
            return;
        }

        this.repo.read(this.repoBranch, this.dataFile, function(err, data) {
            if (err) {
                console.log("File data.json non trovato sul repository. Inizio con un dataset vuoto.", err);
                callback("{}");
            } else {
                console.log("File data.json caricato con successo dall'API.");
                callback(data);
            }
        });
    };
  });
});
// --- FINE MODIFICA CHIAVE ---*/
