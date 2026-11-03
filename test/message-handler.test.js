import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandRegistry } from '../src/core/command-registry.js';
import { createMessageHandler } from '../src/core/message-handler.js';

function makeSocket() {
  const sent = [];
  return {
    user: { id: '900@s.whatsapp.net' },
    sent,
    async sendMessage(chat, payload) {
      sent.push({ chat, ...payload });
    },
    async groupMetadata() {
      return {
        participants: [
          { id: '100@s.whatsapp.net', admin: 'admin' },
          { id: '200@s.whatsapp.net', admin: null },
          { id: '900@s.whatsapp.net', admin: 'admin' },
        ],
      };
    },
  };
}

function upsert(text, { group = false, sender = '100@s.whatsapp.net', fromMe = false } = {}) {
  return {
    type: 'notify',
    messages: [{
      key: {
        remoteJid: group ? '123@g.us' : sender,
        participant: group ? sender : undefined,
        id: Math.random().toString(),
        fromMe,
      },
      message: { conversation: text },
    }],
  };
}

test('executes registered commands and ignores messages from the bot', async () => {
  const registry = new CommandRegistry();
  let calls = 0;
  registry.register({ name: 'hello', async execute() { calls += 1; } });
  const handler = createMessageHandler({ registry, logger: { error() {} }, cooldownMs: 0 });
  const sock = makeSocket();

  await handler.call(sock, upsert('.hello'));
  await handler.call(sock, upsert('.hello', { fromMe: true }));

  assert.equal(calls, 1);
});

test('restricts group-only commands to group chats', async () => {
  const registry = new CommandRegistry();
  registry.register({
    name: 'groupcmd',
    groupOnly: true,
    async execute() { assert.fail('must not execute in direct chat'); },
  });
  const handler = createMessageHandler({ registry, logger: { error() {} }, cooldownMs: 0 });
  const sock = makeSocket();

  await handler.call(sock, upsert('.groupcmd'));
  assert.match(sock.sent[0].text, /hanya bisa digunakan di grup/i);
});

test('checks group admin status before executing admin-only commands', async () => {
  const registry = new CommandRegistry();
  let calls = 0;
  registry.register({
    name: 'admincmd',
    groupOnly: true,
    adminOnly: true,
    async execute() { calls += 1; },
  });
  const handler = createMessageHandler({ registry, logger: { error() {} }, cooldownMs: 0 });
  const sock = makeSocket();

  await handler.call(sock, upsert('.admincmd', { group: true, sender: '200@s.whatsapp.net' }));
  assert.equal(calls, 0);
  assert.match(sock.sent[0].text, /admin grup/i);

  await handler.call(sock, upsert('.admincmd', { group: true, sender: '100@s.whatsapp.net' }));
  assert.equal(calls, 1);
});

test('applies per-sender command cooldowns', async () => {
  const registry = new CommandRegistry();
  let calls = 0;
  registry.register({ name: 'fast', async execute() { calls += 1; } });
  let time = 10_000;
  const handler = createMessageHandler({
    registry,
    logger: { error() {} },
    cooldownMs: 500,
    now: () => time,
  });
  const sock = makeSocket();

  await handler.call(sock, upsert('.fast'));
  await handler.call(sock, upsert('.fast'));
  assert.equal(calls, 1);
  assert.match(sock.sent[0].text, /Tunggu sebentar/);

  time += 501;
  await handler.call(sock, upsert('.fast'));
  assert.equal(calls, 2);
});

test('passes ordinary chat text to the active game manager', async () => {
  const registry = new CommandRegistry();
  let handled = 0;
  const gameManager = {
    async handleMessage(chat, text) {
      handled += 1;
      assert.equal(chat, '100@s.whatsapp.net');
      assert.equal(text, 'jawaban');
    },
  };
  const handler = createMessageHandler({
    registry,
    logger: { error() {} },
    gameManager,
    cooldownMs: 0,
  });
  await handler.call(makeSocket(), upsert('jawaban'));
  assert.equal(handled, 1);
});
