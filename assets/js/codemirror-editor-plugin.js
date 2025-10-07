document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor || !editor.storage.saveHtmlBlock) {
    return;
  }

  console.log('Toolbars loaded, adding Toggleable Body HTML editor plugin.');

  // Funzione Debounce
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  const bodyEditorAction = function() {
    const existingModal = document.getElementById('live-editor-modal-overlay');

    // Se la modale esiste già ed è nascosta, la riapre e basta.
    if (existingModal) {
      existingModal.style.display = 'flex';
      return;
    }

    // Se non esiste, crea la modale da zero.
    let codeEditor;
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'live-editor-modal-overlay';
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
          <button id="modal-restore-button" style="padding: 8px 15px; background-color: #ffb86c; color: #282a36; border: none; cursor: pointer; margin-right: 10px;">Ripristina</button>
          <button id="modal-save-body-button" style="padding: 8px 15px; background-color: #50fa7b; color: #282a36; border: none; cursor: pointer; margin-right: 10px; font-weight: bold;">Salva e Committa</button>
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

    const updatePreview = () => {
        try {
            const newBodyHtml = codeEditor.getValue();
            Array.from(document.body.children).forEach(child => {
                if (child.id !== 'live-editor-modal-overlay' && child.tagName !== 'SCRIPT') {
                    child.remove();
                }
            });
            const tempBody = document.createElement('body');
            tempBody.innerHTML = newBodyHtml;
            Array.from(tempBody.children).forEach(newNode => {
                if (newNode.id !== 'live-editor-modal-overlay' && newNode.tagName !== 'SCRIPT') {
                    document.body.appendChild(newNode);
                }
            });
        } catch (e) {
            console.error("Errore durante l'aggiornamento dell'anteprima live:", e);
        }
    };

    codeEditor.on('change', debounce(updatePreview, 400));

    // --- NUOVA LOGICA DEI PULSANTI ---
    document.getElementById('modal-close-button').onclick = () => {
      modalOverlay.style.display = 'none'; // Nasconde la modale
    };

    document.getElementById('modal-restore-button').onclick = () => {
      if(confirm('Sei sicuro di voler annullare tutte le modifiche? La pagina verrà ricaricata.')){
        window.location.reload(); // Ricarica per ripristinare lo stato originale
      }
    };
    
    document.getElementById('modal-save-body-button').onclick = () => {
      const newBodyHtml = codeEditor.getValue();
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

      editor.storage.saveHtmlBlock(filePath, 'body', newBodyHtml, (result) => {
        if (result.error) {
          alert(result.message);
          console.error(result.details || '');
        } else {
          alert(result.message);
          document.body.removeChild(modalOverlay); // Rimuove la modale dopo un salvataggio riuscito
        }
      });
    };
  };

  editor.addAction('custom-body-editor', bodyEditorAction);

  const mainToolbarUl = document.querySelector('#simply-main-toolbar .simply-buttons');
  if (mainToolbarUl) {
    const newButtonLi = document.createElement('li');
    newButtonLi.innerHTML = `
      <button data-simply-action="custom-body-editor" title="Modifica HTML del <body> con anteprima live">
        <i class="fa fa-file-code-o"></i> Edit Body HTML
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
