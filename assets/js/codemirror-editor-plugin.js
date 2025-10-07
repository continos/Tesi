document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor) {
    return;
  }

  // Questo plugin aggiunge solo il pulsante e la UI, la logica di salvataggio è nello storage.
  console.log('Toolbars loaded, adding UI for HTML editor plugin.');

  const htmlEditorAction = function() {
    const modalOverlay = document.createElement('div');
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
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #ccc;">
        <h2 style="margin: 0; font-family: sans-serif;">Editor HTML della Sezione &lt;main&gt;</h2>
        <div>
          <button id="modal-save-html-button" style="padding: 8px 15px; background-color: #28a745; color: white; border: none; cursor: pointer; margin-right: 10px;">Salva e Committa</button>
          <button id="modal-close-button" style="padding: 8px 15px; background-color: #6c757d; color: white; border: none; cursor: pointer;">&times; Annulla</button>
        </div>
      </div>
      <textarea id="html-editor-textarea" style="width: 100%; height: 100%; flex-grow: 1; margin-top: 15px; font-family: monospace; font-size: 14px; resize: none;"></textarea>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const textarea = document.getElementById('html-editor-textarea');
    const mainElement = editor.data.originalBody.querySelector('main.main');
    if (mainElement) {
        textarea.value = mainElement.innerHTML;
    }
    textarea.focus();

    const closeModal = () => document.body.removeChild(modalOverlay);
    document.getElementById('modal-close-button').onclick = closeModal;
    
    document.getElementById('modal-save-html-button').onclick = () => {
      const newMainHtml = textarea.value;
      let filePath = window.location.pathname;

      // Pulisce il percorso per GitHub Pages, se necessario
      if (editor.storage.repoName && window.location.hostname.includes('github.io')) {
        const repoPrefix = '/' + editor.storage.repoName;
        if (filePath.startsWith(repoPrefix)) {
          filePath = filePath.substring(repoPrefix.length);
        }
      }
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }

      // Chiama la funzione generica dello storage, senza sapere quale sia
      editor.storage.saveMainHtml(filePath, newMainHtml, (result) => {
        if (result.error) {
          alert(result.message);
          console.error(result.details || '');
        } else {
          alert(result.message);
          window.location.reload();
        }
      });
    };
  };

  editor.addAction('custom-html-editor', htmlEditorAction);

  const mainToolbarUl = document.querySelector('#simply-main-toolbar .simply-buttons');
  if (mainToolbarUl) {
    const newButtonLi = document.createElement('li');
    newButtonLi.innerHTML = `
      <button data-simply-action="custom-html-editor" title="Modifica HTML della sezione <main>">
        <i class="fa fa-file-code-o"></i> Edit Main HTML
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
