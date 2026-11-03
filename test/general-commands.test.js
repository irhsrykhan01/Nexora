import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeneralCommands } from '../src/commands/general.js';

function harness() {
  const sent = [];
  return {
    sent,
    sock: {
      async sendMessage(chat, payload) {
        sent.push({ chat, ...payload });
      },
    },
  };
}

function command(name) {
  const found = createGeneralCommands().find((item) => item.name === name);
  assert.ok(found, 'command should exist: ' + name);
  return found;
}

test('calculator command returns the computed result', async () => {
  const { sock, sent } = harness();
  await command('calc').execute({
    sock, chat: 'chat@s.whatsapp.net', argumentText: '12 * (3 + 2)',
  });
  assert.match(sent[0].text, /60/);
});

test('calculator command gives usage when no expression is supplied', async () => {
  const { sock, sent } = harness();
  await command('calc').execute({ sock, chat: 'chat@s.whatsapp.net', argumentText: '' });
  assert.match(sent[0].text, /Contoh/);
});

test('dice command returns values within configured bounds', async () => {
  const { sock, sent } = harness();
  await command('roll').execute({
    sock, chat: 'chat@s.whatsapp.net', argumentText: '4d6',
  });
  const results = sent[0].text.match(/Hasil: ([\d, ]+)/)[1]
    .split(',').map((value) => Number(value.trim()));
  assert.equal(results.length, 4);
  assert.ok(results.every((value) => value >= 1 && value <= 6));
});

test('dice command rejects unsupported ranges', async () => {
  const { sock, sent } = harness();
  await command('roll').execute({
    sock, chat: 'chat@s.whatsapp.net', argumentText: '99d6',
  });
  assert.match(sent[0].text, /Batas/);
});

test('choose command returns one of the supplied options', async () => {
  const { sock, sent } = harness();
  const options = ['nasi goreng', 'mie ayam', 'soto'];
  await command('choose').execute({
    sock, chat: 'chat@s.whatsapp.net', argumentText: options.join(' | '),
  });
  assert.ok(options.some((option) => sent[0].text.includes(option)));
});

test('memory command reports process memory metrics', async () => {
  const { sock, sent } = harness();
  await command('memory').execute({ sock, chat: 'chat@s.whatsapp.net' });
  assert.match(sent[0].text, /RSS:/);
  assert.match(sent[0].text, /Heap terpakai:/);
  assert.match(sent[0].text, /External:/);
});

test('uptime command responds with a duration', async () => {
  const { sock, sent } = harness();
  await command('uptime').execute({ sock, chat: 'chat@s.whatsapp.net' });
  assert.match(sent[0].text, /Nexora aktif selama/);
});

test('8ball requires a question before returning a response', async () => {
  const { sock, sent } = harness();
  await command('8ball').execute({
    sock, chat: 'chat@s.whatsapp.net', argumentText: '',
  });
  assert.match(sent[0].text, /pertanyaan/);
});
