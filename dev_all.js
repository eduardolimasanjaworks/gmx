/**
 * Start Vite + public upload server in one command.
 * Works on Windows without extra deps (no concurrently).
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

const nodeBin = process.execPath;
const viteBin = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');

const upload = spawn(nodeBin, ['upload_server.js'], {
  stdio: 'inherit',
  env: { ...process.env },
});

const vite = spawn(nodeBin, [viteBin], {
  stdio: 'inherit',
  env: { ...process.env },
});

const shutdown = (code = 0) => {
  try { upload.kill('SIGTERM'); } catch { }
  try { vite.kill('SIGTERM'); } catch { }
  process.exit(code);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

upload.on('exit', (code) => {
  if (code && code !== 0) shutdown(code);
});

vite.on('exit', (code) => {
  if (code && code !== 0) shutdown(code);
});

