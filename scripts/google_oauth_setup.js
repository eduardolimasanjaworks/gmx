/**
 * Script de configuração OAuth2 para Google Drive.
 * 
 * Execute UMA VEZ: node scripts/google_oauth_setup.js
 * 
 * 1. Abrirá uma URL no terminal
 * 2. Abra essa URL no navegador, faça login e autorize
 * 3. O token será salvo automaticamente em .google-token.json
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';

const ROOT_DIR = process.cwd();
const CLIENT_FILE = path.join(ROOT_DIR, 'google-oauth-client.json');
const TOKEN_FILE = path.join(ROOT_DIR, '.google-token.json');
const PORT = 3333;

if (!fs.existsSync(CLIENT_FILE)) {
  console.error('❌ Arquivo google-oauth-client.json não encontrado!');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
const creds = raw.web || raw.installed || raw;
const { client_id, client_secret } = creds;
const redirect_uri = 'http://localhost:3333';

const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('\n🔑 CONFIGURAÇÃO OAUTH2 - Google Drive\n');
console.log('Abra a URL abaixo no navegador e faça login:\n');
console.log('👉', authUrl);
console.log('\nAguardando autorização...\n');

// Servidor local para capturar o callback OAuth
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>❌ Código não encontrado. Tente novamente.</h2>');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h1>✅ Autorização concluída!</h1>
        <p>Token salvo em <strong>.google-token.json</strong></p>
        <p>Pode fechar esta aba e voltar ao terminal.</p>
        <p style="color:green;font-weight:bold">Reinicie o servidor de upload para aplicar as configurações.</p>
      </body></html>
    `);

    console.log('✅ Token salvo em .google-token.json');
    console.log('🔄 Reinicie o servidor: node scripts/upload_server.js\n');
    server.close();
  } catch (err) {
    console.error('❌ Erro ao obter token:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>❌ Erro: ${err.message}</h2>`);
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`Servidor aguardando em http://localhost:${PORT}`);
});
