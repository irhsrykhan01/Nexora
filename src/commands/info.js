import { config } from '../config.js';

export default {
  name: 'info',
  description: 'Show basic information about this bot.',
  usage: 'info',
  async execute({ sock, chat, registry }) {
    const text = [
      `* ${config.botName} *`,
      'An independent WhatsApp automation project.',
      '',
      `Commands: ${registry.size}`,
      `Prefix: ${config.prefix}`,
      `Node.js: ${process.version}`,
      '',
      'Nexora is not affiliated with WhatsApp.',
    ].join('\n');

    await sock.sendMessage(chat, { text });
  },
};
