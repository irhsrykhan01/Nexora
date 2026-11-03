import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '../src/core/json-store.js';

test('persists group settings and restores them after reload', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nexora-store-'));
  const filePath = path.join(directory, 'data.json');

  try {
    const store = await new JsonStore(filePath).load();
    assert.deepEqual(store.getGroupSettings('123@g.us'), {
      welcome: false,
      goodbye: false,
    });

    await store.setGroupSettings('123@g.us', { welcome: true });
    await store.setGroupSettings('123@g.us', { goodbye: true });

    const reloaded = await new JsonStore(filePath).load();
    assert.deepEqual(reloaded.getGroupSettings('123@g.us'), {
      welcome: true,
      goodbye: true,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects invalid group identifiers and setting values', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nexora-store-'));
  try {
    const store = await new JsonStore(path.join(directory, 'data.json')).load();
    assert.throws(() => store.getGroupSettings('not-a-group'));
    await assert.rejects(store.setGroupSettings('123@g.us', { welcome: 'yes' }));
    await assert.rejects(store.setGroupSettings('123@g.us', { owner: true }));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('requires load before accessing settings', () => {
  const store = new JsonStore('./unused-test-data.json');
  assert.throws(() => store.getGroupSettings('123@g.us'), /load/i);
});

test('does not silently overwrite a malformed data file', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nexora-store-'));
  const filePath = path.join(directory, 'data.json');

  try {
    await import('node:fs/promises').then(({ writeFile }) =>
      writeFile(filePath, '{"version":99}', 'utf8')
    );
    await assert.rejects(new JsonStore(filePath).load(), /Unable to read/i);
    assert.equal(await readFile(filePath, 'utf8'), '{"version":99}');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
