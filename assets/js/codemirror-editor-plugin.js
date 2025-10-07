document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor || !editor.storage.saveHtmlBlock) {
    return;
  }

  console.log('Toolbars loaded, adding Body HTML editor plugin with Live Preview.');

  // Funzione Debounce per non chiamare l'update ad ogni tasto premuto
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  const bodyEditorAction = function() {
    let codeEditor;
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'live-editor-modal-overlay'; // ID univoco
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
        <h2 style="margin: 0; font-family: sans-serif; color: #f8f8f2;">Editor HTML del &lt;body&gt; (con Anteprima Live)</h2>
        <div>
          <button id="modal-save-body-button" style="padding: 8px 15px; background-color: #50fa7b; color: #282a36; border: none; cursor: pointer; margin-right: 10px; font-weight: bold;">Salva e Committa</button>
          <button id="modal-close-button" style="padding: 8px 15px; background-color: #6272a4; color: white; border: none; cursor: pointer;">&times; Annulla</button>
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
      lineNumbers: true,
      mode: 'htmlmixed',
      theme: 'dracula',
      lineWrapping: true,
      autofocus: true,
      extraKeys: {"Ctrl-Space": "autocomplete"}
    });
    codeEditor.setSize('100%', 'calc(100% - 50px)');
    setTimeout(() => codeEditor.refresh(), 1);

    // --- LOGICA ANTEPRIMA LIVE ---
    const updatePreview = () => {
        try {
            const newBodyHtml = codeEditor.getValue();
            
            // Svuota il body attuale, ma preserva gli elementi essenziali (la modale e gli script)
            Array.from(document.body.children).forEach(child => {
                if (child.id !== 'live-editor-modal-overlay' && child.tagName !== 'SCRIPT') {
                    child.remove();
                }
            });

            // Crea un body temporaneo per processare il nuovo HTML
            const tempBody = document.createElement('body');
            tempBody.innerHTML = newBodyHtml;

            // Reinserisci i nuovi nodi nel body reale
            Array.from(tempBody.children).forEach(newNode => {
                // Assicurati di non reinserire la modale o script dal codice nell'editor
                if (newNode.id !== 'live-editor-modal-overlay' && newNode.tagName !== 'SCRIPT') {
                    document.body.appendChild(newNode);
                }
            });

        } catch (e) {
            console.error("Errore durante l'aggiornamento dell'anteprima live:", e);
        }
    };

    codeEditor.on('change', debounce(updatePreview, 400));

    // --- GESTIONE FINESTRA ---
    const closeModal = () => {
        // Ricarica la pagina per ripristinare lo stato originale se non si salva
        window.location.reload();
    };
    document.getElementById('modal-close-button').onclick = closeModal;
    
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
          // Non serve ricaricare perché il salvataggio è l'azione finale
          document.body.removeChild(modalOverlay);
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