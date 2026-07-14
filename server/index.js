// Servidor estático local — todo o processamento roda no navegador agora
// (veja src/worker/vistoriaWorker.js). Este servidor só existe para servir
// o build (dist/) via http://localhost, contornando a restrição do Chrome/Edge
// de não rodar Web Workers em módulos ES quando o HTML é aberto direto do
// disco (file://). É o mesmo código usado no GitHub Pages.

const express = require('express');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 8935;
const DIST_DIR = path.join(__dirname, '..', 'dist');

const app = express();
app.use(express.static(DIST_DIR));
app.use((req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log('Extrator de Vistorias rodando em', url);
  console.log('(deixe esta janela aberta enquanto usa a ferramenta)');
  const opener = process.platform === 'win32' ? `start "" "${url}"` : (process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`);
  exec(opener);
});
