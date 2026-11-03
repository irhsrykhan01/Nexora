import { config } from '../config.js';

export default {
  name: 'info',
  category: 'general',
  description: 'Tampilkan informasi dasar Nexora.',
  usage: 'info',
  async execute({ sock, chat, registry }) {
    const text = [
      '*' + config.botName + '*',
      'Bot WhatsApp modular yang dikembangkan secara independen.',
      '',
      'Versi: 0.1.0',
      'Command: ' + registry.size,
      'Prefix: ' + config.prefix,
      'Node.js: ' + process.version,
      'Platform: ' + process.platform,
      '',
      'Nexora tidak berafiliasi dengan WhatsApp atau Meta.',
    ].join('\n');

    await sock.sendMessage(chat, { text });
  },
};
