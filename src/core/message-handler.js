import { normalizeMessage, parseCommand } from './message.js';
import { requireGroupAdmin, PermissionError } from './group-permissions.js';
import { config } from '../config.js';

export function createMessageHandler({
  registry,
  logger,
  ui,
  gameManager,
  cooldownMs = config.commandCooldownMs,
  now = Date.now,
}) {
  const lastExecution = new Map();

  return async function handleMessage(upsert) {
    if (upsert?.type !== 'notify' || !Array.isArray(upsert.messages)) return;

    for (const rawMessage of upsert.messages) {
      const message = normalizeMessage(rawMessage);
      if (!message || message.isFromMe || !message.text) continue;

      ui?.incrementMessage();

      const parsed = parseCommand(message.text, config.prefix);
      if (!parsed) {
        if (gameManager) {
          try {
            await gameManager.handleMessage(message.remoteJid, message.text, this);
          } catch (error) {
            logger.error({ err: error }, 'Game message handling failed');
          }
        }
        continue;
      }

      const command = registry.get(parsed.name);
      if (!command) continue;

      if (command.groupOnly && !message.isGroup) {
        await this.sendMessage(message.remoteJid, {
          text: 'Perintah ini hanya bisa digunakan di grup.',
        });
        continue;
      }

      if (command.adminOnly) {
        try {
          await requireGroupAdmin(this, message.remoteJid, message.sender);
        } catch (error) {
          if (error instanceof PermissionError) {
            await this.sendMessage(message.remoteJid, { text: error.message });
          } else {
            logger.error({ err: error, command: command.name }, 'Group permission check failed');
            await this.sendMessage(message.remoteJid, {
              text: 'Gagal memeriksa izin admin grup. Coba lagi.',
            });
          }
          continue;
        }
      }

      const cooldownKey = message.sender + ':' + command.name;
      const currentTime = now();
      const lastTime = lastExecution.get(cooldownKey) ?? 0;

      if (cooldownMs > 0 && currentTime - lastTime < cooldownMs) {
        await this.sendMessage(message.remoteJid, {
          text: 'Tunggu sebentar sebelum menggunakan command itu lagi.',
        });
        continue;
      }

      lastExecution.set(cooldownKey, currentTime);
      if (lastExecution.size > 2_000) {
        for (const [key, timestamp] of lastExecution) {
          if (currentTime - timestamp > cooldownMs * 4) lastExecution.delete(key);
        }
      }

      ui?.incrementCommand();

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
        if (error instanceof PermissionError) {
          await this.sendMessage(message.remoteJid, { text: error.message });
          continue;
        }

        logger.error(
          { err: error, command: command.name },
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
