import { CommandRegistry } from '../core/command-registry.js';
import { createGeneralCommands } from './general.js';
import { createGameCommands } from './games.js';
import { createGroupCommands } from './groups.js';
import ping from './ping.js';
import menu from './menu.js';
import info from './info.js';

export function createCommandRegistry({ store = null, gameManager = null } = {}) {
  const registry = new CommandRegistry();
  const commands = [
    ping,
    menu,
    info,
    ...createGeneralCommands(),
    ...createGameCommands({ gameManager }),
    ...createGroupCommands({ store }),
  ];

  for (const command of commands) registry.register(command);
  return registry;
}
