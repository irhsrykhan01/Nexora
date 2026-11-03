import { config } from '../config.js';

const CATEGORY_LABELS = {
  general: 'UMUM',
  tools: 'TOOLS',
  fun: 'HIBURAN',
  games: 'PERMAINAN',
  group: 'GRUP',
};

export default {
  name: 'menu',
  aliases: ['help', 'allmenu'],
  category: 'general',
  description: 'Tampilkan daftar command yang tersedia.',
  usage: 'menu',
  async execute({ sock, chat, registry }) {
    const groups = new Map();
    for (const command of registry.list()) {
      const category = command.category;
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(command);
    }

    const lines = ['✨ *' + config.botName.toUpperCase() + '*', ''];
    for (const [category, commands] of groups) {
      lines.push('*' + (CATEGORY_LABELS[category] ?? category.toUpperCase()) + '*');
      for (const command of commands) {
        lines.push('• ' + config.prefix + command.name + ' — ' + command.description);
      }
      lines.push('');
    }

    lines.push('Gunakan ' + config.prefix + 'nama-command untuk menjalankan fitur.');
    lines.push('Contoh: ' + config.prefix + 'calc 12 * (3 + 2)');
    await sock.sendMessage(chat, { text: lines.join('\n') });
  },
};
