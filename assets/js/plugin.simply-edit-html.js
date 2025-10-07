document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor) {
    return;
  }

  // Assicuriamoci che questo plugin si attivi solo se lo storage è customGithub
  if (window.editor.storage.getType() !== 'customGithub') {
    console.log('HTML Editor plugin disattivato: non si sta usando lo storage customGithub.');
    return;
  }

  console.log('Toolbars loaded, adding GitHub-aware HTML editor plugin.');

  const htmlEditorAction = function() {
    // Attendi che il repo sia disponibile
    if (!window.editor.storage.repo) {
        alert('Connessione al repository GitHub non ancora stabilita. Riprova tra qualche istante.');
        return;
    }

    let codeEditor;
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'custom-textarea-modal-overlay';
    Object.assign(modalOverlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: '100001', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    });

    const modalContent = document.createElement('div');
    Object.assign(modalContent.style, {
      backgroundColor: '#fefefe', padding: '20px', border: '1px solid #888',
      width: '80%', height: '80%', maxWidth: '1200px', boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column', position: 'relative'
    });

    modalContent.innerHTML = `
      <div style=\"display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #ccc;">
        <h2 style=\"margin: 0; font-family: sans-serif;">Editor HTML della Sezione &lt;main&gt;</h2>
        <div>
          <button id=\"modal-save-html-button\" style=\"padding: 8px 15px; background-color: #28a745; color: white; border: none; cursor: pointer; margin-right: 10px;">Salva HTML e Committa su GitHub</button>
          <button id=\"modal-close-button\" style=\"padding: 8px 15px; background-color: #6c757d; color: white; border: none; cursor: pointer;">&times; Annulla</button>
        </div>
      </div>
      <textarea id=\"html-editor-textarea\" style=\"width: 100%; height: 100%; flex-grow: 1; margin-top: 15px; font-family: monospace; font-size: 14px; resize: none;"></textarea>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const textarea = document.getElementById('html-editor-textarea');
    const mainElement = document.querySelector('main.main');
    if (mainElement) {
        textarea.value = mainElement.innerHTML;
    }
    textarea.focus();

    const closeModal = () => document.body.removeChild(modalOverlay);
    document.getElementById('modal-close-button').onclick = closeModal;
    
    document.getElementById('modal-save-html-button').onclick = () => {
      const newMainHtml = textarea.value;
      let filePath = window.location.pathname;

      // Pulisce il percorso per GitHub Pages
      const repoName = editor.storage.repoName;
      if (window.location.hostname.includes('github.io') && repoName) {
        const repoPrefix = '/' + repoName;
        if (filePath.startsWith(repoPrefix)) {
          filePath = filePath.substring(repoPrefix.length);
        }
      }
      // Rimuovi lo slash iniziale se presente, perché il repo.read/write non lo vuole
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }

      // 1. Leggi il contenuto attuale del file intero dal repo
      editor.storage.repo.read(editor.storage.repoBranch, filePath, (err, currentFileContent) => {
        if (err) {
          alert('Errore: impossibile leggere il file dal repository GitHub.');
          console.error(err);
          return;
        }

        // 2. Usa DOMParser per manipolare l'HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentFileContent, 'text/html');
        const main = doc.querySelector('main.main');

        if (!main) {
          alert('Errore: impossibile trovare la sezione <main> nel file.');
          return;
        }

        // 3. Sostituisci il contenuto di <main>
        main.innerHTML = newMainHtml;

        // 4. Riconverti il documento in stringa HTML
        const updatedFileContent = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
        const commitMessage = `Aggiornamento HTML di <main> per ${filePath}`;

        // 5. Scrivi il file aggiornato su GitHub
        editor.storage.repo.write(editor.storage.repoBranch, filePath, updatedFileContent, commitMessage, (writeErr) => {
          if (writeErr) {
            alert('Errore durante il salvataggio su GitHub.');
            console.error(writeErr);
            return;
          }

          alert('File HTML aggiornato e committato su GitHub con successo! La pagina verrà ricaricata.');
          window.location.reload();
        });
      });
    };
  };

  editor.addAction('custom-html-editor', htmlEditorAction);

  const mainToolbarUl = document.querySelector('#simply-main-toolbar .simply-buttons');
  if (mainToolbarUl) {
    const newButtonLi = document.createElement('li');
    newButtonLi.innerHTML = `
      <button data-simply-action=\"custom-html-editor\" title=\"Modifica HTML della sezione <main>\">
        <i class=\"fa fa-file-code-o\"></i> Edit Main HTML
      </button>
    `;
    const saveButtonLi = mainToolbarUl.querySelector('button[data-simply-action="simply-save"]').parentElement;
    if (saveButtonLi && saveButtonLi.nextSibling) {
        mainToolbarUl.insertBefore(newButtonLi, saveButtonLi.nextSibling);
    } else {
        mainToolbarUl.appendChild(newButtonLi);
    }
  }
});
