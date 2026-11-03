import test from 'node:test';
import assert from 'node:assert/strict';
import { GameManager } from '../src/core/game-manager.js';

function createSocket() {
  const sent = [];
  return {
    sent,
    async sendMessage(chat, payload) {
      sent.push({ chat, ...payload });
    },
  };
}

test('starts trivia and accepts a correct answer', async () => {
  const manager = new GameManager({ random: () => 0, timeoutMs: 60_000 });
  const sock = createSocket();

  await manager.startTrivia('chat@g.us', sock);
  assert.match(sock.sent[0].text, /TRIVIA/);

  const handled = await manager.handleMessage('chat@g.us', 'Mars', sock);
  assert.equal(handled, true);
  assert.match(sock.sent.at(-1).text, /Benar/);

  manager.close();
});

test('number game gives hints and ends on the correct answer', async () => {
  const manager = new GameManager({ random: () => 0, timeoutMs: 60_000 });
  const sock = createSocket();

  await manager.startNumber('chat@g.us', sock);
  await manager.handleMessage('chat@g.us', '2', sock);
  assert.match(sock.sent.at(-1).text, /Terlalu besar/);

  await manager.handleMessage('chat@g.us', '1', sock);
  assert.match(sock.sent.at(-1).text, /Benar/);
  manager.close();
});

test('prevents overlapping games and allows explicit stop', async () => {
  const manager = new GameManager({ random: () => 0, timeoutMs: 60_000 });
  const sock = createSocket();

  await manager.startTrivia('chat@g.us', sock);
  const started = await manager.startNumber('chat@g.us', sock);
  assert.equal(started, false);
  assert.match(sock.sent.at(-1).text, /permainan aktif/i);

  await manager.stop('chat@g.us', sock);
  assert.match(sock.sent.at(-1).text, /dihentikan/i);
  manager.close();
});

test('ends a game after the maximum number of wrong answers', async () => {
  const manager = new GameManager({ random: () => 0, timeoutMs: 60_000 });
  const sock = createSocket();

  await manager.startTrivia('chat@g.us', sock);
  await manager.handleMessage('chat@g.us', 'bukan', sock);
  await manager.handleMessage('chat@g.us', 'tetap salah', sock);
  await manager.handleMessage('chat@g.us', 'masih salah', sock);

  assert.match(sock.sent.at(-1).text, /Kesempatan habis/);
  manager.close();
});

test('word scramble accepts the original word', async () => {
  const manager = new GameManager({ random: () => 0, timeoutMs: 60_000 });
  const sock = createSocket();

  await manager.startScramble('chat@g.us', sock);
  assert.match(sock.sent[0].text, /SUSUN KATA/);
  await manager.handleMessage('chat@g.us', 'komputer', sock);
  assert.match(sock.sent.at(-1).text, /Benar/);
  manager.close();
});

test('ignores messages when no game is active', async () => {
  const manager = new GameManager();
  const sock = createSocket();

  assert.equal(await manager.handleMessage('chat@g.us', 'hello', sock), false);
  manager.close();
});
