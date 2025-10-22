document.addEventListener('DOMContentLoaded', async () => {
  const coursesContainer = document.getElementById('courses-container');
  const loadingIndicator = document.getElementById('loading-indicator');

  // URL di GOMP da interrogare
  const gompUrl = 'https://uniroma2public.gomp.it/PublicData?uid=dd5da305-df9c-4bbd-b66f-f2682e1bf721&mode=classRoom&iso=ita&academicYear=2025';
  // Proxy per evitare problemi di CORS
  const proxyUrl = 'https://corsproxy.io/?';

  try {
    const response = await fetch(`${proxyUrl}${encodeURIComponent(gompUrl)}`);
    if (!response.ok) {
      throw new Error(`Errore di rete: ${response.status}`);
    }
    const htmlString = await response.text();

    // Usa DOMParser per analizzare l'HTML ottenuto
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // --- Fase 1: Estrai i dettagli dai modal nascosti ---
    const courseDetailsMap = new Map();
    doc.querySelectorAll('#pluginContents > .modal').forEach(modal => {
      const title = modal.querySelector('.modal-title')?.textContent.trim().toUpperCase();
      const body = modal.querySelector('.modal-body');
      if (title && body) {
        courseDetailsMap.set(title, body.innerHTML);
      }
    });

    // --- Fase 2: Estrai l'elenco dei corsi e abbina i dettagli ---
    const coursesData = [];
    doc.querySelectorAll('.list-group-item-action').forEach(item => {
      const titleElement = item.querySelector('h5.mb-1');
      if (!titleElement) return; // Salta elementi che non sono corsi (es. header semestri)

      // Pulisce il titolo da eventuali codici e spazi
      const rawTitle = titleElement.textContent.replace(/\d{7}/, '').trim();
      const cfuText = item.querySelector('small.text-muted')?.textContent.trim();
      
      const professors = Array.from(item.querySelectorAll('small[data-cuin] a')).map(a => a.textContent.replace(' Vai alla scheda', '').trim());

      // Trova i dettagli corrispondenti nella mappa (case-insensitive)
      const detailsHtml = courseDetailsMap.get(rawTitle.toUpperCase());

      coursesData.push({
        title: rawTitle,
        cfu: cfuText,
        professors: professors.join(', '),
        details: detailsHtml
      });
    });

    // --- Fase 3: Rendi l'HTML e mostralo nella pagina ---
    loadingIndicator.style.display = 'none';
    renderCourses(coursesData, coursesContainer);

  } catch (error) {
    console.error('Errore durante lo scraping da GOMP:', error);
    loadingIndicator.style.display = 'none';
    coursesContainer.innerHTML = `<div class="alert alert-danger">Impossibile caricare i dati dall'offerta formativa. Dettagli: ${error.message}</div>`;
  }
});

function renderCourses(courses, container) {
  if (!courses.length) {
    container.innerHTML = '<div class="alert alert-warning">Nessun corso trovato.</div>';
    return;
  }

  let currentYear = 0;
  let currentSemester = 0;

  const yearHtml = courses.reduce((acc, course) => {
    // Questa logica è un'approssimazione per raggruppare per anno/semestre
    // basata sulla struttura della pagina GOMP. Potrebbe necessitare di aggiustamenti.
    // Qui per semplicità li mettiamo tutti in un unico elenco.
    
    const professorsHtml = course.professors ? `<p class="card-text"><small class="text-muted">Docenti: ${course.professors}</small></p>` : '';

    acc += `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${course.title}</h5>
            <p class="card-text">${course.cfu}</p>
            ${professorsHtml}
            <div class="mt-auto">
              <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#course-details-modal" data-details-html="${encodeURIComponent(course.details || '')}" data-course-title="${course.title}">
                Dettagli
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    return acc;
  }, '');

  container.innerHTML = `<div class="row">${yearHtml}</div>`;
}

// Gestione del modal per mostrare i dettagli
const courseDetailsModal = document.getElementById('course-details-modal');
courseDetailsModal.addEventListener('show.bs.modal', function (event) {
  const button = event.relatedTarget;
  const detailsHtml = decodeURIComponent(button.getAttribute('data-details-html'));
  const courseTitle = button.getAttribute('data-course-title');

  const modalTitle = courseDetailsModal.querySelector('.modal-title');
  const modalBody = courseDetailsModal.querySelector('.modal-body');

  modalTitle.textContent = courseTitle;
  modalBody.innerHTML = detailsHtml;
});
