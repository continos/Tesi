document.addEventListener('DOMContentLoaded', async () => {
  const coursesContainer = document.getElementById('courses-container');
  const loadingIndicator = document.getElementById('loading-indicator');

  const gompApiUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://uniroma2public.gomp.it/CourseAPI/getCourse');
  const requestPayload = {
    "mode": "classRoom",
    "uid": "dd5da305-df9c-4bbd-b66f-f2682e1bf721",
    "code": "",
    "academicYear": 2025,
    "curricula": null,
    "years": null,
    "iso": "ita",
    "showCUINs": "False"
  };

  try {
    const response = await fetch(gompApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      throw new Error(`Errore di rete: ${response.status}`);
    }
    
    const data = await response.json();

    // Estrai i dettagli dai modal (che sono ancora utili)
    const courseDetailsMap = new Map();
    if (data.html && data.html.modals) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.html.modals, 'text/html');
        doc.querySelectorAll('.modal').forEach(modal => {
            const title = modal.querySelector('.modal-title')?.textContent.trim().toUpperCase();
            const body = modal.querySelector('.modal-body');
            if (title && body) {
                courseDetailsMap.set(title, body.innerHTML);
            }
        });
    }

    // Estrai i corsi dalla risposta JSON
    const coursesData = data.results.map(course => {
        const detailsHtml = courseDetailsMap.get(course.name.toUpperCase());
        return {
            title: course.name,
            cfu: `${course.cfu} CFU - ${course.ssd}`,
            professors: course.professors.map(p => p.name).join(', '),
            details: detailsHtml
        };
    });

    // Rendering dell'HTML
    loadingIndicator.style.display = 'none';
    renderCourses(coursesData, coursesContainer);

  } catch (error) {
    console.error('Errore durante il fetch dei dati da GOMP API:', error);
    loadingIndicator.style.display = 'none';
    coursesContainer.innerHTML = `<div class="alert alert-danger">Impossibile caricare i dati dall'offerta formativa. Dettagli: ${error.message}</div>`;
  }
});

function renderCourses(courses, container) {
  if (!courses.length) {
    container.innerHTML = '<div class="alert alert-warning">Nessun corso trovato.</div>';
    return;
  }

  const coursesHtml = courses.map(course => {
    const professorsHtml = course.professors ? `<p class="card-text"><small class="text-muted">Docenti: ${course.professors}</small></p>` : '';
    const detailsButtonHtml = course.details ? 
        `<button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#course-details-modal" data-details-html="${encodeURIComponent(course.details)}" data-course-title="${course.title}">
          Dettagli
        </button>` : '';

    return `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${course.title}</h5>
            <p class="card-text">${course.cfu}</p>
            ${professorsHtml}
            <div class="mt-auto">
              ${detailsButtonHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="row">${coursesHtml}</div>`;
}

// Gestione del modal per mostrare i dettagli
const courseDetailsModal = document.getElementById('course-details-modal');
if (courseDetailsModal) {
    courseDetailsModal.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget;
        const detailsHtml = decodeURIComponent(button.getAttribute('data-details-html'));
        const courseTitle = button.getAttribute('data-course-title');

        const modalTitle = courseDetailsModal.querySelector('.modal-title');
        const modalBody = courseDetailsModal.querySelector('.modal-body');

        modalTitle.textContent = courseTitle;
        modalBody.innerHTML = detailsHtml;
    });
}