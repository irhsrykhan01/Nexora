import { performance } from 'node:perf_hooks';

export default {
  name: 'ping',
  aliases: ['p'],
  category: 'general',
  description: 'Periksa apakah Nexora merespons.',
  usage: 'ping',
  async execute({ sock, chat }) {
    const started = performance.now();
    await sock.sendMessage(chat, {
      text: '🏓 Pong! Nexora aktif.\nWaktu proses: ' +
        Math.round(performance.now() - started) + ' ms.',
    });
  },
};
