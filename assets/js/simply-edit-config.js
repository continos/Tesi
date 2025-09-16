/**
 * Configurazione Globale per SimplyEdit
 */

 // --- GESTIONE AUTENTICAZIONE ---
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
})

// 1. Definizione delle impostazioni globali (es. template di pagina)
var simplySettings = {
  pageTemplates: {
    templates: [
      { name: 'Research Page', template: 'research-template.html' }
    ]
  }
};

// 2. Estensione delle funzionalità di SimplyEdit (es. creazione pagine da template)
document.addEventListener('simply-storage-init', function() {
  if (!window.editor || editor.storage.saveTemplate) {
    return; // Esce se l'editor non è pronto o se la funzione esiste già
  }

  console.log('Aggiungo la funzione custom saveTemplate al motore di storage.');


  /* --- NUOVO: Aggiungi pulsante e azione di Logout ---
  editor.addAction('simply-logout', function() {
    if (confirm('Sei sicuro di voler effettuare il logout?')) {
      fetch('/logout', { method: 'POST' })
        .then(() => {
          // Rimuovi #simply-edit e ricarica la pagina
          window.location.href = window.location.pathname;
        });
    }
  });

  // Aggiungi il pulsante alla toolbar principale
  const mainToolbar = editor.toolbars['simply-main-toolbar'];
  if (mainToolbar && mainToolbar.init) {
      const originalInit = mainToolbar.init;
      mainToolbar.init = function(config) {
          originalInit(config); // Esegui l'init originale
          const ul = document.querySelector('#simply-main-toolbar .simply-buttons');
          if (ul) {
              const logoutButton = document.createElement('li');
              logoutButton.innerHTML = <button data-simply-action="simply-logout" title="Logout"><i class="fa fa-sign-out"></i> Logout</button>;
              ul.appendChild(logoutButton);
          }
      }
  }*/ 

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
});

/* 3. Definizione e registrazione dei Data Source custom
(function() {
  // Definisce un data source custom per il menu di ricerca
  var researchPagesSource = {
    load: function(el, callback) {
      fetch('/api/research-pages')
        .then(response => response.json())
        .then(data => {
          callback(data); // Passa i dati a SimplyEdit per costruire la lista
        })
        .catch(error => {
          console.error('Errore nel caricare le pagine di ricerca:', error);
          callback([]); // In caso di errore, ritorna una lista vuota
        });
    }
  };

  // Registra il nuovo data source appena SimplyEdit è pronto
  document.addEventListener('simply-content-loaded', function() {
      if (window.editor) {
          editor.addDataSource('researchPages', researchPagesSource);
      }
  });
})();*/

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

/* 5. Sincronizzazione del titolo della pagina
document.addEventListener('simply-content-loaded', function() {
  if (window.editor && editor.pageData && editor.pageData.pageTitle) {
    console.log('Sincronizzo il titolo della pagina con:', editor.pageData.pageTitle);
    document.title = editor.pageData.pageTitle;
  }
});*/
