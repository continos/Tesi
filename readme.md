# Progetto di Tesi: Piattaforma Web CMS Git-based con Editing WYSIWYG

   Questo repository contiene il codice sorgente e la documentazione del progetto sviluppato per la mia tesi di laurea
   in Informatica. Il sistema è un CMS (Content Management System) leggero e moderno che permette la modifica dei
   contenuti direttamente on-page, utilizzando Git come backend per il versionamento e lo storage dei dati.

   ## 1. Obiettivo del Progetto
   L'obiettivo del progetto è stato quello di realizzare un sito web con contenuti dinamici, un’interfaccia di editing online
   WYSIWYG intuitiva e un sistema di version control integrato, senza ricorrere a un CMS tradizionale monolitico. Così da poter
   confrontare l'esperienza di sviluppo tra un CMS headless custom e un CMS tradizionale monolitico.

   ## 2. Architettura del Sistema
   Il sistema è composto da tre strati principali:

   *   **Frontend (Client-side):** Basato su HTML5, CSS3 (Vanilla) e JavaScript. Utilizza **SimplyEdit** come motore di
   editing on-page.
   *   **Backend (Server-side):** Un server **Node.js (Express)** che gestisce l'autenticazione, le API di scraping, la
   creazione dinamica di pagine e la comunicazione sicura con GitHub.
   *   **Storage & Versioning:** I contenuti sono salvati in un file `data/data.json`. Le modifiche vengono committate
   automaticamente su un repository **GitHub** tramite le sue API, rendendo il sito pronto per il deployment immediato
   (es. tramite GitHub Pages).

   ## 3. Tecnologie e Integrazioni Chiave
   *   **Auth0:** Utilizzato per gestire l'autenticazione sicura e il controllo degli accessi basato sui ruoli (RBAC -
   Administrator vs Professore).
   *   **GitHub API:** Integrazione personalizzata (motore `customGithub`) per superare i limiti di caching di
   `raw.githubusercontent.com`.
   *   **CodeMirror:** Integrato un editor di codice sorgente avanzato per permettere agli amministratori di modificare
   HTML, CSS e JSON direttamente dalla toolbar del sito.
   *   **Cheerio & Fetch:** Utilizzati per il recupero e il parsing dinamico di pubblicazioni scientifiche da portali
   esterni (es. art.torvergata.it).

   ## 4. Funzionalità Implementate
   1.  **Editing WYSIWYG:** Modifica di testi, immagini e liste direttamente sulla pagina.
   2.  **Gestione Pagine:** Creazione di nuove pagine da template predefiniti e cancellazione atomica (file + dati
   JSON).
   3.  **Gestione Ruoli:**
       *   *Administrator:* Accesso completo a editing, creazione/cancellazione pagine e modifica sorgente.
       *   *Professore:* Accesso a funzionalità specifiche come la gestione delle prenotazioni aule.
   4.  **Ricerca Pubblicazioni:** Sistema di ricerca integrato che interroga in tempo reale database esterni.
   5.  **Componenti Condivisi:** Header e Footer gestiti come entità globali in `data.json` per coerenza su tutto il
   sito.

   ## 5. Requisiti e Installazione

   ### Prerequisiti
   *   Node.js (versione 14 o superiore)
   *   Un account GitHub e un Personal Access Token (PAT) con permessi di scrittura sul repository.
   *   Un account Auth0 (configurato con una Single Page Application e i relativi parametri).

   ### Setup Locale
   1.  Clonare il repository:
      git clone https://github.com/tuo-username/nome-repo.git
      cd nome-repo
   2.  Installare le dipendenze:
      npm install

   3.  Configurazione:
       *   Inserire i parametri di Auth0 in `assets/js/auth-config.js`.
       *   Configurare il PAT di GitHub (si consiglia l'uso di variabili d'ambiente o un file `.env`).
   4.  Avviare il server:
      node server.js


   5.  Accedere al sito su `http://localhost:3000`.

   ## 6. Sviluppi Futuri
   Il sistema è predisposto per l'integrazione di dati in formato **RDF** per il Web Semantico e per l'espansione del
   modulo di prenotazione aule con logiche di conflitto avanzate.
