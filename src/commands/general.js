import { randomInt } from 'node:crypto';
import { calculateExpression } from '../core/calculator.js';

function formatUptime(seconds) {
  const value = Math.floor(seconds);
  const days = Math.floor(value / 86_400);
  const hours = Math.floor((value % 86_400) / 3_600);
  const minutes = Math.floor((value % 3_600) / 60);
  const remainder = value % 60;
  return [
    days ? days + ' hari' : null,
    hours ? hours + ' jam' : null,
    minutes ? minutes + ' menit' : null,
    remainder + ' detik',
  ].filter(Boolean).join(' ');
}

function formatMegabytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export function createGeneralCommands() {
  return [
    {
      name: 'uptime',
      category: 'general',
      description: 'Lihat lama Nexora berjalan.',
      usage: 'uptime',
      async execute({ sock, chat }) {
        await sock.sendMessage(chat, {
          text: '⏱️ Nexora aktif selama ' + formatUptime(process.uptime()) + '.',
        });
      },
    },
    {
      name: 'memory',
      aliases: ['mem'],
      category: 'tools',
      description: 'Lihat penggunaan memori proses Nexora.',
      usage: 'memory',
      async execute({ sock, chat }) {
        const memory = process.memoryUsage();
        await sock.sendMessage(chat, {
          text: [
            '💾 *PENGGUNAAN MEMORI*',
            'RSS: ' + formatMegabytes(memory.rss),
            'Heap terpakai: ' + formatMegabytes(memory.heapUsed),
            'Total heap: ' + formatMegabytes(memory.heapTotal),
            'External: ' + formatMegabytes(memory.external),
          ].join('\n'),
        });
      },
    },
    {
      name: 'calc',
      aliases: ['hitung', 'calculator'],
      category: 'tools',
      description: 'Hitung ekspresi matematika sederhana.',
      usage: 'calc 12 * (8 + 2)',
      async execute({ sock, chat, argumentText }) {
        if (!argumentText) {
          await sock.sendMessage(chat, { text: 'Contoh: .calc 12 * (8 + 2)' });
          return;
        }
        try {
          const result = calculateExpression(argumentText);
          await sock.sendMessage(chat, { text: '🧮 Hasil: ' + result });
        } catch (error) {
          await sock.sendMessage(chat, { text: 'Perhitungan gagal: ' + error.message });
        }
      },
    },
    {
      name: 'roll',
      aliases: ['dice', 'dadu'],
      category: 'fun',
      description: 'Lempar dadu dengan format NdS.',
      usage: 'roll 2d6',
      async execute({ sock, chat, argumentText }) {
        const match = /^(\d{1,2})d(\d{1,4})$/i.exec(argumentText || '1d6');
        if (!match) {
          await sock.sendMessage(chat, { text: 'Format: .roll 2d6 (maksimal 20 dadu, 1.000 sisi).' });
          return;
        }
        const count = Number(match[1]);
        const sides = Number(match[2]);
        if (count < 1 || count > 20 || sides < 2 || sides > 1000) {
          await sock.sendMessage(chat, { text: 'Batas: 1–20 dadu dan 2–1.000 sisi.' });
          return;
        }
        const rolls = Array.from({ length: count }, () => randomInt(1, sides + 1));
        await sock.sendMessage(chat, {
          text: '🎲 Hasil: ' + rolls.join(', ') + '\nTotal: ' + rolls.reduce((sum, value) => sum + value, 0),
        });
      },
    },
    {
      name: 'coinflip',
      aliases: ['flip', 'koin'],
      category: 'fun',
      description: 'Lempar koin virtual.',
      usage: 'coinflip',
      async execute({ sock, chat }) {
        await sock.sendMessage(chat, {
          text: randomInt(0, 2) === 0 ? '🪙 Hasil: Angka.' : '🪙 Hasil: Gambar.',
        });
      },
    },
    {
      name: 'choose',
      aliases: ['pilih'],
      category: 'fun',
      description: 'Pilih satu dari beberapa opsi.',
      usage: 'choose opsi A | opsi B | opsi C',
      async execute({ sock, chat, argumentText }) {
        const options = (argumentText || '').split('|').map((item) => item.trim()).filter(Boolean);
        if (options.length < 2 || options.length > 10) {
          await sock.sendMessage(chat, {
            text: 'Masukkan 2–10 pilihan dan pisahkan dengan tanda |.',
          });
          return;
        }
        await sock.sendMessage(chat, {
          text: '🎯 Pilihanku: *' + options[randomInt(0, options.length)] + '*',
        });
      },
    },
    {
      name: '8ball',
      aliases: ['magicball'],
      category: 'fun',
      description: 'Jawaban acak untuk pertanyaan santai.',
      usage: '8ball apakah hari ini menyenangkan?',
      async execute({ sock, chat, argumentText }) {
        if (!argumentText) {
          await sock.sendMessage(chat, { text: 'Tulis pertanyaan setelah .8ball.' });
          return;
        }
        const answers = [
          'Sepertinya iya.', 'Kemungkinannya besar.', 'Belum bisa dipastikan.',
          'Coba tanyakan lagi nanti.', 'Sepertinya belum.', 'Fokus pada hal yang bisa kamu kendalikan.',
        ];
        await sock.sendMessage(chat, {
          text: '🎱 ' + answers[randomInt(0, answers.length)],
        });
      },
    },
  ];
}
