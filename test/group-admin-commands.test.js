import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroupCommands } from '../src/commands/groups.js';

function createSocket() {
  const calls = [];
  return {
    user: { id: '100@s.whatsapp.net' },
    calls,
    async groupMetadata() {
      return {
        subject: 'Test',
        participants: [
          { id: '100@s.whatsapp.net', admin: 'admin' },
          { id: '200@s.whatsapp.net', admin: null },
        ],
      };
    },
    async sendMessage(chat, payload) { calls.push({ method: 'sendMessage', chat, payload }); },
    async groupParticipantsUpdate(chat, targets, action) {
      calls.push({ method: 'groupParticipantsUpdate', chat, targets, action });
      return targets.map((jid) => ({ jid, status: '200' }));
    },
    async groupSettingUpdate(chat, setting) { calls.push({ method: 'groupSettingUpdate', chat, setting }); },
    async groupRevokeInvite(chat) { calls.push({ method: 'groupRevokeInvite', chat }); return 'NEWCODE'; },
  };
}

const chat = '123@g.us';
const member = '200@s.whatsapp.net';
const mentionMessage = {
  message: {
    extendedTextMessage: {
      contextInfo: { mentionedJid: [member] },
    },
  },
};

function find(name) {
  return createGroupCommands().find((item) => item.name === name);
}

test('kick, promote, and demote only target mentioned members', async () => {
  const sock = createSocket();

  await find('kick').execute({ sock, chat, message: mentionMessage });
  await find('promote').execute({ sock, chat, message: mentionMessage });
  await find('demote').execute({ sock, chat, message: mentionMessage });

  assert.deepEqual(sock.calls.filter((call) => call.method === 'groupParticipantsUpdate').map(({ targets, action }) => ({ targets, action })), [
    { targets: [member], action: 'remove' },
    { targets: [member], action: 'promote' },
    { targets: [member], action: 'demote' },
  ]);
});

test('add validates phone numbers and sends participant add request', async () => {
  const sock = createSocket();

  await find('add').execute({ sock, chat, argumentText: '6281234567890' });

  assert.deepEqual(sock.calls[0], {
    method: 'groupParticipantsUpdate',
    chat,
    targets: ['6281234567890@s.whatsapp.net'],
    action: 'add',
  });
});

test('group open and close use WhatsApp group setting actions', async () => {
  const sock = createSocket();

  await find('groupopen').execute({ sock, chat });
  await find('groupclose').execute({ sock, chat });

  assert.deepEqual(sock.calls.filter((call) => call.method === 'groupSettingUpdate').map(({ setting }) => setting), [
    'not_announcement',
    'announcement',
  ]);
});

test('reset invite revokes old link and returns the replacement', async () => {
  const sock = createSocket();

  await find('resetgrouplink').execute({ sock, chat });

  assert.equal(sock.calls[0].method, 'groupRevokeInvite');
  assert.match(sock.calls[1].payload.text, /NEWCODE/);
});

test('group moderation requires the bot to be an admin', async () => {
  const sock = createSocket();
  sock.user.id = '999@s.whatsapp.net';

  await assert.rejects(
    find('kick').execute({ sock, chat, message: mentionMessage }),
    /Jadikan Nexora sebagai admin/
  );
});

test('moderation refuses to target the bot itself', async () => {
  const sock = createSocket();
  const message = {
    message: {
      extendedTextMessage: {
        contextInfo: { mentionedJid: ['100@s.whatsapp.net'] },
      },
    },
  };

  await assert.rejects(
    find('kick').execute({ sock, chat, message }),
    /tidak boleh menjadi target/
  );
});
