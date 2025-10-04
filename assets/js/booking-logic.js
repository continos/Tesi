document.addEventListener('DOMContentLoaded', () => {
  // Attendi che l'autenticazione sia gestita prima di eseguire la logica di prenotazione
  const authReadyEvent = new Event('auth-ready');
  window.addEventListener('auth-ready', main);

  function main() {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'administrator' && userRole !== 'professor') {
      return; // Non eseguire nulla se l'utente non ha i permessi
    }

    // --- SETUP RDF ---
    const RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
    const BOOK = $rdf.Namespace("https://continos.github.io/Tesi/prenotazione#");
    const store = $rdf.graph();
    const fetcher = new $rdf.Fetcher(store);
    const updater = new $rdf.UpdateManager(store);
    const bookingsFile =  `${window.location.origin}/Tesi/data/bookings.rdf`;;

    // --- ELEMENTI DEL DOM ---
    const tableBody = document.getElementById('bookings-table-body');
    const noBookingsMessage = document.getElementById('no-bookings-message');
    const bookingForm = document.getElementById('booking-form');
    const feedbackDiv = document.getElementById('booking-feedback');

    // --- FUNZIONE PER CARICARE E VISUALIZZARE LE PRENOTAZIONI ---
    async function loadBookings() {
      tableBody.innerHTML = '<tr><td colspan="4">Caricamento...</td></tr>';
      try {
        await fetcher.load(bookingsFile, { force: true, 'Content-Type': 'application/rdf+xml' });
        
        const bookings = store.each(undefined, RDF('type'), BOOK('Booking'));
        tableBody.innerHTML = ''; // Pulisci la tabella

        if (bookings.length === 0) {
          noBookingsMessage.style.display = 'block';
        } else {
          noBookingsMessage.style.display = 'none';
          bookings.forEach(booking => {
            const classroom = store.any(booking, BOOK('classroom'));
            const date = store.any(booking, BOOK('date'));
            const timeslot = store.any(booking, BOOK('timeslot'));
            const professor = store.any(booking, BOOK('professor'));

            const row = tableBody.insertRow();
            row.innerHTML = `
              <td>${classroom ? classroom.value : 'N/D'}</td>
              <td>${date ? date.value : 'N/D'}</td>
              <td>${timeslot ? timeslot.value : 'N/D'}</td>
              <td>${professor ? professor.value : 'N/D'}</td>
            `;
          });
        }
      } catch (err) {
        console.error("Errore nel caricamento del file RDF:", err);
        tableBody.innerHTML = '<tr><td colspan="4" class="text-danger">Errore nel caricamento delle prenotazioni.</td></tr>';
      }
    }

    // --- GESTIONE INVIO FORM ---
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      feedbackDiv.textContent = 'Salvataggio in corso...';
      feedbackDiv.className = 'alert alert-info';

      const classroom = document.getElementById('classroom').value;
      const date = document.getElementById('booking-date').value;
      const timeslot = document.getElementById('timeslot').value;
      const professor = localStorage.getItem('userName') || 'Utente Sconosciuto';

      // Crea un nuovo nodo per la prenotazione con un ID univoco
      const newBookingURI = `http://www.informatica.uniroma2.it/booking/booking${Date.now()}`;
      const newBooking = $rdf.sym(newBookingURI);

      // Crea i nuovi "triple" RDF
      let newTriples = [
        $rdf.st(newBooking, RDF('type'), BOOK('Booking')),
        $rdf.st(newBooking, BOOK('classroom'), $rdf.lit(classroom)),
        $rdf.st(newBooking, BOOK('date'), $rdf.lit(date)),
        $rdf.st(newBooking, BOOK('timeslot'), $rdf.lit(timeslot)),
        $rdf.st(newBooking, BOOK('professor'), $rdf.lit(professor))
      ];

      // Aggiungi i nuovi triple allo store locale
      store.add(newTriples);

      // Serializza l'INTERO store aggiornato in formato RDF/XML
      const serializer = new $rdf.Serializer(store);
      const updatedRdfData = serializer.toXML(store);

      // Salva il file su GitHub
      try {
        await editor.storage.repo.write(
          editor.storage.repoBranch,
          'data/bookings.rdf', // Path relativo alla root del repo
          updatedRdfData,
          `Aggiunta prenotazione aula da ${professor}`,
          (err) => {
            if (err) {
              throw new Error(err);
            }
            feedbackDiv.textContent = 'Prenotazione salvata con successo!';
            feedbackDiv.className = 'alert alert-success';
            bookingForm.reset();
            loadBookings(); // Ricarica la tabella
          }
        );
      } catch (error) {
        console.error("Errore durante il salvataggio su GitHub:", error);
        feedbackDiv.textContent = 'Errore durante il salvataggio della prenotazione.';
        feedbackDiv.className = 'alert alert-danger';
      }
    });

    // Caricamento iniziale
    loadBookings();
  }
});
