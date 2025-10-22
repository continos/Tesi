document.addEventListener('DOMContentLoaded', () => {
  let authIsReady = false;

  window.addEventListener('auth-ready', () => {
    authIsReady = true;
    console.log('Auth0 è pronto.');
    waitForSimplyEdit();
  });

  function waitForSimplyEdit() {
    if (window.editor && window.editor.storage) {
      console.log('SimplyEdit è pronto.');
      main();
    } else {
      setTimeout(waitForSimplyEdit,100);
    }
  }

  function main() {
    console.log('Tutti i sistemi sono pronti. Avvio la logica di prenotazione.');
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'administrator' && userRole !== 'professor') {
      return;
    }

    // 1. Connettiti allo storage per autenticarti con GitHub e creare l'oggetto .repo
    editor.storage.connect(() => {
      console.log("Connessione allo storage GitHub stabilita.");
      // 2. Solo dopo la connessione, carica i dati
      loadPrenotazioni();
    });

    const tableBody = document.getElementById('prenotazioni-table-body');
    const noPrenotazioniMessage = document.getElementById('no-prenotazioni-message');
    const prenotazioneForm = document.getElementById('prenotazione-form');
    const feedbackDiv = document.getElementById('prenotazione-feedback');

    let prenotazioni = [];

    // 3. Usa editor.storage.repo.read() invece di fetch
    async function loadPrenotazioni() {
      tableBody.innerHTML = '<tr><td colspan="4">Caricamento...</td></tr>';
      editor.storage.repo.read(
        editor.storage.repoBranch,
        'data/prenotazioni.json',
        (err, data) => {
          if (err) {
            // Se il file non esiste (errore 404), lo trattiamo come un array vuoto
            if (err.error === 404) {
              console.log('File prenotazioni.json non trovato, inizio con un array vuoto.');
              prenotazioni = [];
            } else {
              console.error("Errore nel caricamento del file JSON da GitHub:", err);
              tableBody.innerHTML = '<tr><td colspan="4" class="text-danger">Errore nel caricamento delle prenotazioni.</td></tr>';
              return;
            }
          } else {
            try {
              prenotazioni = JSON.parse(data);
            } catch (parseErr) {
              console.error("Errore nel parsing del JSON:", parseErr);
              tableBody.innerHTML = '<tr><td colspan="4" class="text-danger">Errore nel formato dei dati delle prenotazioni.</td></tr>';
              return;
            }
          }
          renderTable();
        }
      );
    }

    function renderTable() {
      tableBody.innerHTML = '';
      if (!prenotazioni || prenotazioni.length === 0) {
        noPrenotazioniMessage.style.display = 'block';
      } else {
        noPrenotazioniMessage.style.display = 'none';
        prenotazioni.forEach(prenotazione => {
          const row = tableBody.insertRow();
          row.innerHTML = `
            <td>${prenotazione.classroom || 'N/D'}</td>
            <td>${prenotazione.date || 'N/D'}</td>
            <td>${prenotazione.timeslot || 'N/D'}</td>
            <td>${prenotazione.professor || 'N/D'}</td>
          `;
        });
      }
    }

    prenotazioneForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      feedbackDiv.textContent = 'Salvataggio in corso...';
      feedbackDiv.className = 'alert alert-info';

      const newPrenotazione = {
        classroom: document.getElementById('classroom').value,
        date: document.getElementById('prenotazione-date').value,
        timeslot: document.getElementById('timeslot').value,
        professor: localStorage.getItem('userName') || 'Utente Sconosciuto'
      };

      prenotazioni.push(newPrenotazione);
      const updatedJsonData = JSON.stringify(prenotazioni, null, 2);

      try {
        editor.storage.repo.write(
          editor.storage.repoBranch,
          'data/prenotazioni.json',
          updatedJsonData,
          `Aggiunta prenotazione aula da ${newPrenotazione.professor}`,
          (err) => {
            if (err) {
              console.error("Errore durante la scrittura su GitHub:", err);
              feedbackDiv.textContent = 'Errore durante il salvataggio della prenotazione.';
              feedbackDiv.className = 'alert alert-danger';
              prenotazioni.pop();
              renderTable();
              return;
            }
            feedbackDiv.textContent = 'Prenotazione salvata con successo!';
            feedbackDiv.className = 'alert alert-success';
            prenotazioneForm.reset();
            renderTable();
          }
        );
      } catch (error) {
        console.error("Errore imprevisto durante il salvataggio su GitHub:", error);
        feedbackDiv.textContent = 'Errore imprevisto durante il salvataggio.';
        feedbackDiv.className = 'alert alert-danger';
        prenotazioni.pop();
        renderTable();
      }
    });
  }
});
