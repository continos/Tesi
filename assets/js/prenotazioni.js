document.addEventListener('DOMContentLoaded', () => {
  let authIsReady = false;
  let simplyIsReady = false;

  function attemptToInitialize() {
    if (authIsReady && simplyIsReady) {
      main();
    }
  }

  window.addEventListener('auth-ready', () => {
    authIsReady = true;
    console.log('Auth0 è pronto.');
    attemptToInitialize();
  });

  document.addEventListener('simply-storage-init', () => {
    simplyIsReady = true;
    console.log('SimplyEdit Storage è pronto.');
    attemptToInitialize();
  });

  function main() {
    console.log('Tutti i sistemi sono pronti. Avvio la logica di prenotazione.');
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'administrator' && userRole !== 'professor') {
      return;
    }

    /* Forza la connessione allo storage per creare l'oggetto .repo
    editor.storage.connect(() => {
      console.log("Connessione allo storage GitHub stabilita.");
      loadBookings();
    });*/

    const bookingsFile = '/Tesi/data/bookings.json';
    const tableBody = document.getElementById('bookings-table-body');
    const noBookingsMessage = document.getElementById('no-bookings-message');
    const bookingForm = document.getElementById('booking-form');
    const feedbackDiv = document.getElementById('booking-feedback');

    let allBookings = [];
    loadBookings();

    async function loadBookings() {
      tableBody.innerHTML = '<tr><td colspan="4">Caricamento...</td></tr>';
      try {
        const response = await fetch(bookingsFile + '?t=' + new Date().getTime(), { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 404) {
            allBookings = [];
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } else {
          allBookings = await response.json();
        }
        console.log('Dati ricevuti e parsificati:', allBookings); // DEBUG
        renderTable();
      } catch (err) {
        console.error("Errore nel caricamento del file JSON:", err);
        tableBody.innerHTML = '<tr><td colspan="4" class="text-danger">Errore nel caricamento delle prenotazioni.</td></tr>';
      }
    }

    function renderTable() {
      tableBody.innerHTML = '';
      if (!allBookings || allBookings.length === 0) {
        noBookingsMessage.style.display = 'block';
      } else {
        noBookingsMessage.style.display = 'none';
        allBookings.forEach(booking => {
          const row = tableBody.insertRow();
          row.innerHTML = `
            <td>${booking.classroom || 'N/D'}</td>
            <td>${booking.date || 'N/D'}</td>
            <td>${booking.timeslot || 'N/D'}</td>
            <td>${booking.professor || 'N/D'}</td>
          `;
        });
      }
    }

    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      feedbackDiv.textContent = 'Salvataggio in corso...';
      feedbackDiv.className = 'alert alert-info';

      const newBooking = {
        classroom: document.getElementById('classroom').value,
        date: document.getElementById('booking-date').value,
        timeslot: document.getElementById('timeslot').value,
        professor: localStorage.getItem('userName') || 'Utente Sconosciuto'
      };

      allBookings.push(newBooking);
      const updatedJsonData = JSON.stringify(allBookings, null, 2);

      try {
        // Ora editor.storage.repo dovrebbe esistere
        editor.storage.repo.write(
          editor.storage.repoBranch,
          'data/bookings.json',
          updatedJsonData,
          `Aggiunta prenotazione aula da ${newBooking.professor}`,
          (err) => {
            if (err) {
              // Se c'è un errore, lo gestiamo qui
              console.error("Errore durante la scrittura su GitHub:", err);
              feedbackDiv.textContent = 'Errore durante il salvataggio della prenotazione.';
              feedbackDiv.className = 'alert alert-danger';
              allBookings.pop(); // Annulla l'aggiunta ottimistica
              renderTable();
              return; // Interrompi l'esecuzione
            }
            feedbackDiv.textContent = 'Prenotazione salvata con successo!';
            feedbackDiv.className = 'alert alert-success';
            bookingForm.reset();
            renderTable();
          }
        );
      } catch (error) {
        console.error("Errore imprevisto durante il salvataggio su GitHub:", error);
        feedbackDiv.textContent = 'Errore imprevisto durante il salvataggio.';
        feedbackDiv.className = 'alert alert-danger';
        allBookings.pop();
        renderTable();
      }
    });
  }
});