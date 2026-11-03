import test from 'node:test';
import assert from 'node:assert/strict';
import menu from '../src/commands/menu.js';
import { CommandRegistry } from '../src/core/command-registry.js';

function createRegistry() {
  const registry = new CommandRegistry();
  registry.register({
    name: 'calc',
    aliases: ['hitung'],
    description: 'Hitung ekspresi.',
    usage: 'calc 2 + 2',
    category: 'tools',
    async execute() {},
  });
  return registry;
}

test('shows detailed help for a command and its aliases', async () => {
  const sent = [];
  const sock = { async sendMessage(chat, payload) { sent.push({ chat, ...payload }); } };

  await menu.execute({
    sock,
    chat: 'chat@s.whatsapp.net',
    registry: createRegistry(),
    argumentText: 'hitung',
  });

  assert.match(sent[0].text, /calc 2 \+ 2/);
  assert.match(sent[0].text, /Alias: \.hitung/);
});

test('reports unknown commands in detailed help mode', async () => {
  const sent = [];
  const sock = { async sendMessage(chat, payload) { sent.push({ chat, ...payload }); } };

  await menu.execute({
    sock,
    chat: 'chat@s.whatsapp.net',
    registry: createRegistry(),
    argumentText: 'notfound',
  });

  assert.match(sent[0].text, /tidak ditemukan/i);
});

test('shows the menu when no command name is provided', async () => {
  const sent = [];
  const sock = { async sendMessage(chat, payload) { sent.push({ chat, ...payload }); } };

  await menu.execute({
    sock,
    chat: 'chat@s.whatsapp.net',
    registry: createRegistry(),
    argumentText: '',
  });

  assert.match(sent[0].text, /NEXORA/);
  assert.match(sent[0].text, /TOOLS/);
});
