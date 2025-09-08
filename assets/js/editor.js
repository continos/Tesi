/**
 * Funzione di salvataggio generica per una sezione della pagina.
 * @param {tinymce.Editor} editor - L'istanza dell'editor che ha avviato il salvataggio.
 * @param {string} sectionId - L'ID del selettore CSS per la sezione da salvare (es. '#hero').
 * @param {string} filePath - Il percorso del file da sovrascrivere (es. 'index.html').
 */
function saveSectionContent(editor, sectionId, filePath) {
  const sectionElement = document.querySelector(sectionId);
  if (!sectionElement) {
    alert(`Errore: Impossibile trovare la sezione con ID: ${sectionId}`);
    return;
  }

  // Clona la sezione per pulirla prima di salvarla
  const sectionClone = sectionElement.cloneNode(true);

  // Rimuovi gli attributi di animazione per evitare che si riattivino al ricaricamento
  sectionClone.querySelectorAll('[data-aos]').forEach(el => el.removeAttribute('data-aos'));

  // Svuota il contenitore della toolbar per non salvare i pulsanti dell'editor
  const toolbar = sectionClone.querySelector('[id$="-toolbar"]'); // Trova qualsiasi id che finisce con -toolbar
  if (toolbar) toolbar.innerHTML = '';

  // Pulisci gli attributi e le classi aggiunte da TinyMCE agli elementi editabili
  sectionClone.querySelectorAll('[contenteditable]').forEach(el => {
    el.removeAttribute('contenteditable');
    el.removeAttribute('spellcheck');
    el.removeAttribute('data-mce-style');
    el.removeAttribute('data-mce-bogus');
    if (el.id && el.id.startsWith('mce_')) {
      el.removeAttribute('id');
    }
  });

  const finalHtml = sectionClone.outerHTML;

  // Invia i dati al server
  fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file: filePath,
      content: finalHtml,
      scope: sectionId.substring(1) // Invia l'ID senza '#' come scope (es. 'hero')
    })
  })
  .then(res => res.text())
  .then(txt => {
    editor.setDirty(false);
    if (txt.trim() === 'success') {
      alert('Sezione salvata con successo!');
      setTimeout(() => location.reload(), 500); // Ricarica per vedere le modifiche
    } else {
      alert(`Errore durante il salvataggio:\n${txt}`);
    }
  })
  .catch(err => {
    alert(`Errore di rete: ${err.message}`);
    console.error(err);
  });
}

/**
 * Inizializza gli editor TinyMCE per una data sezione.
 * @param {object} config - Oggetto di configurazione.
 * @param {string} config.sectionId - L'ID della sezione che contiene gli elementi editabili.
 * @param {string} config.toolbarId - L'ID del div che conterrww 
 */
function initializeEditableSection(config) {
  const commonConfig = {
    menubar: false,
    inline: true,
    plugins: [ 'save', 'link', 'lists', 'autolink' ],
    // Rende il pulsante save attivo solo quando ci sono modifiche
    save_enablewhendirty: true,
    fixed_toolbar_container: config.toolbarId,
    save_onsavecallback: (editor) => {
      saveSectionContent(editor, config.sectionId, config.filePath);
    }
  };

  // Configurazione standard per i titoli
  const headingConfig = {
    ...commonConfig,
    selector: `${config.sectionId} .tinymce-heading`,
    toolbar: 'undo redo | bold italic underline | save',
    valid_elements: 'strong,em,span[style],a[href]',
    valid_styles: { '*': 'font-size,font-family,color,text-decoration,text-align' },
    powerpaste_word_import: 'clean',
    powerpaste_html_import: 'clean',
  };

  // Configurazione standard per i testi
  const bodyConfig = {
    ...commonConfig,
    selector: `${config.sectionId} .tinymce-body`,
    toolbar: [ 'undo redo | bold italic underline | fontfamily fontsize', 'forecolor backcolor | alignleft aligncenter alignright alignfull | numlist bullist outdent indent | link | save' ],
    valid_elements: 'p[style],strong,em,span[style],a[href],ul,ol,li',
    valid_styles: { '*': 'font-size,font-family,color,text-decoration,text-align' },
    powerpaste_word_import: 'clean',
    powerpaste_html_import: 'clean',
  };

  tinymce.init(headingConfig);
  tinymce.init(bodyConfig);
}
