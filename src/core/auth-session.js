import { rm } from 'node:fs/promises';

export async function clearWhatsAppAuthSession(authDir) {
  if (typeof authDir !== 'string' || authDir.length === 0) {
    throw new TypeError('Auth directory path is required.');
  }

  await rm(authDir, { recursive: true, force: true });
}
