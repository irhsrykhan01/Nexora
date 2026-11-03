export default {
  name: 'ping',
  aliases: ['p'],
  description: 'Check whether Nexora is responding.',
  usage: 'ping',
  async execute({ sock, chat }) {
    await sock.sendMessage(chat, { text: 'Pong! Nexora is online.' });
  },
};
