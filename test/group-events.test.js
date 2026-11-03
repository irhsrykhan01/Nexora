import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '../src/core/json-store.js';
import { createGroupEventHandler } from '../src/core/group-events.js';

test('sends welcome and goodbye only when their group settings are enabled', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nexora-events-'));
  try {
    const store = await new JsonStore(path.join(directory, 'data.json')).load();
    await store.setGroupSettings('room@g.us', { welcome: true, goodbye: false });

    const sent = [];
    const sock = {
      async sendMessage(chat, payload) {
        sent.push({ chat, ...payload });
      },
    };
    const errors = [];
    const handler = createGroupEventHandler({
      store,
      logger: { error: (...args) => errors.push(args) },
    });

    await handler({ id: 'room@g.us', participants: ['123@s.whatsapp.net'], action: 'add' }, sock);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].mentions, ['123@s.whatsapp.net']);
    assert.match(sent[0].text, /Selamat datang/);

    await handler({ id: 'room@g.us', participants: ['123@s.whatsapp.net'], action: 'remove' }, sock);
    assert.equal(sent.length, 1);

    await store.setGroupSettings('room@g.us', { goodbye: true });
    await handler({ id: 'room@g.us', participants: ['456@s.whatsapp.net'], action: 'remove' }, sock);
    assert.equal(sent.length, 2);
    assert.match(sent[1].text, /Sampai jumpa/);
    assert.deepEqual(errors, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('ignores unsupported participant actions and invalid group updates', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nexora-events-'));
  try {
    const store = await new JsonStore(path.join(directory, 'data.json')).load();
    const sent = [];
    const handler = createGroupEventHandler({
      store,
      logger: { error() { assert.fail('no error expected'); } },
    });
    const sock = { async sendMessage(...args) { sent.push(args); } };

    await handler({ id: 'not-a-group', participants: ['123@s.whatsapp.net'], action: 'add' }, sock);
    await handler({ id: 'room@g.us', participants: ['123@s.whatsapp.net'], action: 'promote' }, sock);
    assert.equal(sent.length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
