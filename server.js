const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cheerio = require('cheerio');
const session = require('express-session');

const app = express();
const port = 3000;

// --- Configurazione Sessioni ---
app.use(session({
  secret: '£|GP5]k4T8D8V8', 
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true se Https
}));

// --- Utente per l'autenticazione ---
const user = {
  username: 'admin',
  password: 'password' // In un'app reale, uso password complessa "hashed"!
};

// --- Protezione rotte ---
// Questo middleware controlla se l'utente è loggato prima di procedere.
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next(); // L'utente è autenticato, procedi
  }
  // L'utente non è autenticato, nega l'accesso
  res.status(401).send('Accesso negato. Effettuare il login.');
};

app.use(express.json());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware per analizzare il corpo delle richieste come testo semplice
// Questo è necessario perché SimplyEdit invia data.json con Content-Type: text/plain
app.use(express.text({ type: 'text/plain', limit: '10mb' }));

// Serve i file statici (html, css, js, immagini) dalla cartella del progetto
app.use(express.static(__dirname));

// --- ROTTE DI AUTENTICAZIONE ---
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === user.username && password === user.password) {
    req.session.isAuthenticated = true;
    console.log('Login riuscito per utente:', username);
    res.status(200).send('Login riuscito');
  } else {
    console.log('Tentativo di login fallito per utente:', username);
    res.status(401).send('Credenziali non valide');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Logout fallito');
    }
    res.clearCookie('connect.sid'); // Pulisce il cookie di sessione
    console.log('Logout eseguito.');
    res.status(200).send('Logout riuscito');
  });
});

// Nuova rotta per salvare l'HTML della sezione <main>
app.post('/save-main-html', isAuthenticated, (req, res) => {
  const { filePath, mainContent } = req.body;
  const fullPath = path.join(__dirname, filePath);

  // Controllo di sicurezza per assicurarsi che si stia modificando un file nella directory del progetto
  if (!fullPath.startsWith(__dirname)) {
    return res.status(400).send('Percorso file non valido.');
  }

  fs.readFile(fullPath, 'utf8', (err, fileData) => {
    if (err) {
      console.error('Errore lettura file:', err);
      return res.status(500).send('Errore durante la lettura del file.');
    }

    const $ = cheerio.load(fileData);
    $('main.main').html(mainContent); // Sostituisce il contenuto di <main>

    fs.writeFile(fullPath, $.html(), 'utf8', (writeErr) => {
      if (writeErr) {
        console.error('Errore scrittura file:', writeErr);
        return res.status(500).send('Errore durante il salvataggio del file.');
      }

      console.log(`Contenuto di <main> in ${filePath} aggiornato.`);

      const commitMessage = `Aggiornamento HTML di <main> per ${filePath}`;
      const gitCommand = `git add "${filePath.substring(1)}" && git commit -m "${commitMessage}"`;

      exec(gitCommand, (gitErr, stdout, stderr) => {
        if (gitErr) {
          console.error('Errore Git:', stderr);
          return res.status(500).send('File salvato, ma commit Git fallito.');
        }
        console.log('Commit Git per <main> eseguito:', stdout);
        res.status(200).send('Contenuto HTML salvato e committato.');
      });
    });
  });
});


app.get('/check-auth', (req, res) => {
  res.json({ isAuthenticated: !!req.session.isAuthenticated });
});

/* Rotta per l'API che elenca le pagine di ricerca
app.get('/api/research-pages', (req, res) => {
  const researchDir = path.join(__dirname, 'research');
  fs.readdir(researchDir, (err, files) => {
    if (err) {
      console.error("Errore durante la lettura della cartella research:", err);
      return res.status(500).json([]);
    }
    const htmlFiles = files
      .filter(file => file.endsWith('.html'))
      .map(file => {
        const name = path.basename(file, '.html').replace(/-/g, ' ');
        return {
          link: {
            href: `/research/${file}`,
            innerHTML: name.charAt(0).toUpperCase() + name.slice(1)
          }
        };
      });
    res.json(htmlFiles);
  });
});*/

