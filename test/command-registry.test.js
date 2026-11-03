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

test('returns unique commands in sorted order', () => {
  const registry = new CommandRegistry();
  registry.register({ name: 'zeta', execute: async () => {} });
  registry.register({ name: 'alpha', execute: async () => {} });

  assert.deepEqual(registry.list().map((command) => command.name), ['alpha', 'zeta']);
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
