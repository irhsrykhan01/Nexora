import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { clearWhatsAppAuthSession } from '../src/core/auth-session.js';

test('clears only the WhatsApp auth directory and preserves adjacent bot data', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nexora-auth-'));
  const authDir = path.join(root, 'auth');
  const dataDir = path.join(root, 'data');
  try {
    await mkdir(authDir);
    await mkdir(dataDir);
    await writeFile(path.join(authDir, 'creds.json'), '{"old":true}');
    await writeFile(path.join(dataDir, 'settings.json'), '{"welcome":true}');

    await clearWhatsAppAuthSession(authDir);

    await assert.rejects(readFile(path.join(authDir, 'creds.json')));
    assert.equal(await readFile(path.join(dataDir, 'settings.json'), 'utf8'), '{"welcome":true}');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects an empty auth directory path', async () => {
  await assert.rejects(clearWhatsAppAuthSession(''), TypeError);
});
