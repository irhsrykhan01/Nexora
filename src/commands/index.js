import { CommandRegistry } from '../core/command-registry.js';
import ping from './ping.js';
import menu from './menu.js';
import info from './info.js';

export function createCommandRegistry() {
  const registry = new CommandRegistry();

  for (const command of [ping, menu, info]) {
    registry.register(command);
  }

  return registry;
}
