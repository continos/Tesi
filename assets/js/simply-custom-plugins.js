document.addEventListener('simply-toolbars-loaded', function() {
  if (!window.editor) {
    return;
  }

  console.log('Toolbars loaded, adding custom "View HTML" plugin.');

  // 1. Definisce l'azione che mostra la modale
  const viewHtmlAction = function() {
    // --- Crea la struttura della modale ---
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'custom-html-modal-overlay';
    Object.assign(modalOverlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: '100001',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });

    const modalContent = document.createElement('div');
    Object.assign(modalContent.style, {
      backgroundColor: '#fefefe',
      padding: '20px',
      border: '1px solid #888',
      width: '80%',
      height: '80%',
      maxWidth: '1200px',
      boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    });

    const modalHeader = document.createElement('div');
    modalHeader.innerHTML = '<h2 style="margin: 0; font-family: sans-serif;">HTML Sorgente della Pagina</h2>';
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    Object.assign(closeButton.style, {
        position: 'absolute',
        top: '10px',
        right: '15px',
        fontSize: '30px',
        lineHeight: '1',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer'
    });

    const preElement = document.createElement('pre');
    Object.assign(preElement.style, {
      flex: '1',
      overflow: 'auto',
      backgroundColor: '#2d2d2d',
      color: '#dcdcdc',
      padding: '15px',
      margin: '15px 0',
      fontSize: '14px',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word'
    });

    const codeElement = document.createElement('code');
    
    // Prende e "escapa" il contenuto HTML per mostrarlo come testo
    const pageHtml = document.documentElement.outerHTML;
    codeElement.textContent = pageHtml;

    // --- Assembla la modale ---
    preElement.appendChild(codeElement);
    modalContent.appendChild(closeButton);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(preElement);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // --- Gestione eventi ---
    const closeModal = () => {
      document.body.removeChild(modalOverlay);
    };
    closeButton.onclick = closeModal;
    modalOverlay.onclick = function(e) {
      if (e.target === modalOverlay) {
        closeModal();
      }
    };
  };

  // 2. Registra l'azione con SimplyEdit
  editor.addAction('custom-view-html', viewHtmlAction);

  // 3. Crea e aggiunge il pulsante alla toolbar
  const mainToolbarUl = document.querySelector('#simply-main-toolbar .simply-buttons');
  if (mainToolbarUl) {
    const newButtonLi = document.createElement('li');
    newButtonLi.innerHTML = `
      <button data-simply-action="custom-view-html" title="Visualizza HTML sorgente">
        <i class="fa fa-code"></i> View HTML
      </button>
    `;
    // Lo aggiunge dopo il pulsante 'Save'
    const saveButtonLi = mainToolbarUl.querySelector('button[data-simply-action="simply-save"]').parentElement;
    if (saveButtonLi && saveButtonLi.nextSibling) {
        mainToolbarUl.insertBefore(newButtonLi, saveButtonLi.nextSibling);
    } else {
        mainToolbarUl.appendChild(newButtonLi);
    }
  }
});
