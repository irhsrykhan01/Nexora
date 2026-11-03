import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandRegistry } from '../src/core/command-registry.js';

test('registers commands and resolves aliases', () => {
  const registry = new CommandRegistry();
  const command = { name: 'ping', aliases: ['p'], execute: async () => {} };

  registry.register(command);

  assert.equal(registry.get('ping').name, 'ping');
  assert.equal(registry.get('p').name, 'ping');
  assert.equal(registry.size, 1);
});

test('rejects duplicate command names and aliases', () => {
  const registry = new CommandRegistry();
  registry.register({ name: 'ping', aliases: ['p'], execute: async () => {} });

  assert.throws(
    () => registry.register({ name: 'pong', aliases: ['p'], execute: async () => {} }),
    /already registered/
  );
});

test('rejects commands without an executable handler', () => {
  const registry = new CommandRegistry();
  assert.throws(() => registry.register({ name: 'broken' }), /execute function/);
});

test('returns unique commands sorted by category and name', () => {
  const registry = new CommandRegistry();
  registry.register({ name: 'zeta', category: 'tools', execute: async () => {} });
  registry.register({ name: 'alpha', category: 'general', execute: async () => {} });
  registry.register({ name: 'beta', category: 'general', execute: async () => {} });

  assert.deepEqual(
    registry.list().map((command) => command.name),
    ['alpha', 'beta', 'zeta']
  );
});

test('rejects duplicate aliases inside one command', () => {
  const registry = new CommandRegistry();
  assert.throws(
    () => registry.register({
      name: 'ping',
      aliases: ['p', 'p'],
      execute: async () => {},
    }),
    /duplicate/i
  );
});

test('rejects aliases with spaces and non-array aliases', () => {
  const registry = new CommandRegistry();
  assert.throws(
    () => registry.register({ name: 'ping', aliases: ['not valid'], execute: async () => {} }),
    /Invalid alias/
  );
  assert.throws(
    () => registry.register({ name: 'ping', aliases: 'p', execute: async () => {} }),
    /array/
  );
});

test('requires admin-only commands to be group-only', () => {
  const registry = new CommandRegistry();
  assert.throws(
    () => registry.register({ name: 'admin', adminOnly: true, execute: async () => {} }),
    /group-only/
  );
});

test('registers the complete initial built-in command set', async () => {
  const { createCommandRegistry } = await import('../src/commands/index.js');
  const registry = createCommandRegistry();
  const names = registry.list().map((command) => command.name);

  assert.equal(registry.size, 21);
  for (const name of [
    'info', 'menu', 'ping', 'uptime', 'calc', 'roll', 'coinflip',
    'choose', '8ball', 'speed', 'trivia', 'tebakangka', 'susunkata',
    'stopgame', 'groupinfo', 'admins', 'grouplink', 'groupname',
    'groupdesc', 'setwelcome', 'setgoodbye',
  ]) {
    assert.ok(names.includes(name), 'missing command: ' + name);
  }

  assert.equal(registry.get('help').name, 'menu');
  assert.equal(registry.get('allmenu').name, 'menu');
  assert.equal(registry.get('calculator').name, 'calc');
  assert.equal(registry.get('endgame').name, 'stopgame');
  assert.equal(registry.get('setwelcome').adminOnly, true);
});
