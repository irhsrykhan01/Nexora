import path from 'node:path';
import process from 'node:process';
import { existsSync } from 'node:fs';

if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}

function readString(name, fallback) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function readInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(name + ' must be an integer between ' + minimum + ' and ' + maximum + '.');
  }
  return value;
}

const prefix = readString('PREFIX', '.');
if (prefix.length > 3 || /\s/.test(prefix)) {
  throw new Error('PREFIX must be 1–3 characters and cannot contain spaces.');
}

export const config = Object.freeze({
  botName: readString('BOT_NAME', 'Nexora'),
  prefix,
  authDir: path.resolve(readString('AUTH_DIR', './data/auth')),
  dataFile: path.resolve(readString('DATA_FILE', './data/nexora.json')),
  logLevel: readString('LOG_LEVEL', 'info'),
  commandCooldownMs: readInteger('COMMAND_COOLDOWN_MS', 1_000, 0, 60_000),
});
