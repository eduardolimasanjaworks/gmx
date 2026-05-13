import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';

const ROOT_DIR = process.cwd();
const CLIENT_FILE = path.join(ROOT_DIR, 'google-oauth-client.json');
const TOKEN_FILE = path.join(ROOT_DIR, '.google-token.json');

let driveService = null;

function getOAuth2Client() {
  if (!fs.existsSync(CLIENT_FILE)) {
    throw new Error('google-oauth-client.json não encontrado. Verifique as credenciais OAuth.');
  }
  if (!fs.existsSync(TOKEN_FILE)) {
    throw new Error(
      'Token não encontrado! Execute primeiro: node scripts/google_oauth_setup.js'
    );
  }

  const raw = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
  const creds = raw.web || raw.installed || raw;
  const { client_id, client_secret } = creds;
  const redirect_uri = 'http://localhost:3333';
  const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
  oauth2Client.setCredentials(tokens);

  // Salva token atualizado quando renovar automaticamente
  oauth2Client.on('tokens', (newTokens) => {
    const current = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    const merged = { ...current, ...newTokens };
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(merged, null, 2));
  });

  return oauth2Client;
}

function getDriveService() {
  if (driveService) return driveService;
  const auth = getOAuth2Client();
  driveService = google.drive({ version: 'v3', auth });
  return driveService;
}

/**
 * Faz o upload de um stream de arquivo para o Google Drive
 */
export async function uploadFileToDrive(fileName, mimeType, fileStream, folderId) {
  const drive = getDriveService();

  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };

  const media = {
    mimeType: mimeType,
    body: fileStream,
  };

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });
    return response.data;
  } catch (error) {
    console.error('Erro no upload para o Google Drive:', error);
    throw error;
  }
}

/**
 * Cria uma pasta no Google Drive
 */
export async function createFolderToDrive(folderName, parentFolderId) {
  const drive = getDriveService();

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId]
  };

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, name, webViewLink',
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar pasta no Google Drive:', error);
    throw error;
  }
}