// Rotta per creare una nuova pagina da un template
app.post('/create-page-from-template', isAuthenticated, (req, res) => {
  const { template, path: newPagePath } = req.body;
  const templateFullPath = path.join(__dirname, 'templates', template);
  const newPageFullPath = path.join(__dirname, newPagePath);

  console.log(`Richiesta di creazione file: ${newPageFullPath} dal template: ${templateFullPath}`);

  // Legge il contenuto del template
  fs.readFile(templateFullPath, 'utf8', (err, templateContent) => {
    if (err) {
      console.error('Errore lettura template:', err);
      return res.status(500).json({ message: 'Errore durante la lettura del template.' });
    }

    // Scrive il nuovo file con il contenuto del template
    fs.writeFile(newPageFullPath, templateContent, 'utf8', (writeErr) => {
      if (writeErr) {
        console.error('Errore scrittura nuova pagina:', writeErr);
        return res.status(500).json({ message: 'Errore durante la creazione della pagina.' });
      }

      console.log(`File ${newPageFullPath} creato con successo.`);

      // Aggiunge il nuovo file a Git e fa il commit
      const commitMessage = `Aggiunta nuova pagina: ${newPagePath}`;
      // Usa il percorso relativo per il comando git, è più robusto
      const gitCommand = `git add "${newPagePath.substring(1)}" && git commit -m "${commitMessage}"`;

      exec(gitCommand, (gitErr, stdout, stderr) => {
        if (gitErr) {
          console.error('Errore Git:', stderr);
          return res.status(500).json({ message: 'Pagina creata, ma commit Git fallito.' });
        }
        console.log('Commit Git per nuova pagina eseguito:', stdout);
        res.json({ message: `Pagina ${newPagePath} creata e aggiunta a Git.` });
      });
    });
  });
});

// Nuova rotta per creare una pagina VUOTA (usata dalla Sitemap)
app.post('/create-blank-page', isAuthenticated, (req, res) => {
  const { path: newPagePath } = req.body;
  const templateFullPath = path.join(__dirname, 'templates', 'blank-template.html');
  const newPageFullPath = path.join(__dirname, newPagePath);

  console.log(`Richiesta di creazione pagina vuota: ${newPageFullPath}`);

  // Controlla se il file esiste già per evitare sovrascritture accidentali
  if (fs.existsSync(newPageFullPath)) {
    console.log(`Creazione fallita: il file ${newPageFullPath} esiste già.`);
    return res.status(409).json({ message: 'File already exists.' });
  }

  fs.readFile(templateFullPath, 'utf8', (err, templateContent) => {
    if (err) {
      console.error('Errore lettura blank-template:', err);
      return res.status(500).json({ message: 'Errore durante la lettura del template.' });
    }

    fs.writeFile(newPageFullPath, templateContent, 'utf8', (writeErr) => {
      if (writeErr) {
        console.error('Errore scrittura nuova pagina:', writeErr);
        return res.status(500).json({ message: 'Errore durante la creazione della pagina.' });
      }

      console.log(`File ${newPageFullPath} creato con successo.`);
      const commitMessage = `Aggiunta nuova pagina: ${newPagePath}`;
      const gitCommand = `git add "${newPagePath.substring(1)}" && git commit -m "${commitMessage}"`;

      exec(gitCommand, (gitErr, stdout, stderr) => {
        if (gitErr) {
          console.error('Errore Git:', stderr);
          return res.status(500).json({ message: 'Pagina creata, ma commit Git fallito.' });
        }
        console.log('Commit Git per nuova pagina eseguito:', stdout);
        res.json({ message: `Pagina ${newPagePath} creata e aggiunta a Git.` });
      });
    });
  });
});


/* Rotta fittizia per gestire il check di connessione di SimplyEdit
app.post('/login', (req, res) => {
  console.log('Richiesta di connessione da SimplyEdit ricevuta. Rispondo OK.');
  res.status(200).send('OK');
});*/

