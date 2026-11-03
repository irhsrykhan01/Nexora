import { normalizeMessage, parseCommand } from './message.js';
import { config } from '../config.js';

export function createMessageHandler({ registry, logger }) {
  return async function handleMessage(upsert) {
    if (upsert?.type !== 'notify' || !Array.isArray(upsert.messages)) return;

    for (const rawMessage of upsert.messages) {
      const message = normalizeMessage(rawMessage);

      if (!message || message.isFromMe || !message.text) continue;

      const parsed = parseCommand(message.text, config.prefix);
      if (!parsed) continue;

      const command = registry.get(parsed.name);
      if (!command) continue;

      try {
        await command.execute({
          sock: this,
          chat: message.remoteJid,
          sender: message.sender,
          message,
          args: parsed.args,
          argumentText: parsed.argumentText,
          registry,
        });
      } catch (error) {
        logger.error(
          { err: error, command: command.name, chat: message.remoteJid },
          'Command execution failed'
        );

        try {
          await this.sendMessage(message.remoteJid, {
            text: 'Maaf, perintah gagal dijalankan. Silakan coba lagi.',
          });
        } catch (sendError) {
          logger.error({ err: sendError }, 'Failed to send command error reply');
        }
      }
    }
  };
}
