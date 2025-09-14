/**
 * Configurazione Globale per SimplyEdit
 */

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
