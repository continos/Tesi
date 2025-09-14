const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware per analizzare il corpo delle richieste come testo semplice
// Questo è necessario perché SimplyEdit invia data.json con Content-Type: text/plain
app.use(express.text({ type: 'text/plain', limit: '10mb' }));

// Serve i file statici (html, css, js, immagini) dalla cartella del progetto
app.use(express.static(__dirname));

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
app.post('/create-page-from-template', (req, res) => {
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
app.post('/create-blank-page', (req, res) => {
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


// Rotta fittizia per gestire il check di connessione di SimplyEdit
app.post('/login', (req, res) => {
  console.log('Richiesta di connessione da SimplyEdit ricevuta. Rispondo OK.');
  res.status(200).send('OK');
});

// Rotta per gestire il salvataggio del file data.json
app.put('/data/data.json', (req, res) => {
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
/*
const cheerio = require('cheerio');

// API endpoint per ottenere la lista delle pagine di ricerca
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