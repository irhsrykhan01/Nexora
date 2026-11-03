import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isGroupAdmin,
  normalizeJid,
  requireBotAdmin,
  requireGroupAdmin,
  PermissionError,
} from '../src/core/group-permissions.js';

const metadata = {
  participants: [
    { id: '100:3@s.whatsapp.net', admin: 'superadmin' },
    { id: '200@s.whatsapp.net', admin: 'admin' },
    { id: '300@s.whatsapp.net', admin: null },
  ],
};

test('normalizes device JIDs before permission checks', () => {
  assert.equal(normalizeJid('100:3@s.whatsapp.net'), '100@s.whatsapp.net');
  assert.equal(isGroupAdmin(metadata, '100@s.whatsapp.net'), true);
  assert.equal(isGroupAdmin(metadata, '300@s.whatsapp.net'), false);
});

test('requires the sender to be a group admin', async () => {
  const sock = { async groupMetadata() { return metadata; } };
  await requireGroupAdmin(sock, 'group@g.us', '200@s.whatsapp.net');
  await assert.rejects(
    requireGroupAdmin(sock, 'group@g.us', '300@s.whatsapp.net'),
    PermissionError
  );
});

test('requires the bot account to be a group admin for group edits', async () => {
  const sock = {
    user: { id: '300@s.whatsapp.net' },
    async groupMetadata() { return metadata; },
  };
  await assert.rejects(requireBotAdmin(sock, 'group@g.us'), PermissionError);

  sock.user.id = '200@s.whatsapp.net';
  await requireBotAdmin(sock, 'group@g.us');
});

test('rejects direct chats for group-only permission checks', async () => {
  const sock = { async groupMetadata() { throw new Error('must not be called'); } };
  await assert.rejects(
    requireGroupAdmin(sock, '123@s.whatsapp.net', '123@s.whatsapp.net'),
    PermissionError
  );
});
