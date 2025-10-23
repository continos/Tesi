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
    coursesContainer.innerHTML = `<div class="alert alert-danger">Impossibile caricare i dati dall\'offerta formativa. Dettagli: ${error.message}</div>`;
  }
});

function parseGompData(data) {
    const allCourses = [];
    let courseCounter = 0;

    function extractCoursesFromActivities(activities) {
        if (!activities) return [];

        return activities.map(activity => {
            if (activity.type === 'activity') {
                // Check if it's a modular course
                if (activity.children && activity.children.length > 0) {
                    const mainCourseCreditData = activity.credits[0];
                    const modules = [];
                    const allProfessors = new Set();

                    activity.children.forEach(moduleActivity => {
                        const moduleProfessorData = moduleActivity.partitions[0]?.professors[0];
                        const moduleCreditData = moduleActivity.credits[0];
                        let moduleDetails = {};

                        if (moduleProfessorData) {
                            moduleDetails = {
                                obiettivi: moduleProfessorData.educationalObjectives?.find(t => t.iso === 'ita')?.text,
                                programma: moduleProfessorData.courseProgram?.find(t => t.iso === 'ita')?.text,
                                prerequisiti: moduleProfessorData.prerequisites?.find(t => t.iso === 'ita')?.text,
                                modalitaValutazione: moduleProfessorData.examMode?.find(t => t.iso === 'ita')?.text,
                                testiAdottati: moduleProfessorData.books?.find(t => t.iso === 'ita')?.text,
                                modalitaFrequenza: moduleProfessorData.classRoomMode?.find(t => t.iso === 'ita')?.text,
                                modalitaSvolgimento: moduleProfessorData.lessonsMode?.find(t => t.iso === 'ita')?.text
                            };
                        }
                        if (moduleCreditData) {
                             moduleDetails.ore = {
                                aula: moduleCreditData.oreAula,
                                esercitazioni: moduleCreditData.oreEsercitazioni,
                                laboratorio: moduleCreditData.oreLaboratorio,
                                seminari: moduleCreditData.oreSeminari,
                                altro: moduleCreditData.oreAltro
                            };
                            moduleDetails.attivita = moduleCreditData.macroSector;
                            moduleDetails.ambito = moduleCreditData.exportationCode;
                        }

                        const moduleProfessors = moduleActivity.partitions.flatMap(p => p.professors.map(prof => `${prof.name} ${prof.lastName}`));
                        moduleProfessors.forEach(p => allProfessors.add(p));

                        modules.push({
                            code: moduleActivity.code,
                            name: moduleActivity.name.find(t => t.iso === 'ita')?.text || 'N/A',
                            professors: moduleProfessors.join(', ') || 'Non assegnato',
                            details: moduleDetails,
                            cfu: `${moduleCreditData?.credits || 'N/A'} CFU - ${moduleCreditData?.sector || 'N/A'}`
                        });
                    });

                    const courseObject = {
                        index: courseCounter++,
                        type: 'course',
                        title: `${activity.code} ${activity.name.find(t => t.iso === 'ita')?.text || 'N/A'}`,
                        cfu: `${mainCourseCreditData?.credits || 'N/A'} CFU - ${mainCourseCreditData?.sector || 'N/A'}`,
                        professors: Array.from(allProfessors).join(', ') || 'Non assegnato',
                        modules: modules,
                        details: {} // Details are per-module, the main object will use module details
                    };
                    allCourses.push(courseObject);
                    return courseObject;

                } else { // It's a simple, non-modular course
                    const mainProfessorData = activity.partitions[0]?.professors[0];
                    const creditData = activity.credits[0];
                    let details = {};

                    if (mainProfessorData) {
                        details = {
                            obiettivi: mainProfessorData.educationalObjectives?.find(t => t.iso === 'ita')?.text,
                            programma: mainProfessorData.courseProgram?.find(t => t.iso === 'ita')?.text,
                            prerequisiti: mainProfessorData.prerequisites?.find(t => t.iso === 'ita')?.text,
                            modalitaValutazione: mainProfessorData.examMode?.find(t => t.iso === 'ita')?.text,
                            testiAdottati: mainProfessorData.books?.find(t => t.iso === 'ita')?.text,
                            modalitaFrequenza: mainProfessorData.classRoomMode?.find(t => t.iso === 'ita')?.text,
                            modalitaSvolgimento: mainProfessorData.lessonsMode?.find(t => t.iso === 'ita')?.text
                        };
                    }
                    if (creditData) {
                        details.ore = {
                            aula: creditData.oreAula,
                            esercitazioni: creditData.oreEsercitazioni,
                            laboratorio: creditData.oreLaboratorio,
                            seminari: creditData.oreSeminari,
                            altro: creditData.oreAltro
                        };
                        details.attivita = creditData.macroSector;
                        details.ambito = creditData.exportationCode;
                    }

                    const courseObject = {
                        index: courseCounter++,
                        type: 'course',
                        title: `${activity.code} ${activity.name.find(t => t.iso === 'ita')?.text || 'N/A'}`,
                        cfu: `${creditData?.credits || 'N/A'} CFU - ${creditData?.sector || 'N/A'}`,
                        professors: activity.partitions.flatMap(p => p.professors.map(prof => `${prof.name} ${prof.lastName}`)).join(', ') || 'Non assegnato',
                        details: details
                    };
                    allCourses.push(courseObject);
                    return courseObject;
                }

            } else if (activity.type === 'group' && activity.children) {
                // Gestisce entrambi i tipi di gruppo
                const groupActivities = activity.children[0]?.activities ? activity.children[0].activities : activity.children;
                return {
                    type: 'group',
                    title: activity.name.find(t => t.iso === 'ita')?.text || 'Gruppo Opzionale',
                    activities: extractCoursesFromActivities(groupActivities)
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
                            <div class="d-flex w-100 justify-content-between"><h5 class="mb-1 text-white">${semester.semesterNumber}° semestre</h5></div>
                        </a>`;
            semester.activities.forEach(activity => {
                if (activity.type === 'course') {
                    html += renderCourseItem(activity);
                } else if (activity.type === 'group') {
                    const groupId = `group_${year.yearNumber}_${semester.semesterNumber}_${activity.title.replace(/\s/g, '_')}`.replace(/[^a-zA-Z0-9_]/g, '');
                    html += `<div class="course-group border mt-2">
                                <button class="btn btn-warning w-100 text-start p-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${groupId}">
                                    ${activity.title}
                                </button>
                                <div class="collapse" id="collapse_${groupId}">
                                    <div class="list-group list-group-flush">
                                        ${activity.activities.map(subActivity => renderCourseItem(subActivity)).join('')}
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
    let professorsHtml = '';
    if (course.modules && course.modules.length > 0) {
        professorsHtml = '<ul class="list-unstyled mt-2 mb-0">';
        course.modules.forEach(module => {
            professorsHtml += `<li><small class="text-muted"><strong>${module.code} ${module.name}:</strong> ${module.professors}</small></li>`;
        });
        professorsHtml += '</ul>';
    } else {
        professorsHtml = course.professors ? `<small class="text-muted">Docenti: ${course.professors}</small>` : '';
    }

    const detailsButtonHtml = (course.details && Object.keys(course.details).length > 0) || (course.modules && course.modules.length > 0) ? 
        `<a href="#" class="info-icon" data-bs-toggle="modal" data-bs-target="#course-details-modal" data-course-index="${course.index}" title="Dettagli corso">
            <i class="bi bi-info-circle-fill float-end text-info" style="cursor: pointer; font-size: 1.2em; vertical-align: middle; margin-left: 8px;"></i>
        </a>` : '';

    return `<div class="list-group-item list-group-item-action flex-column align-items-start">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1 d-flex justify-content-between align-items-center w-100">
                        <span>${course.title}</span>
                        ${detailsButtonHtml}
                    </h5>
                </div>
                <div class="d-flex w-100 justify-content-between">
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

        if (course.modules && course.modules.length > 0) {
            course.modules.forEach(module => {
                bodyHtml += `<div class="module-details mb-4 p-3 border rounded">
`;
                bodyHtml += `<h4>${module.code} - ${module.name} (${module.cfu})</h4>`;
                bodyHtml += `<p><strong>Docente:</strong> ${module.professors}</p>`;
                const details = module.details;
                if(details.obiettivi) bodyHtml += `<h6>Obiettivi Formativi</h6><p>${details.obiettivi.replace(/\n/g, '<br>')}</p>`;
                if(details.ore) {
                    bodyHtml += `<table class="table table-bordered table-striped" style="margin-top: 20px;"><tbody>
                                <tr><th>Ore in Aula</th><th>Ore Esercitazioni</th><th>Ore Seminari</th><th>Ore Laboratorio</th><th>Ore Altro</th></tr>
                                <tr><td>${details.ore.aula || 0}</td><td>${details.ore.esercitazioni || 0}</td><td>${details.ore.seminari || 0}</td><td>${details.ore.laboratorio || 0}</td><td>${details.ore.altro || 0}</td></tr>
                                </tbody></table>`;
                }
                if(details.attivita) bodyHtml += `<br><strong>Attività</strong><p>${details.attivita}</p>`;
                if(details.ambito) bodyHtml += `<strong>Ambito</strong><p>${details.ambito}</p>`;
                if(details.prerequisiti) bodyHtml += `<strong>Prerequisiti</strong><p>${details.prerequisiti.replace(/\n/g, '<br>')}</p>`;
                if(details.programma) bodyHtml += `<strong class="mt-4">Programma del Corso</strong><p>${details.programma.replace(/\n/g, '<br>')}</p>`;
                if(details.modalitaValutazione) bodyHtml += `<strong class="mt-4">Modalità di Valutazione</strong><p>${details.modalitaValutazione.replace(/\n/g, '<br>')}</p>`;
                if(details.testiAdottati) bodyHtml += `<strong class="mt-4">Testi Adottati</strong><p>${details.testiAdottati.replace(/\n/g, '<br>')}</p>`;
                if(details.modalitaFrequenza) bodyHtml += `<strong class="mt-4">Modalità di frequenza</strong><p>${details.modalitaFrequenza.replace(/\n/g, '<br>')}</p>`;
                if(details.modalitaSvolgimento) bodyHtml += `<strong class="mt-4">Modalità di svolgimento delle lezioni</strong><p>${details.modalitaSvolgimento.replace(/\n/g, '<br>')}</p>`;
                bodyHtml += `</div>`;
            });
        } else { // Logic for non-modular courses
            const details = course.details;
            if(details.obiettivi) bodyHtml += `<h6>Obiettivi Formativi</h6><p>${details.obiettivi.replace(/\n/g, '<br>')}</p>`;
            if(details.ore) {
                bodyHtml += `<table class="table table-bordered table-striped" style="margin-top: 20px;"><tbody>
                            <tr><th>Ore in Aula</th><th>Ore Esercitazioni</th><th>Ore Seminari</th><th>Ore Laboratorio</th><th>Ore Altro</th></tr>
                            <tr><td>${details.ore.aula || 0}</td><td>${details.ore.esercitazioni || 0}</td><td>${details.ore.seminari || 0}</td><td>${details.ore.laboratorio || 0}</td><td>${details.ore.altro || 0}</td></tr>
                            </tbody></table>`;
            }
            if(details.attivita) bodyHtml += `<br><strong>Attività</strong><p>${details.attivita}</p>`;
            if(details.ambito) bodyHtml += `<strong>Ambito</strong><p>${details.ambito}</p>`;
            if(details.prerequisiti) bodyHtml += `<strong>Prerequisiti</strong><p>${details.prerequisiti.replace(/\n/g, '<br>')}</p>`;
            if(details.programma) bodyHtml += `<strong class="mt-4">Programma del Corso</strong><p>${details.programma.replace(/\n/g, '<br>')}</p>`;
            if(details.modalitaValutazione) bodyHtml += `<strong class="mt-4">Modalità di Valutazione</strong><p>${details.modalitaValutazione.replace(/\n/g, '<br>')}</p>`;
            if(details.testiAdottati) bodyHtml += `<strong class="mt-4">Testi Adottati</strong><p>${details.testiAdottati.replace(/\n/g, '<br>')}</p>`;
            if(details.modalitaFrequenza) bodyHtml += `<strong class="mt-4">Modalità di frequenza</strong><p>${details.modalitaFrequenza.replace(/\n/g, '<br>')}</p>`;
            if(details.modalitaSvolgimento) bodyHtml += `<strong class="mt-4">Modalità di svolgimento delle lezioni</strong><p>${details.modalitaSvolgimento.replace(/\n/g, '<br>')}</p>`;
        }
        
        modalBody.innerHTML = bodyHtml || '<p>Nessun dettaglio disponibile per questo corso.</p>';
    });
}
