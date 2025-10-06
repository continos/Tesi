document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor) {
    return;
  }

  console.log('Toolbars loaded, adding CodeMirror HTML editor plugin.');

  const getCleanMainHtml = () => {
    const mainElement = document.querySelector('main.main');
    if (!mainElement) {
      return '<!-- Elemento <main> non trovato -->';
    }
    const clone = mainElement.cloneNode(true);
    clone.querySelectorAll('[data-simply-selectable], [data-simply-list-item], [contenteditable], [data-simply-stashed], .simply-selected, .simply-empty').forEach(el => {
      el.removeAttribute('data-simply-selectable');
      el.removeAttribute('data-simply-list-item');
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-simply-stashed');
      el.removeAttribute('style');
      el.classList.remove('simply-selected', 'simply-empty');
    });
    return clone.innerHTML;
  };

  const htmlEditorAction = function() {
    let codeEditor;
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'codemirror-modal-overlay';
    Object.assign(modalOverlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: '100001', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    });

    const modalContent = document.createElement('div');
    Object.assign(modalContent.style, {
      backgroundColor: '#282a36', /* Colore scuro per coerenza con il tema dracula */
      padding: '15px',
      border: '1px solid #888',
      width: '85%',
      height: '85%',
      maxWidth: '1400px',
      boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative'
    });

    modalContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #44475a;">
        <h2 style="margin: 0; font-family: sans-serif; color: #f8f8f2;">Editor HTML della Sezione &lt;main&gt;</h2>
        <div>
          <button id="modal-save-button" style="padding: 8px 15px; background-color: #50fa7b; color: #282a36; border: none; cursor: pointer; margin-right: 10px; font-weight: bold;">Salva Modifiche</button>
          <button id="modal-close-button" style="padding: 8px 15px; background-color: #6272a4; color: white; border: none; cursor: pointer;">&times; Annulla</button>
        </div>
      </div>
      <textarea id="html-editor-textarea"></textarea>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const textarea = document.getElementById('html-editor-textarea');
    textarea.value = getCleanMainHtml();

    codeEditor = CodeMirror.fromTextArea(textarea, {
      lineNumbers: true,
      mode: 'htmlmixed',
      theme: 'dracula',
      lineWrapping: true,
      autofocus: true
    });
    codeEditor.setSize('100%', 'calc(100% - 50px)');
    setTimeout(() => codeEditor.refresh(), 1);

    const closeModal = () => document.body.removeChild(modalOverlay);
    document.getElementById('modal-close-button').onclick = closeModal;
    
    document.getElementById('modal-save-button').onclick = () => {
      const newHtml = codeEditor.getValue();
      const mainElement = document.querySelector('main.main');
      if (mainElement) {
        mainElement.innerHTML = newHtml;
        editor.fireEvent('databinding:valuechanged', mainElement);
        alert('Contenuto della sezione <main> aggiornato. Clicca il pulsante \"Save\" di SimplyEdit per rendere le modifiche permanenti.');
      }
      closeModal();
    };
  };

  editor.addAction('custom-codemirror-editor', htmlEditorAction);

  const mainToolbarUl = document.querySelector('#simply-main-toolbar .simply-buttons');
  if (mainToolbarUl) {
    const newButtonLi = document.createElement('li');
    newButtonLi.innerHTML = `
      <button data-simply-action="custom-codemirror-editor" title="Modifica HTML della sezione <main> con CodeMirror">
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
