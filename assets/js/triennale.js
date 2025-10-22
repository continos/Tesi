let GOMP_COURSES = []; // Variabile globale per memorizzare i dati dei corsi

document.addEventListener('DOMContentLoaded', async () => {
  const coursesContainer = document.getElementById('courses-container');
  const loadingIndicator = document.getElementById('loading-indicator');

  const gompApiUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://uniroma2public.gomp.it/CourseAPI/getCourse');
  const requestPayload = {
    "mode": "classRoom",
    "uid": "dd5da305-df9c-4bbd-b66f-f2682e1bf721",
    "academicYear": 2025,
    "iso": "ita"
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
    
    const apiResponse = await response.json();

    if (!apiResponse.success || !apiResponse.data || !apiResponse.data.curricula) {
        throw new Error('La risposta dell\'API non ha un formato valido.');
    }

    GOMP_COURSES = parseGompData(apiResponse.data);

    loadingIndicator.style.display = 'none';
    renderCourses(GOMP_COURSES, coursesContainer);

  } catch (error) {
    console.error('Errore durante il fetch dei dati da GOMP API:', error);
    loadingIndicator.style.display = 'none';
    coursesContainer.innerHTML = `<div class="alert alert-danger">Impossibile caricare i dati dall'offerta formativa. Dettagli: ${error.message}</div>`;
  }
});

function parseGompData(data) {
    const allCourses = [];

    function extractCoursesFromActivities(activities) {
        if (!activities) return;

        activities.forEach(activity => {
            if (activity.type === 'activity') {
                // Logica più tollerante: estrai sempre il corso,
                // i dettagli del professore sono opzionali.
                const mainProfessorData = activity.partitions[0]?.professors[0];

                let details = {};
                if (mainProfessorData) {
                    details = {
                        obiettivi: mainProfessorData.educationalObjectives?.find(t => t.iso === 'ita')?.text,
                        programma: mainProfessorData.courseProgram?.find(t => t.iso === 'ita')?.text,
                        prerequisiti: mainProfessorData.prerequisites?.find(t => t.iso === 'ita')?.text,
                        modalitaValutazione: mainProfessorData.examMode?.find(t => t.iso === 'ita')?.text,
                        testiAdottati: mainProfessorData.books?.find(t => t.iso === 'ita')?.text
                    };
                }

                allCourses.push({
                    title: activity.name.find(t => t.iso === 'ita')?.text || 'N/A',
                    cfu: `${activity.credits[0]?.credits || 'N/A'} CFU - ${activity.credits[0]?.sector || 'N/A'}`,
                    professors: activity.partitions.flatMap(p => p.professors.map(prof => `${prof.name} ${prof.lastName}`)).join(', ') || 'Non assegnato',
                    details: details
                });
            } else if (activity.type === 'group' && activity.children && activity.children[0] && activity.children[0].activities) {
                extractCoursesFromActivities(activity.children[0].activities);
            }
        });
    }

    data.curricula[0]?.years.forEach(year => {
        year.units.forEach(unit => {
            extractCoursesFromActivities(unit.activities);
        });
    });

    return allCourses;
}

function renderCourses(courses, container) {
  if (!courses.length) {
    container.innerHTML = '<div class="alert alert-warning">Nessun corso trovato.</div>';
    return;
  }

  const coursesHtml = courses.map((course, index) => {
    const professorsHtml = course.professors ? `<p class="card-text"><small class="text-muted">Docenti: ${course.professors}</small></p>` : '';
    // Mostra il pulsante dettagli solo se ci sono dettagli da mostrare
    const detailsButtonHtml = (course.details && Object.keys(course.details).some(k => course.details[k])) ? 
        `<button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#course-details-modal" data-course-index="${index}">
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

const courseDetailsModal = document.getElementById('course-details-modal');
if (courseDetailsModal) {
    courseDetailsModal.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget;
        const courseIndex = button.getAttribute('data-course-index');
        const course = GOMP_COURSES[courseIndex];

        if (!course) return;

        const modalTitle = courseDetailsModal.querySelector('.modal-title');
        const modalBody = courseDetailsModal.querySelector('.modal-body');

        modalTitle.textContent = course.title;
        let bodyHtml = '';
        const details = course.details;
        if(details.obiettivi) bodyHtml += `<h6>Obiettivi Formativi</h6><p>${details.obiettivi.replace(/\n/g, '<br>')}</p>`;
        if(details.programma) bodyHtml += `<h6 class="mt-4">Programma del Corso</h6><p>${details.programma.replace(/\n/g, '<br>')}</p>`;
        if(details.modalitaValutazione) bodyHtml += `<h6 class="mt-4">Modalità di Valutazione</h6><p>${details.modalitaValutazione.replace(/\n/g, '<br>')}</p>`;
        if(details.testiAdottati) bodyHtml += `<h6 class="mt-4">Testi Adottati</h6><p>${details.testiAdottati.replace(/\n/g, '<br>')}</p>`;
        if(details.prerequisiti) bodyHtml += `<h6 class="mt-4">Prerequisiti</h6><p>${details.prerequisiti.replace(/\n/g, '<br>')}</p>`;
        
        modalBody.innerHTML = bodyHtml || '<p>Nessun dettaglio disponibile per questo corso.</p>';
    });
}