// Rotta per gestire il salvataggio del file data.json
app.put('/data/data.json', isAuthenticated, (req, res) => {
  const filePath = path.join(__dirname, 'data', 'data.json');
  // Il corpo della richiesta (req.body) è il testo del file inviato da SimplyEdit
  const content = req.body;

  console.log('Richiesta di salvataggio per data.json ricevuta.');

  fs.writeFile(filePath, content, 'utf8', (writeErr) => {
    if (writeErr) {
      console.error('Errore durante la scrittura di data.json:', writeErr);
      return res.status(500).send('Errore durante la scrittura del file.');
    }

    console.log('File data.json salvato con successo.');

    // --- Integrazione con Git ---
    const commitMessage = 'Aggiornamento contenuti sito via SimplyEdit';
    const gitCommand = `git add data/data.json && git commit -m "${commitMessage}"`;

    exec(gitCommand, (gitErr, stdout, stderr) => {
      if (gitErr) {
        console.error('Errore Git:', stderr);
        // Rispondiamo comunque con successo al client, perché il file è stato salvato.
        // L'errore di commit verrà loggato solo sul server.
        return res.status(200).send('File salvato, ma commit fallito.');
      }
      console.log('Commit Git eseguito con successo:', stdout);
      res.status(200).send('File salvato e commit eseguito.');
    });
  });
});

// API endpoint per la ricerca di pubblicazioni su art.torvergata.it
app.get('/api/search-publications', async (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ message: 'Query di ricerca mancante.' });
  }

  // URL per l'esportazione in formato CSV, molto più robusto dello scraping HTML
  // URL per la ricerca semplice, che restituisce HTML
  const searchUrl = `https://art.torvergata.it/simple-search?query=${encodeURIComponent(query)}&rpp=100`; // Aumento i risultati per pagina

  try {
    console.log(`Scraping risultati per "${query}" da: ${searchUrl}`);

    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`Errore dalla rete: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const publications = [];
    // Selettore per iterare su ogni riga <tr> della tabella dei risultati
    $('#tableView_body table tbody tr').each((i, el) => {
      const columns = $(el).find('td');
      
      const date = $(columns[0]).text().trim();
      const titleElement = $(columns[1]).find('a');
      const title = titleElement.text().trim();
      const link = `https://art.torvergata.it${titleElement.attr('href')}`;
      const authors = $(columns[2]).text().trim();
      const type = $(columns[3]).text().trim();

      // Analizza l'icona del file e la traduce in un nome standard
      const iconElement = $(columns[4]).find('i');
      let fileIconType = 'unknown'; // Default
      if (iconElement.hasClass('fa-minus')) {
        fileIconType = 'minus';
      } else if (iconElement.hasClass('fa-lock')) {
        fileIconType = 'lock';
      } else if (iconElement.hasClass('fa-file-alt')) {
        fileIconType = 'file';
      }

      if (title) { // Aggiungi solo se un titolo è stato trovato
        publications.push({ title, link, authors, date, type, fileIcon: fileIconType });
      }
    });

    res.json(publications);

  } catch (error) {
    console.error('Errore durante lo scraping delle pubblicazioni:', error);
    res.status(500).json({ message: 'Errore durante il recupero delle pubblicazioni.' });
  }
});


/* API endpoint per ottenere la lista delle pagine di ricerca
app.get('/api/research-pages', (req, res) => {

  const researchDir = path.join(__dirname, 'research');

  fs.readdir(researchDir, (err, files) => {
    if (err) {
      console.error('Impossibile leggere la cartella research:', err);
      return res.status(500).json({ message: 'Errore durante la lettura della cartella research.' });
    }

    const htmlFiles = files.filter(file => file.endsWith('.html'));
    
    // Array di "Promise" per leggere tutti i file in parallelo
    const pageDataPromises = htmlFiles.map(file => {
      return new Promise((resolve) => {
        const filePath = path.join(researchDir, file);
        fs.readFile(filePath, 'utf8', (readErr, content) => {
          if (readErr) {
            console.error(`Errore leggendo il file ${file}:`, readErr);
            resolve(null); // Risolvi con null per non bloccare tutto
          } else {
            const $ = cheerio.load(content);
            // Estrai il titolo e puliscilo un po'
            const title = $('title').text().trim();
            const href = `/research/${file}`;
            resolve({ link: { innerHTML: title, href: href } });
          }
        });
      });
    });

    // Aspetta che tutti i file siano stati letti e analizzati
    Promise.all(pageDataPromises)
      .then(pages => {
        const validPages = pages.filter(p => p !== null); // Filtra eventuali errori
        res.json(validPages);
      });
  });
});
*/
app.listen(port, () => {
  console.log(`Server in esecuzione su http://localhost:${port}`);
  console.log('La root del server è:', __dirname);
  console.log('Premi Ctrl+C per fermare il server.');
});