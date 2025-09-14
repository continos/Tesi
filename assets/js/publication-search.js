function initializePublicationSearch() {
  const searchForm = document.getElementById('search-form');
  // Se il form non è ancora sulla pagina, riprova tra un attimo.
  // Questo gestisce il caso in cui l'utente aggiunge il template dinamicamente.
  if (!searchForm) {
    setTimeout(initializePublicationSearch, 200);
    return;
  }

  const searchQuery = document.getElementById('search-query');
  const resultsContainer = document.getElementById('results-container');
  const loadingIndicator = document.getElementById('loading-indicator');

  searchForm.addEventListener('submit', async (e) => {
    // Previene il ricaricamento della pagina
    e.preventDefault();
    
    const query = searchQuery.value.trim();
    if (!query) {
      resultsContainer.innerHTML = '<p class="text-center">Inserisci un termine di ricerca.</p>';
      return;
    }

    resultsContainer.innerHTML = '';
    loadingIndicator.style.display = 'block';

    try {
      const response = await fetch(`/api/search-publications?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('La ricerca ha restituito un errore.');
      }
      const publications = await response.json();

      loadingIndicator.style.display = 'none';

      if (publications.length === 0) {
        resultsContainer.innerHTML = '<p class="text-center">Nessuna pubblicazione trovata per questo termine di ricerca.</p>';
        return;
      }

      publications.forEach(pub => {
        let iconHtml = '<i class="bi bi-question-circle" title="Stato sconosciuto"></i>'; // Icona di default
        if (pub.fileIcon === 'minus') {
          iconHtml = '<i class="bi bi-dash-circle" title="Nessun file caricato"></i>';
        } else if (pub.fileIcon === 'lock') {
          iconHtml = '<i class="bi bi-lock-fill" title="File non disponibile"></i>';
        } else if (pub.fileIcon === 'file') {
          iconHtml = '<i class="bi bi-file-earmark-text" title="File disponibile"></i>';
        }

        const pubCard = `
          <div class="col-lg-12">
            <div class="publication-card p-3 border rounded mb-3">
              <h5><a href="${pub.link}" target="_blank" rel="noopener noreferrer">${pub.title || 'Titolo non disponibile'}</a></h5>
              <p class="mb-1"><strong>Autori:</strong> ${pub.authors || 'Non specificati'}</p>
              <p class="mb-1"><strong>Data:</strong> ${pub.date || 'Non disponibile'}</p>
              <p class="mb-0"><strong>Tipo:</strong> ${pub.type || 'Non specificato'}</p>
              <p class="mb-0"><strong>File:</strong> ${iconHtml}</p>
            </div>
          </div>
        `;
        resultsContainer.innerHTML += pubCard;
      });

    } catch (error) {
      loadingIndicator.style.display = 'none';
      resultsContainer.innerHTML = `<p class="text-center text-danger">Errore durante la ricerca: ${error.message}</p>`;
      console.error(error);
    }
  });
}

// Avvia la funzione di inizializzazione quando il DOM è pronto.
document.addEventListener('DOMContentLoaded', initializePublicationSearch);
