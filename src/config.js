import path from 'node:path';
import process from 'node:process';
import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

function readString(name, fallback) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

export const config = Object.freeze({
  botName: readString('BOT_NAME', 'Nexora'),
  prefix: readString('PREFIX', '.'),
  authDir: path.resolve(readString('AUTH_DIR', './data/auth')),
  logLevel: readString('LOG_LEVEL', 'info'),
});
