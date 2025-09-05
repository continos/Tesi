const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cheerio = require('cheerio'); 

const app = express();
const port = 3000;

// Middleware per analizzare i dati POST inviati dal form
// Usiamo un limite alto perche' inviamo l'intera pagina HTML
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve i file statici (html, css, js, immagini) dalla cartella corrente
app.use(express.static(__dirname));

// Backup del contenuto originale per possibile revert
let originalContentBackup = null;

// Gestisce la richiesta POST a /save
app.post('/save', (req, res) => {
  const { file, content, scope } = req.body;
  const filePath = path.join(__dirname, file);

  // Controllo di sicurezza
  if (path.dirname(filePath) !== __dirname || !file.endsWith('.html')) {
    return res.status(400).send('Error: Invalid file path or file type.');
  }

  // Leggi il file esistente e crea backup
  fs.readFile(filePath, 'utf8', (readErr, existingContent) => {
    if (readErr) {
      console.error('Error reading file:', readErr);
      return res.status(500).send('Error reading file.');
    }
    
    // Salva il contenuto originale per possibile revert
    originalContentBackup = existingContent;

    // Usa cheerio per analizzare e modificare l'HTML
    const $ = cheerio.load(existingContent);
    
    // Sostituisci solo la sezione hero
    if (scope === 'hero') {
      $('#hero').replaceWith(content);
    } else {
      // Per altri scope, implementa la logica appropriata
      $(`#${scope}`).replaceWith(content);
    }

    const updatedHtml = $.html();

    // Scrivi il file aggiornato
    fs.writeFile(filePath, updatedHtml, (writeErr) => {
      if (writeErr) {
        console.error('Error writing file:', writeErr);
        return res.status(500).send('Error writing file.');
      }

      // Integrazione Git
      const commitMessage = `Updated ${scope} section in ${file} via web editor`;
      const gitCommand = `git add "${file}" && git commit -m "${commitMessage.replace(/"/g, '\\"')}"`;
      exec(gitCommand, (gitErr, stdout, stderr) => {
        if (gitErr) {
          console.error('Git error:', stderr);
          // Revert delle modifiche se Git fallisce
          fs.writeFile(filePath, originalContentBackup, (revertErr) => {
            if (revertErr) {
              console.error('Error reverting file:', revertErr);
              return res.status(500).send('File saved but git commit failed and could not revert.');
            }
            return res.status(500).send('File saved but git commit failed. Changes reverted.');
          });
        } else {
          console.log('Git output:', stdout);
          res.status(200).send('success');
        }
      });
    });
  });
});
  /*fs.writeFile(filePath, content, (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return res.status(500).send('Error: Could not write to file. Check file permissions.');
    }

    // --- INTEGRAZIONE GIT ---
    const commitMessage = `Updated content for ${fileName} via web editor`;
    
    // Funzione di escape per la sicurezza dei comandi shell
    const escapeShellArg = (arg) => `'${arg.replace(/'/g, "'\\''")}'`;

    const gitCommand = `git add ${escapeShellArg(fileName)} && git commit -m ${escapeShellArg(commitMessage)}`;

    exec(gitCommand, (gitErr, stdout, stderr) => {
      if (gitErr) {
        console.error('Git error:', stderr);
        // Invia comunque successo all'utente, ma logga l'errore git sul server
        return res.status(200).send('File saved, but error during git commit.');
      }
      console.log('Git output:', stdout);
      res.status(200).send('success');
    });
  });
});*/

// Endpoint per revert manuale (opzionale)
app.post('/revert', (req, res) => {
  if (!originalContentBackup) {
    return res.status(400).send('No backup available for revert.');
  }
  
  const filePath = path.join(__dirname, 'index.html');
  fs.writeFile(filePath, originalContentBackup, (err) => {
    if (err) {
      console.error('Error reverting file:', err);
      return res.status(500).send('Error during revert.');
    }
    res.status(200).send('File reverted to previous version.');
  });
});

app.listen(port, () => {
  console.log('Server running at http://localhost:' + port);
  console.log('Open your browser and navigate to http://localhost:' + port);
  console.log('Press Ctrl+C to stop the server.');
});
