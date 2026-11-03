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
  description: 'Tampilkan daftar command atau bantuan satu command.',
  usage: 'menu [nama-command]',
  async execute({ sock, chat, registry, argumentText }) {
    const requestedName = (argumentText || '').trim().split(/\s+/)[0];
    if (requestedName) {
      const command = registry.get(requestedName);
      if (!command) {
        await sock.sendMessage(chat, {
          text: 'Command tidak ditemukan. Gunakan ' + config.prefix + 'menu untuk melihat daftar.',
        });
        return;
      }

      const lines = [
        '📖 *BANTUAN COMMAND*',
        '',
        '*Nama:* ' + config.prefix + command.name,
        '*Deskripsi:* ' + command.description,
        '*Cara pakai:* ' + config.prefix + command.usage,
      ];
      if (command.aliases.length) lines.push('*Alias:* ' + command.aliases.map((alias) => config.prefix + alias).join(', '));
      if (command.groupOnly) lines.push('*Akses:* Grup saja' + (command.adminOnly ? ', admin grup' : ''));
      await sock.sendMessage(chat, { text: lines.join('\n') });
      return;
    }

    const groups = new Map();
    for (const command of registry.list()) {
      if (!groups.has(command.category)) groups.set(command.category, []);
      groups.get(command.category).push(command);
    }

    const lines = ['✨ *' + config.botName.toUpperCase() + '*', ''];
    for (const [category, commands] of groups) {
      lines.push('*' + (CATEGORY_LABELS[category] ?? category.toUpperCase()) + '*');
      for (const command of commands) {
        lines.push('• ' + config.prefix + command.name + ' — ' + command.description);
      }
      lines.push('');
    }

    lines.push('Gunakan ' + config.prefix + 'menu nama-command untuk melihat cara pakai.');
    lines.push('Contoh: ' + config.prefix + 'calc 12 * (3 + 2)');
    await sock.sendMessage(chat, { text: lines.join('\n') });
  },
};
