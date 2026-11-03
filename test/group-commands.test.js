import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroupCommands } from '../src/commands/groups.js';

function createSocket({ botAdmin = true } = {}) {
  const updates = [];
  return {
    user: { id: botAdmin ? '100@s.whatsapp.net' : '300@s.whatsapp.net' },
    updates,
    async groupMetadata() {
      return {
        subject: 'Test Group',
        desc: 'Group description',
        participants: [
          { id: '100@s.whatsapp.net', admin: 'admin' },
          { id: '300@s.whatsapp.net', admin: null },
        ],
      };
    },
    async sendMessage(chat, payload) {
      updates.push({ type: 'message', chat, ...payload });
    },
    async groupUpdateSubject(chat, subject) {
      updates.push({ type: 'subject', chat, subject });
    },
    async groupUpdateDescription(chat, description) {
      updates.push({ type: 'description', chat, description });
    },
    async groupInviteCode() {
      return 'TESTINVITE';
    },
  };
}

test('group info returns metadata and member totals', async () => {
  const commands = createGroupCommands();
  const sock = createSocket();

  await commands.find((item) => item.name === 'groupinfo').execute({
    sock,
    chat: 'room@g.us',
  });

  assert.match(sock.updates[0].text, /Test Group/);
  assert.match(sock.updates[0].text, /Anggota:\* 2/);
});

test('welcome setting writes to persistent store', async () => {
  const changes = [];
  const store = {
    async setGroupSettings(chat, patch) {
      changes.push({ chat, patch });
    },
  };
  const commands = createGroupCommands({ store });
  const sock = createSocket();

  await commands.find((item) => item.name === 'setwelcome').execute({
    sock,
    chat: 'room@g.us',
    args: ['on'],
  });

  assert.deepEqual(changes, [
    { chat: 'room@g.us', patch: { welcome: true } },
  ]);
  assert.match(sock.updates[0].text, /diaktifkan/);
});

test('group edits require the bot itself to be an admin', async () => {
  const commands = createGroupCommands();
  const sock = createSocket({ botAdmin: false });

  await assert.rejects(
    commands.find((item) => item.name === 'groupname').execute({
      sock,
      chat: 'room@g.us',
      argumentText: 'New Group',
    }),
    /Jadikan Nexora sebagai admin/
  );
});

test('group name and description are updated after admin checks', async () => {
  const commands = createGroupCommands();
  const sock = createSocket();

  await commands.find((item) => item.name === 'groupname').execute({
    sock,
    chat: 'room@g.us',
    argumentText: 'New Group',
  });
  await commands.find((item) => item.name === 'groupdesc').execute({
    sock,
    chat: 'room@g.us',
    argumentText: 'New description',
  });

  assert.deepEqual(sock.updates.slice(0, 2), [
    { type: 'subject', chat: 'room@g.us', subject: 'New Group' },
    { type: 'message', chat: 'room@g.us', text: '✅ Nama grup berhasil diperbarui.' },
  ]);
  assert.deepEqual(sock.updates.slice(2, 4), [
    { type: 'description', chat: 'room@g.us', description: 'New description' },
    { type: 'message', chat: 'room@g.us', text: '✅ Deskripsi grup berhasil diperbarui.' },
  ]);
});

test('group invite link requires bot admin access', async () => {
  const commands = createGroupCommands();
  const sock = createSocket();

  await commands.find((item) => item.name === 'grouplink').execute({
    sock,
    chat: 'room@g.us',
  });

  assert.match(sock.updates[0].text, /chat\.whatsapp\.com\/TESTINVITE/);
});
