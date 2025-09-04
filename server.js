const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = 3000;

// Middleware per analizzare i dati POST inviati dal form
// Usiamo un limite alto perche' inviamo l'intera pagina HTML
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve i file statici (html, css, js, immagini) dalla cartella corrente
app.use(express.static(__dirname));

// Gestisce la richiesta POST a /save
app.post('/save', (req, res) => {
  const fileName = req.body.file;
  const content = req.body.content;

  // Controllo di sicurezza base: permette di salvare solo file .html nella stessa cartella
  const filePath = path.join(__dirname, fileName);
  
  if (path.dirname(filePath) !== __dirname || !fileName.endsWith('.html')) {
    return res.status(400).send('Error: Invalid file path or file type.');
  }

  fs.writeFile(filePath, content, (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return res.status(500).send('Error: Could not write to file. Check file permissions.');
    }

    // --- INTEGRAZIONE GIT ---
    const commitMessage = `Updated content for ${fileName} via web editor`;
    
    // Funzione di escape per la sicurezza dei comandi shell
    const escapeShellArg = (arg) => `'${arg.replace(/'/g, "'\\''")}'`;

    const gitCommand = `git add ${escapeShellArg(filePath)} && git commit -m ${escapeShellArg(commitMessage)}`;

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
});

app.listen(port, () => {
  console.log('Server running at http://localhost:' + port);
  console.log('Open your browser and navigate to http://localhost:' + port);
  console.log('Press Ctrl+C to stop the server.');
});
