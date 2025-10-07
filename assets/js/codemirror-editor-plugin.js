document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor) {
    return;
  }

  // Questo plugin aggiunge solo il pulsante e la UI, la logica di salvataggio è nello storage.
  console.log('Toolbars loaded, adding UI for HTML editor plugin.');

  const bodyEditorAction = function() {
    const existingModal = document.getElementById('manual-editor-modal-overlay');
    if (existingModal) {
      existingModal.style.display = 'flex';
      return;
    }

    let codeEditor;
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'manual-editor-modal-overlay';
    Object.assign(modalOverlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: '100001', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    });

    const modalContent = document.createElement('div');
    Object.assign(modalContent.style, {
      backgroundColor: '#282a36', padding: '15px', border: '1px solid #888',
      width: '85%', height: '85%', maxWidth: '1400px', boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column', position: 'relative'
    });

    modalContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #44475a;">
        <h2 style="margin: 0; font-family: sans-serif; color: #f8f8f2;">Editor HTML del &lt;body&gt;</h2>
        <div>
          <button id="modal-apply-preview" style="padding: 8px 15px; background-color: #8be9fd; color: #282a36; border: none; cursor: pointer; margin-right: 10px;">Applica Anteprima</button>
          <button id="modal-close-button" style="padding: 8px 15px; background-color: #6272a4; color: white; border: none; cursor: pointer;">Chiudi</button>
        </div>
      </div>
      <textarea id="html-editor-textarea"></textarea>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const textarea = document.getElementById('html-editor-textarea');
    if (editor.data.originalBody) {
        textarea.value = editor.data.originalBody.innerHTML;
    }

    codeEditor = CodeMirror.fromTextArea(textarea, {
      lineNumbers: true, mode: 'htmlmixed', theme: 'dracula',
      lineWrapping: true, autofocus: true, extraKeys: {"Ctrl-Space": "autocomplete"}
    });
    codeEditor.setSize('100%', 'calc(100% - 50px)');
    setTimeout(() => codeEditor.refresh(), 1);

    document.getElementById('modal-apply-preview').onclick = () => {
        try {
            const newBodyHtml = codeEditor.getValue();
            Array.from(document.body.children).forEach(child => {
                if (child.id !== 'manual-editor-modal-overlay' && child.id !== 'simply-editor' && child.tagName !== 'SCRIPT') {
                    child.remove();
                }
            });
            const tempBody = document.createElement('body');
            tempBody.innerHTML = newBodyHtml;
            Array.from(tempBody.children).forEach(newNode => {
                if (newNode.id !== 'manual-editor-modal-overlay' && newNode.id !== 'simply-editor' && newNode.tagName !== 'SCRIPT') {
                    document.body.appendChild(newNode);
                }
            });
            if (window.editor && editor.currentData) {
                editor.data.apply(editor.currentData, document.body);
            }
            alert('Anteprima applicata e dati sincronizzati.');
        } catch (e) {
            console.error("Errore durante l'applicazione dell'anteprima:", e);
            alert("Errore nell'HTML, impossibile applicare l'anteprima.");
        }
    };

    document.getElementById('modal-close-button').onclick = () => {
      modalOverlay.style.display = 'none';
    };
  };

  const saveHtmlAction = function() {
    // Cerca l'istanza dell'editor attiva, se esiste
    const modal = document.getElementById('manual-editor-modal-overlay');
    if (!modal || !modal.codeEditorInstance) {
      alert("Errore: l'editor non è aperto o non è stato trovato.");
      return;
    }

    if (!confirm("Sei sicuro di voler salvare le modifiche HTML all'intero body? Questa azione non può essere annullata e creerà un nuovo commit.")) {
        return;
    }

    // Prende l'HTML direttamente dall'editor, che è la fonte più pulita
    const newBodyHtml = modal.codeEditorInstance.getValue();
    
    let filePath = window.location.pathname;

    if (editor.storage.repoName && window.location.hostname.includes('github.io')) {
      const repoPrefix = '/' + editor.storage.repoName;
      if (filePath.startsWith(repoPrefix)) {
        filePath = filePath.substring(repoPrefix.length);
      }
    }
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }

    // Mostra una modale di attesa
    const dialog = document.createElement('section');
    dialog.id = 'deploy-status-dialog';
    dialog.className = 'simply-dialog simply-modal';
    dialog.innerHTML = `<div class="simply-dialog-body" style="padding: 20px;">Salvataggio e commit in corso...</div>`;
    editor.toolbarsContainer.appendChild(dialog);
    editor.plugins.dialog.open(dialog);
    const bodyEl = dialog.querySelector('.simply-dialog-body');

    // Chiama la funzione di salvataggio con l'HTML pulito dall'editor
    editor.storage.saveHtmlBlock(filePath, 'body', newBodyHtml, (result) => {
      if (result.error) {
        bodyEl.textContent = 'Errore: ' + result.message;
        console.error(result.details || '');
      } else {
        bodyEl.textContent = result.message + " La pagina verrà ricaricata.";
        setTimeout(() => window.location.reload(), 2000);
      }
    });
  };

  editor.addAction('custom-body-editor', bodyEditorAction);
  editor.addAction('custom-save-html', saveHtmlAction);

  const mainToolbarUl = document.querySelector('#simply-main-toolbar .simply-buttons');
  if (mainToolbarUl) {
    const editorButtonLi = document.createElement('li');
    editorButtonLi.innerHTML = `
      <button data-simply-action="custom-body-editor" title="Modifica HTML del <body>">
        <i class="fa fa-file-code-o"></i> Edit Body HTML
      </button>
    `;
    mainToolbarUl.appendChild(editorButtonLi);

    const saveHtmlButtonLi = document.createElement('li');
    saveHtmlButtonLi.innerHTML = `
      <button data-simply-action="custom-save-html" title="Salva e committa le modifiche all'HTML del body">
        <i class="fa fa-github"></i> Commit Body
      </button>
    `;
    mainToolbarUl.appendChild(saveHtmlButtonLi);
  }
});