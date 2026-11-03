import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMessage, parseCommand } from '../src/core/message.js';

test('parses a prefixed command and its arguments', () => {
  assert.deepEqual(parseCommand('.ping hello world', '.'), {
    name: 'ping',
    args: ['hello', 'world'],
    argumentText: 'hello world',
  });
});

test('supports custom prefixes and ignores ordinary or empty commands', () => {
  assert.equal(parseCommand('hello', '.'), null);
  assert.equal(parseCommand('.', '.'), null);
  assert.equal(parseCommand('.bad! command', '.'), null);
  assert.deepEqual(parseCommand('!ping test', '!'), {
    name: 'ping',
    args: ['test'],
    argumentText: 'test',
  });
});

test('normalizes a direct text message', () => {
  const message = normalizeMessage({
    key: { remoteJid: '123@s.whatsapp.net', id: 'ABC', fromMe: false },
    pushName: 'Tester',
    message: { conversation: '.ping' },
  });

  assert.equal(message.text, '.ping');
  assert.equal(message.sender, '123@s.whatsapp.net');
  assert.equal(message.isGroup, false);
});

test('reads text from extended messages and group participants', () => {
  const message = normalizeMessage({
    key: {
      remoteJid: 'group@g.us',
      participant: '123@s.whatsapp.net',
      id: 'XYZ',
    },
    message: { extendedTextMessage: { text: '.menu' } },
  });

  assert.equal(message.text, '.menu');
  assert.equal(message.sender, '123@s.whatsapp.net');
  assert.equal(message.isGroup, true);
});

test('ignores malformed messages', () => {
  assert.equal(normalizeMessage(null), null);
  assert.equal(normalizeMessage({ key: {}, message: {} }), null);
});

test('extracts captions from image and video messages', () => {
  for (const field of ['imageMessage', 'videoMessage', 'documentMessage']) {
    const message = normalizeMessage({
      key: { remoteJid: '123@s.whatsapp.net', id: field },
      message: { [field]: { caption: '.ping' } },
    });
    assert.equal(message.text, '.ping');
  }
});

test('unwraps ephemeral and view-once messages', () => {
  const message = normalizeMessage({
    key: { remoteJid: '123@s.whatsapp.net', id: 'EPH' },
    message: {
      ephemeralMessage: {
        message: {
          viewOnceMessage: { message: { conversation: '.menu' } },
        },
      },
    },
  });

  assert.equal(message.text, '.menu');
});

test('extracts text from interactive reply message variants', () => {
  const cases = [
    [{ buttonsResponseMessage: { selectedButtonId: '.ping' } }, '.ping'],
    [{ listResponseMessage: { title: 'Title', singleSelectReply: { selectedRowId: '.menu' } } }, '.menu'],
    [{ templateButtonReplyMessage: { selectedId: '.info' } }, '.info'],
    [{ interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: '{"id":".help"}' } } }, '.help'],
  ];

  for (const [message, expected] of cases) {
    assert.equal(normalizeMessage({
      key: { remoteJid: '123@s.whatsapp.net', id: 'BTN' },
      message,
    }).text, expected);
  }
});
