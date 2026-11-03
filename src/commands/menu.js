import { config } from '../config.js';

export default {
  name: 'menu',
  aliases: ['help', 'allmenu'],
  description: 'Show the available commands.',
  usage: 'menu',
  async execute({ sock, chat, registry }) {
    const commands = registry.list();
    const lines = commands.map((command) =>
      `• ${config.prefix}${command.name} — ${command.description}`
    );

    const text = [
      `* ${config.botName} *`,
      '',
      'Available commands:',
      ...lines,
      '',
      'Use a command with the configured prefix.',
    ].join('\n');

    await sock.sendMessage(chat, { text });
  },
};
