import { createCommandRegistry } from './commands/index.js';
import { WhatsAppConnection } from './core/connection.js';
import { createMessageHandler } from './core/message-handler.js';
import { createGroupEventHandler } from './core/group-events.js';
import { JsonStore } from './core/json-store.js';
import { GameManager } from './core/game-manager.js';
import { config } from './config.js';
import { logger, ui } from './core/logger.js';

let connection;
let gameManager;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Shutting down Nexora');
  gameManager?.close();
  await connection?.stop();
  ui.stop();
  process.exitCode = 0;
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

ui.start();

try {
  const store = await new JsonStore(config.dataFile).load();
  gameManager = new GameManager();

  const registry = createCommandRegistry({ store, gameManager });
  const handleMessage = createMessageHandler({
    registry,
    logger,
    ui,
    gameManager,
    cooldownMs: config.commandCooldownMs,
  });
  const handleGroupParticipants = createGroupEventHandler({ store, logger });

  connection = new WhatsAppConnection({
    logger,
    ui,
    onMessages: handleMessage,
    onParticipantsUpdate: handleGroupParticipants,
  });

  logger.info(
    { commands: registry.size, node: process.version },
    'Starting Nexora'
  );

  await connection.start();
} catch (error) {
  logger.fatal({ err: error }, 'Nexora failed to start');
  gameManager?.close();
  ui.stop();
  process.exitCode = 1;
}
