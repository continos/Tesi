document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor || !editor.storage.saveHtmlBlock) {
    return;
  }

  console.log('Toolbars loaded, adding GitHub-powered HTML editor plugin.');

  let htmlEditor, jsonEditor; // Riferimenti globali agli editor

  const bodyEditorAction = function() {
    const existingModal = document.getElementById('manual-editor-modal-overlay');
    if (existingModal) {
      existingModal.style.display = 'flex';
      if (htmlEditor) setTimeout(() => htmlEditor.refresh(), 1);
      if (jsonEditor) setTimeout(() => jsonEditor.refresh(), 1);
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
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #44475a; flex-shrink: 0;">
        <div id="editor-tabs">
          <button class="editor-tab active" data-editor="html">HTML Body</button>
          <button class="editor-tab" data-editor="json">JSON Data</button>
        </div>
        <div>
          <button id="modal-apply-preview" style="padding: 8px 15px; background-color: #8be9fd; color: #282a36; border: none; cursor: pointer; margin-right: 10px;">Applica Anteprima</button>
          <button id="modal-close-button" style="padding: 8px 15px; background-color: #6272a4; color: white; border: none; cursor: pointer;">Chiudi</button>
        </div>
      </div>
      <div id="editor-container" style="flex-grow: 1; position: relative; margin-top: 10px;">
        <div id="html-editor-wrapper" class="editor-wrapper active">
          <textarea id="html-editor-textarea">Caricamento HTML da GitHub...</textarea>
        </div>
        <div id="json-editor-wrapper" class="editor-wrapper">
          <textarea id="json-editor-textarea">Caricamento JSON da GitHub...</textarea>
        </div>
      </div>
      <style>
        .editor-tab { padding: 8px 12px; border: 1px solid #44475a; background-color: #282a36; color: #f8f8f2; cursor: pointer; }
        .editor-tab.active { background-color: #44475a; border-bottom-color: #44475a; }
        .editor-wrapper { display: none; width: 100%; height: 100%; }
        .editor-wrapper.active { display: block; }
      </style>
    `;

    let pageData = {}; // Conterrà la sezione del data.json per la pagina corrente

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    modalContent.addEventListener('wheel', function(event) {
          event.stopPropagation();
      });

    const htmlTextarea = document.getElementById('html-editor-textarea');
    const jsonTextarea = document.getElementById('json-editor-textarea');

    // --- GESTIONE SCHEDE ---
    const tabButtons = modalContent.querySelectorAll('.editor-tab');
    const editorWrappers = modalContent.querySelectorAll('.editor-wrapper');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const editorId = button.dataset.editor;
        tabButtons.forEach(btn => btn.classList.remove('active'));
        editorWrappers.forEach(wrapper => wrapper.classList.remove('active'));
        button.classList.add('active');
        modalContent.querySelector(`#${editorId}-editor-wrapper`).classList.add('active');
        // Refresh dell'editor quando diventa visibile
        if (editorId === 'html' && htmlEditor) setTimeout(() => htmlEditor.refresh(),1);
        if (editorId === 'json' && jsonEditor) setTimeout(() => jsonEditor.refresh(),1);
      });
    });

    // --- LOGICA DI CARICAMENTO DATI ---
    let filePath = window.location.pathname;
    if (editor.storage.repoName && window.location.hostname.includes('github.io')) {
      const repoPrefix = '/' + editor.storage.repoName;
      if (filePath.startsWith(repoPrefix)) {
        filePath = filePath.substring(repoPrefix.length);
      }
    }
    const pageKey = filePath; // La chiave per il data.json
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }

    // 1. Carica HTML
    editor.storage.repo.read(editor.storage.repoBranch, filePath, (err, fileContent) => {
      if (err) {
        htmlTextarea.value = "Errore nel caricamento del file HTML da GitHub.";
        return;
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileContent, 'text/html');
      htmlTextarea.value = doc.body.innerHTML;
      htmlEditor = CodeMirror.fromTextArea(htmlTextarea, {
        lineNumbers: true, mode: 'htmlmixed', theme: 'dracula', lineWrapping: true
      });
      htmlEditor.setSize('100%', '100%');
      setTimeout(() => htmlEditor.refresh(), 1);
    });

    // 2. Carica JSON
    editor.storage.repo.read(editor.storage.repoBranch, 'data.json', (err, dataJsonContent) => {
      if (err) {
        jsonTextarea.value = "Errore nel caricamento di data.json da GitHub.";
        return;
      }
      const allData = JSON.parse(dataJsonContent);
      pageData = allData[pageKey] || {};
      jsonTextarea.value = JSON.stringify(pageData, null, 2); // Formattato per leggibilità
      jsonEditor = CodeMirror.fromTextArea(jsonTextarea, {
        lineNumbers: true, mode: { name: 'javascript', json: true }, theme: 'dracula', lineWrapping: true
      });
      jsonEditor.setSize('100%', '100%');
    });
    // LOGICA PULSANTE ANTEPRIMA
    document.getElementById('modal-apply-preview').onclick = () => {
      if (!htmlEditor || !jsonEditor) { alert('Editor non pronti.'); return; }
      try {
          const newPageData = JSON.parse(jsonEditor.getValue());
          editor.currentData[pageKey] = newPageData;

          const newBodyHtml = htmlEditor.getValue();
          Array.from(document.body.children).forEach(child => {
              if (child.id !== 'dual-editor-modal-overlay' && child.id !== 'simply-editor' && child.tagName !== 'SCRIPT') {
                  child.remove();
              }
          });
          const tempBody = document.createElement('body');
          tempBody.innerHTML = newBodyHtml;
          Array.from(tempBody.children).forEach(newNode => {
              if (newNode.id !== 'dual-editor-modal-overlay' && newNode.id !== 'simply-editor' && newNode.tagName !== 'SCRIPT') {
                  document.body.appendChild(newNode);
              }
          });
          editor.data.apply(editor.currentData, document.body);
          modalOverlay.style.display = 'none';
      } catch (e) {
          alert("Errore nell'applicare l'anteprima. Controlla la sintassi del JSON.\n"+ e.message);
      }
    };

    document.getElementById('modal-close-button').onclick = () => {
      modalOverlay.style.display = 'none';
    };
  };

  const saveHtmlAction = function() {
    if (!htmlEditor || !jsonEditor) {
      alert("Apri prima l'editor 'Edit Page' per caricare i contenuti.");
      return;
    }
    if (!confirm("Sei sicuro di voler salvare le modifiche all'HTML e JSON? L'azione creerà fino a due nuovi commit.")) {
        return;
    }

    const newBodyHtml = htmlEditor.getValue();
    const newPageData = JSON.parse(jsonEditor.getValue());
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
    dialog.innerHTML = `<div class="simply-dialog-body" style="padding: 20px;">Salvataggio in corso...</div>`;
    editor.toolbarsContainer.appendChild(dialog);
    editor.plugins.dialog.open(dialog);
    const bodyEl = dialog.querySelector('.simply-dialog-body');

    /*editor.storage.saveHtmlBlock(filePath, 'body', newBodyHtml, (result) => {
      if (result.error) {
        bodyEl.textContent = 'Errore: ' + result.message;
        return;
      }
      
      const newCommitSha = result.commitSha;
      const { repoUser, repoName } = editor.storage;
      bodyEl.innerHTML = `Commit ${newCommitSha.substring(0,7)} creato! <br> In attesa del deploy...`;*/

      bodyEl.textContent = 'Salvataggio di data.json...';
      editor.storage.repo.read(editor.storage.repoBranch, 'data.json', (err, currentJsonContent) => {
        let allData = {};
        if (!err) allData = JSON.parse(currentJsonContent);
        allData[pageKey] = newPageData;

        editor.storage.repo.write(editor.storage.repoBranch, 'data.json', JSON.stringify(allData, null, 2), `Update data for ${pageKey}`, (err, commit1) => {
          if(err) { bodyEl.textContent = 'Errore salvataggio data.json'; return; }

          bodyEl.textContent = 'Salvataggio del file HTML...';
          editor.storage.saveHtmlBlock(githubPath, 'body', newBodyHtml, (result) => {
            if (result.error) {
                bodyEl.textContent = 'Errore: ' + result.message;
                return;
            }
            // Usa l'hash dell'ultimo commit (quello dell'HTML) per il polling
            const newCommitSha = result.commitSha;
            bodyEl.innerHTML = `Commit ${newCommitSha.substring(0,7)} creato! <br> In   attesa del deploy...`;
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
        });
      });
  };

  editor.addAction('custom-body-editor', bodyEditorAction);
  editor.addAction('custom-save-html', saveHtmlAction);

  const mainToolbarUl = document.querySelector('#simply-main-toolbar .simply-buttons');
  if (mainToolbarUl) {
    const editorButtonLi = document.createElement('li');
    editorButtonLi.innerHTML = `
      <button data-simply-action="custom-body-editor" title="Modifica HTML del <body>">
        <i class="fa fa-file-code-o"></i> Edit Page
      </button>
    `;
    mainToolbarUl.appendChild(editorButtonLi);

    const saveHtmlButtonLi = document.createElement('li');
    saveHtmlButtonLi.innerHTML = `
      <button data-simply-action="custom-save-html" title="Salva e committa le modifiche all'HTML del body">
        <i class="fa fa-github"></i> Commit All
      </button>
    `;
    mainToolbarUl.appendChild(saveHtmlButtonLi);
  }
});