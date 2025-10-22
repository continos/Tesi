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

    const structuredData = parseGompData(apiResponse.data);
    GOMP_COURSES = structuredData.allCourses;

    loadingIndicator.style.display = 'none';
    renderStructuredCourses(structuredData.years, coursesContainer);

  } catch (error) {
    console.error('Errore durante il fetch dei dati da GOMP API:', error);
    loadingIndicator.style.display = 'none';
    coursesContainer.innerHTML = `<div class="alert alert-danger">Impossibile caricare i dati dall'offerta formativa. Dettagli: ${error.message}</div>`;
  }
});

function parseGompData(data) {
    const allCourses = [];
    let courseCounter = 0;

    function extractCoursesFromActivities(activities) {
        if (!activities) return [];

        return activities.map(activity => {
            if (activity.type === 'activity') {
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

                const courseObject = {
                    index: courseCounter++,
                    type: 'course',
                    title: activity.name.find(t => t.iso === 'ita')?.text || 'N/A',
                    cfu: `${activity.credits[0]?.credits || 'N/A'} CFU - ${activity.credits[0]?.sector || 'N/A'}`,
                    professors: activity.partitions.flatMap(p => p.professors.map(prof => `${prof.name} ${prof.lastName}`)).join(', ') || 'Non assegnato',
                    details: details
                };
                allCourses.push(courseObject);
                return courseObject;

            } else if (activity.type === 'group' && activity.children && activity.children[0] && activity.children[0].activities) {
                return {
                    type: 'group',
                    title: activity.name.find(t => t.iso === 'ita')?.text || 'Gruppo Opzionale',
                    activities: extractCoursesFromActivities(activity.children[0].activities)
                };
            }
            return null;
        }).filter(Boolean);
    }

    const years = data.curricula[0]?.years.map(year => {
        return {
            yearNumber: year.number,
            semesters: year.units.map(unit => {
                return {
                    semesterNumber: unit.number,
                    activities: extractCoursesFromActivities(unit.activities)
                };
            })
        };
    });

    return { years, allCourses };
}

function renderStructuredCourses(years, container) {
    if (!years || !years.length) {
        container.innerHTML = '<div class="alert alert-warning">Nessun dato sul piano di studi trovato.</div>';
        return;
    }

    let html = '';
    years.forEach(year => {
        html += `<div class="card mb-4"><div class="card-body"><h5 class="card-title">${year.yearNumber}° anno</h5>`;
        year.semesters.forEach(semester => {
            html += `<div class="list-group mt-3">
                        <a href="#" class="list-group-item list-group-item-action flex-column align-items-start active bg-dark bg-gradient">
                            <div class="d-flex w-100 justify-content-between"><h5 class="mb-1">${semester.semesterNumber}° semestre</h5></div>
                        </a>`;
            semester.activities.forEach(activity => {
                if (activity.type === 'course') {
                    html += renderCourseItem(activity);
                } else if (activity.type === 'group') {
                    const groupId = `group_${year.yearNumber}_${semester.semesterNumber}_${activity.title.replace(/\s/g, '_')}`;
                    html += `<div class="accordion accordion-flush border mt-2" id="${groupId}">
                                <div class="accordion-item bg-light">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button collapsed bg-warning-subtle" type="button" data-bs-toggle="collapse" data-bs-target="#flush_${groupId}" aria-expanded="false" aria-controls="${groupId}">
                                            ${activity.title}
                                        </button>
                                    </h2>
                                    <div id="flush_${groupId}" class="accordion-collapse collapse" data-bs-parent="#${groupId}">
                                        <div class="accordion-body p-0">
                                            ${activity.activities.map(subActivity => renderCourseItem(subActivity)).join('')}
                                        </div>
                                    </div>
                                </div>
                             </div>`;
                }
            });
            html += `</div>`;
        });
        html += `</div></div>`;
    });

    container.innerHTML = html;
}

function renderCourseItem(course) {
    const professorsHtml = course.professors ? `<small class="text-muted">Docenti: ${course.professors}</small><br>` : '';
    const detailsButtonHtml = (course.details && Object.keys(course.details).some(k => course.details[k])) ? 
        `<a href="#" class="info-icon" data-bs-toggle="modal" data-bs-target="#course-details-modal" data-course-index="${course.index}" title="Dettagli corso">
            <i class="fa-solid fa-circle-info float-right text-info" style="cursor: pointer; font-size: 1.2em; vertical-align: middle; margin-left: 8px;"></i>
        </a>` : '';

    return `<div class="list-group-item list-group-item-action flex-column align-items-start">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${course.title} ${detailsButtonHtml}</h5>
                    <small class="text-muted">${course.cfu}</small>
                </div>
                ${professorsHtml}
            </div>`;
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