/**
 * Configurazione Globale per SimplyEdit
 */
// Definizione delle impostazioni globali (es. template di pagina)
var customSettings = {
  pageTemplates: {
    templates: [
      { name: 'Blank Page', template: 'blank-template.html'},
      { name: 'Research Page', template: 'research-template.html' }
    ]
  }
};

// Script per gestire il click del bottone Edit Mode con il tag <base> attivo
document.addEventListener('DOMContentLoaded', function() {
  const editButton = document.getElementById('edit-mode-button');
  if (editButton) {
    editButton.addEventListener('click', function(e) {
      e.preventDefault(); // Impedisce la navigazione standard del link
      window.location.hash = 'simply-edit'; // Aggiunge solo l'hash all'URL corrente
    });
  }
});

/**
 * Gestione avanzata per i dropdown del menu di navigazione,
 * per garantire la compatibilità con il rendering dinamico di SimplyEdit.
 */
document.addEventListener('simply-content-loaded', () => {
    // Riesegue la logica originale del template DOPO che SimplyEdit ha caricato i contenuti.
    // Logica per i dropdown
    document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
      // Clona e sostituisci per rimuovere vecchi event listener
      const newEl = navmenu.cloneNode(true);
      navmenu.parentNode.replaceChild(newEl, navmenu);

      // Aggiungi il nuovo listener
      newEl.addEventListener('click', function(e) {
        e.preventDefault();
        const parentLi = this.closest('.dropdown');
        parentLi.classList.toggle('active');
        parentLi.querySelector('ul').classList.toggle('dropdown-active');
        e.stopImmediatePropagation();
      });
    });
});

/**
 * Previene che si vada in Tesi/# quando clicco su href="#"
*/
document.addEventListener('click', function(e) {
  const target = e.target.closest('a');

  if (target && target.getAttribute('href') === '#') {
    e.preventDefault();
  }

});

// Gestione comportamento accordion in modalità modifica
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
