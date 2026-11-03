import { createCommandRegistry } from './commands/index.js';
import { WhatsAppConnection } from './core/connection.js';
import { createMessageHandler } from './core/message-handler.js';
import { logger, ui } from './core/logger.js';

ui.start();

const registry = createCommandRegistry();
const handleMessage = createMessageHandler({ registry, logger, ui });

const connection = new WhatsAppConnection({
  logger,
  ui,
  onMessages: handleMessage,
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Shutting down Nexora');
  await connection.stop();
  ui.stop();
  process.exitCode = 0;
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

logger.info(
  { commands: registry.size, node: process.version },
  'Starting Nexora'
);

await connection.start();
