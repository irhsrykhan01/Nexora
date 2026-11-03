import { createCommandRegistry } from './commands/index.js';
import { WhatsAppConnection } from './core/connection.js';
import { createMessageHandler } from './core/message-handler.js';
import { logger } from './core/logger.js';

const registry = createCommandRegistry();
const handleMessage = createMessageHandler({ registry, logger });

const connection = new WhatsAppConnection({
  logger,
  onMessages: handleMessage,
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Shutting down Nexora');
  await connection.stop();
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
