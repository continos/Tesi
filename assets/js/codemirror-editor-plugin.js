document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor || !editor.storage.saveHtmlBlock) {
    return;
  }
  if (typeof CodeMirror === 'undefined') {
    console.error('CodeMirror non è caricato nella pagina');
    return;
  }

  console.log('Toolbars loaded, adding GitHub-powered HTML editor plugin.');

  let htmlEditor, jsonEditor, cssEditor;
  let currentPageKey = '';
  let cssFiles = {};
  let currentCssFile = '';
  let modalInitialized = false;
  let cssFilesLoaded = false; // FLAG per evitare ricaricamenti

  const bodyEditorAction = function() {
    const existingModal = document.getElementById('manual-editor-modal-overlay');
    if (existingModal) {
      existingModal.style.display = 'flex';
      if (modalInitialized) {
        if (htmlEditor) setTimeout(() => htmlEditor.refresh(), 1);
        if (cssEditor) setTimeout(() => cssEditor.refresh(), 1);
        if (jsonEditor) setTimeout(() => jsonEditor.refresh(), 1);
        const activeTab = existingModal.querySelector('.editor-tab.active');
        if (activeTab && activeTab.dataset.editor === 'css') {
          document.getElementById('css-files-tabs').style.display = 'block';
        }
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
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #44475a; flex-shrink: 0;">
        <div id="editor-tabs">
          <button class="editor-tab active" data-editor="html">HTML Body</button>
          <button class="editor-tab" data-editor="css">CSS Files</button>
          <button class="editor-tab" data-editor="json">JSON Data</button>
        </div>
        <div>
          <button id="modal-apply-preview" style="padding: 8px 15px; background-color: #8be9fd; color: #282a36; border: none; cursor: pointer; margin-right: 10px;">Applica Anteprima</button>
          <button id="modal-close-button" style="padding: 8px 15px; background-color: #6272a4; color: white; border: none; cursor: pointer;">Chiudi</button>
        </div>
      </div>
      <div id="css-files-tabs" style="display: none; border-bottom: 1px solid #44475a; padding: 5px 0; flex-shrink: 0;">
      </div>
      <div id="editor-container" style="flex-grow: 1; position: relative; margin-top: 10px; overflow: hidden; min-height: 0;">
        <div id="html-editor-wrapper" class="editor-wrapper active">
          <textarea id="html-editor-textarea">Caricamento HTML da GitHub...</textarea>
        </div>
        <div id="css-editor-wrapper" class="editor-wrapper">
          <textarea id="css-editor-textarea">Seleziona un file CSS dal menu sopra...</textarea>
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
        .CodeMirror { height: 100% !important; }
        .CodeMirror-foldgutter { width: 15px; }
        .CodeMirror-foldmarker { color: #8be9fd; cursor: pointer; }
        #css-files-tabs { display: none; }
        .css-file-tab { padding: 6px 10px; margin: 0 2px; border: 1px solid #44475a; background-color: #282a36; color: #f8f8f2; cursor: pointer; }
        .css-file-tab.active { background-color: #44475a; border-color: #8be9fd; }
      </style>
    `;

    let pageData = {};

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    modalContent.addEventListener('wheel', function(event) {
      event.stopPropagation();
    });

    const htmlTextarea = document.getElementById('html-editor-textarea');
    const cssTextArea = document.getElementById('css-editor-textarea');
    const jsonTextarea = document.getElementById('json-editor-textarea');

    // GESTIONE SCHEDE
    const tabButtons = modalContent.querySelectorAll('.editor-tab');
    const editorWrappers = modalContent.querySelectorAll('.editor-wrapper');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const editorId = button.dataset.editor;
        tabButtons.forEach(btn => btn.classList.remove('active'));
        editorWrappers.forEach(wrapper => wrapper.classList.remove('active'));
        button.classList.add('active');
        modalContent.querySelector(`#${editorId}-editor-wrapper`).classList.add('active');
        
        const cssFilesTabs = document.getElementById('css-files-tabs');
        if (editorId === 'css') {
          cssFilesTabs.style.display = 'block';
          // CARICA I FILE CSS SOLO LA PRIMA VOLTA
          if (!cssFilesLoaded) {
            loadCSSFiles();
            cssFilesLoaded = true;
          }
        } else {
          cssFilesTabs.style.display = 'none';
        }
        
        if (editorId === 'html' && htmlEditor) setTimeout(() => htmlEditor.refresh(),1);
        if (editorId === 'json' && jsonEditor) {
          // Sincronizza il modello dati interno di SimplyEdit con lo stato attuale del DOM
          const freshData = editor.list.get(document);
          editor.currentData = freshData;

          // Raccogli tutti i path usati nella pagina corrente
          const pathsInUse = new Set([currentPageKey]); // Aggiungi sempre il path della pagina corrente
          document.querySelectorAll('[data-simply-path]').forEach(el => {
            pathsInUse.add(el.getAttribute('data-simply-path'));
          });

          // Costruisci un oggetto JSON virtuale con solo i dati pertinenti
          const relevantData = {};
          pathsInUse.forEach(path => {
            if (editor.currentData[path]) {
              relevantData[path] = editor.currentData[path];
            }
          });

          // Popola l'editor con i dati pertinenti
          jsonEditor.setValue(JSON.stringify(relevantData, null, 2));
          setTimeout(() => jsonEditor.refresh(), 1);
        }
        if (editorId === 'css' && cssEditor) setTimeout(() => cssEditor.refresh(),1);
      });
    });

    // Logica caricamento file css
    const loadCSSFiles = () => {
      const cssFilesTabs = document.getElementById('css-files-tabs');
      cssFilesTabs.innerHTML = '<span style="color: #f8f8f2; padding: 0 10px;">Caricamento file CSS...</span>';
      
      const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      const cssFilesList = cssLinks.map(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('data:') || href.startsWith('http') || !href.includes('.css')) {
          return null;
        }
        return href.split('?')[0].split('#')[0];
      }).filter(filename => filename && !filename.startsWith('http'));
      
      cssFiles = {};
      let filesLoaded = 0;
      
      if (cssFilesList.length === 0) {
        cssFilesTabs.innerHTML = '<span style="color: #ff5555; padding: 0 10px;">Nessun file CSS locale trovato</span>';
        return;
      }
      
      cssFilesList.forEach(filename => {
        editor.storage.repo.read(editor.storage.repoBranch, filename, (err, content) => {
          filesLoaded++;
          
          if (err) {
            cssFiles[filename] = `/* Errore nel caricamento di ${filename} */`;
          } else {
            cssFiles[filename] = content;
          }
          
          if (filesLoaded === cssFilesList.length) {
            renderCSSTabs();
          }
        });
      });
    };

    const renderCSSTabs = () => {
      const cssFilesTabs = document.getElementById('css-files-tabs');
      cssFilesTabs.innerHTML = '';
      
      Object.keys(cssFiles).forEach(filename => {
        const tab = document.createElement('button');
        tab.className = 'css-file-tab';
        tab.textContent = filename;
        tab.dataset.filename = filename;
        
        tab.addEventListener('click', () => {
          document.querySelectorAll('.css-file-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          
          // SALVA LE MODIFICHE DEL FILE PRECEDENTE
          if (currentCssFile && cssEditor) {
            cssFiles[currentCssFile] = cssEditor.getValue();
          }
          
          // CARICA IL NUOVO FILE
          currentCssFile = filename;
          cssEditor.setValue(cssFiles[filename] || '/* Caricamento... */');
          setTimeout(() => cssEditor.refresh(), 1);
        });
        
        cssFilesTabs.appendChild(tab);
      });
      
      const firstTab = cssFilesTabs.querySelector('.css-file-tab');
      if (firstTab) {
        firstTab.click();
      }
    };

    // LOGICA DI CARICAMENTO DATI
    let filePath = window.location.pathname;
    if (editor.storage.repoName && window.location.hostname.includes('github.io')) {
      const repoPrefix = '/' + editor.storage.repoName;
      if (filePath.startsWith(repoPrefix)) {
        filePath = filePath.substring(repoPrefix.length);
      }
    }
    currentPageKey = filePath;
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
        lineNumbers: true, mode: 'htmlmixed', theme: 'dracula', lineWrapping: true, foldGutter:true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"], matchTags: {bothTags: true}, autoCloseTags: true 
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
      pageData = allData[currentPageKey] || {};
      jsonTextarea.value = JSON.stringify(pageData, null, 2);
      jsonEditor = CodeMirror.fromTextArea(jsonTextarea, {
        lineNumbers: true, mode: { name: 'javascript', json: true }, theme: 'dracula', lineWrapping: true, 
        foldGutter:true, gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
      });
      jsonEditor.setSize('100%', '100%');

      // AGGIORNA IL CONTENUTO JSON ALL'APERTURA DEL MODALE
      const freshData = editor.list.get(document);
      editor.currentData = freshData;
      const pathsInUse = new Set([currentPageKey]);
      document.querySelectorAll('[data-simply-path]').forEach(el => {
        pathsInUse.add(el.getAttribute('data-simply-path'));
      });
      const relevantData = {};
      pathsInUse.forEach(path => {
        if (editor.currentData[path]) {
          relevantData[path] = editor.currentData[path];
        }
      });
      jsonEditor.setValue(JSON.stringify(relevantData, null, 2));
    });
    
    // 3. Carica CSS
    cssEditor = CodeMirror.fromTextArea(cssTextArea, {
      lineNumbers: true, mode: 'css', theme: 'dracula', lineWrapping: true,
      foldGutter: true, gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    });
    cssEditor.setSize('100%', '100%');

    // LOGICA PULSANTE ANTEPRIMA
    document.getElementById('modal-apply-preview').onclick = () => {
      if (!htmlEditor || !jsonEditor || !cssEditor) { 
        alert('Editor non pronti.'); 
        return; 
      }
      
      try {
        // SALVA LE MODIFICHE CSS CORRENTI
        if (currentCssFile && cssEditor) {
          cssFiles[currentCssFile] = cssEditor.getValue();
        }
        
        let newPageData;
        try {
          newPageData = JSON.parse(jsonEditor.getValue());
        } catch (e) {
          alert("Errore nella sintassi JSON: " + e.message);
          return;
        }
        // "Spacchetta" l'oggetto virtuale e aggiorna le sezioni corrette in editor.currentData
        for (const path in newPageData) {
          if (Object.prototype.hasOwnProperty.call(newPageData, path)) {
            editor.currentData[path] = newPageData[path];
          }
        }

        const newBodyHtml = htmlEditor.getValue();
        
        // Applica CSS modificato
        if (currentCssFile && cssEditor) {
          const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
          cssLinks.forEach(link => {
            const href = link.getAttribute('href').split('?')[0].split('#')[0];
            if (href === currentCssFile) {
              const newStyle = document.createElement('style');
              newStyle.innerHTML = cssEditor.getValue();
              document.head.appendChild(newStyle);
              link.disabled = true;
            }
          });
        }

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
        
        editor.data.apply(editor.currentData, document.body);
        // FORZA LA RE-INIZIALIZZAZIONE DI TUTTI GLI EDITOR SUL NUOVO DOM
        editor.editmode.makeEditable(document.body);

        // FORZA UN AGGIORNAMENTO GLOBALE per renderizzare le liste create dinamicamente
        setTimeout(() => editor.fireEvent('databinding:valuechanged', document.body), 100);
        
        // NON CHIUDERE IL MODAL - mantieni gli editor aperti
        modalOverlay.style.display = 'none';
        
      } catch (e) {
        alert("Errore nell'applicare l'anteprima. Controlla la sintassi del JSON.\n"+ e.message);
      }
    };

    document.getElementById('modal-close-button').onclick = () => {
      // SALVA LE MODIFICHE CSS PRIMA DI CHIUDERE
      if (currentCssFile && cssEditor) {
        cssFiles[currentCssFile] = cssEditor.getValue();
      }
      modalOverlay.style.display = 'none';
    };
    
    modalInitialized = true;
  };

  // LOGICA PULSANTE COMMIT 
  const saveHtmlAction = async function() {
    // --- INIZIO BLOCCO DI SINCRONIZZAZIONE ---
    // Trasformato in una funzione asincrona per garantire che i dati siano caricati prima di procedere.
    const syncEditors = async () => {
      if (!editor.currentData) return;

      const freshData = editor.list.get(document);
      editor.currentData = freshData;

      const pathsInUse = new Set([currentPageKey]);
      document.querySelectorAll('[data-simply-path]').forEach(el => {
        pathsInUse.add(el.getAttribute('data-simply-path'));
      });

      const relevantData = {};
      pathsInUse.forEach(path => {
        if (editor.currentData[path]) {
          relevantData[path] = editor.currentData[path];
        }
      });

      if (jsonEditor) {
        jsonEditor.setValue(JSON.stringify(relevantData, null, 2));
      }

      if (htmlEditor) {
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
        
        // Usa una Promise per attendere il caricamento asincrono dell'HTML
        await new Promise(resolve => {
          editor.storage.repo.read(editor.storage.repoBranch, filePath, (err, fileContent) => {
            if (!err) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(fileContent, 'text/html');
              htmlEditor.setValue(doc.body.innerHTML);
            }
            resolve(); // Risolvi la promise anche in caso di errore per non bloccare tutto
          });
        });
      }
    };

    await syncEditors(); // Attendi il completamento della sincronizzazione
    // --- FINE BLOCCO DI SINCRONIZZAZIONE ---

    if (!htmlEditor || !jsonEditor) {
      // Questo controllo ora è ridondante se il modale non è mai stato aperto, ma lo teniamo per sicurezza.
      alert("L'editor non è stato inizializzato. Apri prima 'Edit Page'.");
      return;
    }
    if (!confirm("Sei sicuro di voler salvare le modifiche all'HTML e JSON? L'azione creerà fino a due nuovi commit.")) {
      return;
    }

    if (!currentPageKey) {
      alert("Errore: impossibile determinare la pagina corrente. Apri prima l'editor 'Edit Page'.");
      return;
    }

    // SALVA LE MODIFICHE CSS CORRENTI
    if (currentCssFile && cssEditor) {
      cssFiles[currentCssFile] = cssEditor.getValue();
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

    const saveOperations = [];

    // 1. Salva i file CSS modificati
    Object.keys(cssFiles).forEach(filename => {
      saveOperations.push((callback) => {
        // Ricarica il contenuto originale per confronto
        editor.storage.repo.read(editor.storage.repoBranch, filename, (err, originalContent) => {
          if (err || cssFiles[filename] === originalContent) {
            callback();
            return;
          }
          
          bodyEl.textContent = `Salvataggio ${filename}...`;
          editor.storage.repo.write(editor.storage.repoBranch, filename, cssFiles[filename], `Update ${filename} for ${currentPageKey}`, (err) => {
            if(err) { 
              bodyEl.textContent = `Errore salvataggio ${filename}`; 
              return; 
            }
            callback();
          });
        });
      });
    });

    // 2. Salva JSON
    saveOperations.push((callback) => {
      bodyEl.textContent = 'Salvataggio di data.json...';

      // PRIMA di salvare, assicurati che i dati siano aggiornati dal DOM
      editor.currentData = editor.list.get(document);

      editor.storage.repo.read(editor.storage.repoBranch, 'data.json', (err, currentJsonContent) => {
        let allData = {};
        if (!err) {
          try {
            allData = JSON.parse(currentJsonContent);
          } catch (e) {
            console.error('Errore nel parsing del data.json esistente', e);
          }
        }

        // "Spacchetta" i dati aggiornati e li unisce con l'oggetto dati completo
        for (const path in editor.currentData) {
          if (Object.prototype.hasOwnProperty.call(editor.currentData, path)) {
            allData[path] = editor.currentData[path];
          }
        }

        editor.storage.repo.write(editor.storage.repoBranch, 'data.json', JSON.stringify(allData, null, 2), `Update data for ${currentPageKey}`, (err, commit1) => {
          if(err) { 
            bodyEl.textContent = 'Errore salvataggio data.json'; 
            return; 
          }
          callback();
        });
      });
    });

    // 3. Salva HTML
    saveOperations.push((callback) => {
      bodyEl.textContent = 'Salvataggio del file HTML...';
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
        callback();
      });
    });

    const executeSaves = (index) => {
      if (index < saveOperations.length) {
        saveOperations[index](() => executeSaves(index + 1));
      } else if (saveOperations.length === 0) {
        bodyEl.textContent = 'Nessuna modifica da salvare.';
      }
    };

    executeSaves(0);
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