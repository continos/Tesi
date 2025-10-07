document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor || !editor.storage.saveHtmlBlock) {
    return;
  }

  console.log('Toolbars loaded, adding GitHub-powered HTML editor plugin.');

  let activeCodeEditorInstance = null;

  const bodyEditorAction = function() {
    const existingModal = document.getElementById('manual-editor-modal-overlay');
    if (existingModal) {
      existingModal.style.display = 'flex';
      if (activeCodeEditorInstance) {
        activeCodeEditorInstance.focus();
        activeCodeEditorInstance.refresh();
      }
      return;
    }

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
      <textarea id="html-editor-textarea">Caricamento del contenuto da GitHub...</textarea>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const textarea = document.getElementById('html-editor-textarea');
    
    // --- NUOVA LOGICA: Carica l'HTML direttamente da GitHub ---
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

    editor.storage.repo.read(editor.storage.repoBranch, filePath, (err, fileContent) => {
      if (err) {
        textarea.value = "Errore nel caricamento del file da GitHub.";
        return;
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileContent, 'text/html');
      textarea.value = doc.body.innerHTML;

      // Inizializza CodeMirror solo dopo aver caricato il contenuto
      activeCodeEditorInstance = CodeMirror.fromTextArea(textarea, {
        lineNumbers: true, mode: 'htmlmixed', theme: 'dracula',
        lineWrapping: true, autofocus: true, extraKeys: {"Ctrl-Space": "autocomplete"}
      });
      activeCodeEditorInstance.setSize('100%', 'calc(100% - 50px)');
      setTimeout(() => activeCodeEditorInstance.refresh(), 1);
    });

    document.getElementById('modal-apply-preview').onclick = () => {
        if (!activeCodeEditorInstance) return;
        try {
            const newBodyHtml = activeCodeEditorInstance.getValue();
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
            modalOverlay.style.display = 'none';
        } catch (e) {
            alert("Errore nell'HTML, impossibile applicare l'anteprima.");
        }
    };

    document.getElementById('modal-close-button').onclick = () => {
      modalOverlay.style.display = 'none';
    };
  };

  const saveHtmlAction = function() {
    if (!activeCodeEditorInstance) {
      alert("Azione non disponibile. Apri prima l'editor 'Edit Body HTML' per caricare il contenuto.");
      return;
    }
    if (!confirm("Sei sicuro di voler salvare le modifiche all'HTML del body? L'azione creerà un nuovo commit.")) {
        return;
    }

    const newBodyHtml = activeCodeEditorInstance.getValue();
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

    const dialog = document.createElement('section');
    dialog.id = 'deploy-status-dialog';
    dialog.className = 'simply-dialog simply-modal';
    dialog.innerHTML = `<div class="simply-dialog-body" style="padding: 20px;">Salvataggio e commit in corso...</div>`;
    editor.toolbarsContainer.appendChild(dialog);
    editor.plugins.dialog.open(dialog);
    const bodyEl = dialog.querySelector('.simply-dialog-body');

    editor.storage.saveHtmlBlock(filePath, 'body', newBodyHtml, (result) => {
      if (result.error) {
        bodyEl.textContent = 'Errore: ' + result.message;
        return;
      }
      
      const newCommitSha = result.commitSha;
      const { repoUser, repoName } = editor.storage;
      bodyEl.innerHTML = `Commit ${newCommitSha.substring(0,7)} creato! <br> In attesa del deploy...`;

      const pollDeploy = () => {
        const apiUrl = `https://api.github.com/repos/${repoUser}/${repoName}/deployments`;
        fetch(apiUrl, { headers: { 'Accept': 'application/vnd.github.v3+json' } })
          .then(res => res.json())
          .then(deployments => {
            const latestDeployment = deployments.find(d => d.sha === newCommitSha);
            if (latestDeployment) {
              fetch(latestDeployment.statuses_url, { headers: { 'Accept': 'application/vnd.github.v3+json' } })
                .then(res => res.json())
                .then(statuses => {
                  const latestStatus = statuses[0];
                  if (latestStatus && latestStatus.state === 'success') {
                    bodyEl.innerHTML = "Deploy completato! La pagina verrà ricaricata.";
                    setTimeout(() => window.location.reload(), 2000);
                  } else {
                    bodyEl.innerHTML += ".";
                    setTimeout(pollDeploy, 15000);
                  }
                }).catch(() => setTimeout(pollDeploy, 15000));
            } else {
              bodyEl.innerHTML += "-";
              setTimeout(pollDeploy, 15000);
            }
          }).catch(() => setTimeout(pollDeploy, 15000));
      };
      setTimeout(pollDeploy, 20000);
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