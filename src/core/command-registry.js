export class CommandRegistry {
  #commands = new Map();

  register(command) {
    if (!command || typeof command !== 'object') {
      throw new TypeError('Command must be an object.');
    }

    const name = String(command.name ?? '').trim().toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(name)) {
      throw new TypeError('Command name must contain only letters, numbers, _ or -.');
    }

    if (typeof command.execute !== 'function') {
      throw new TypeError(`Command "${name}" must provide an execute function.`);
    }

    const aliases = (command.aliases ?? []).map((alias) =>
      String(alias).trim().toLowerCase()
    );
    const names = [name, ...aliases];

    for (const item of names) {
      if (!/^[a-z0-9_-]+$/.test(item)) {
        throw new TypeError(`Invalid alias "${item}" for command "${name}".`);
      }
      if (this.#commands.has(item)) {
        throw new Error(`Command or alias "${item}" is already registered.`);
      }
    }

    const normalized = Object.freeze({
      name,
      aliases: Object.freeze(aliases),
      description: command.description ?? 'No description provided.',
      usage: command.usage ?? name,
      execute: command.execute,
    });

    for (const item of names) this.#commands.set(item, normalized);
    return normalized;
  }

  get(name) {
    return this.#commands.get(String(name).toLowerCase()) ?? null;
  }

  list() {
    return [...new Set(this.#commands.values())].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  get size() {
    return new Set(this.#commands.values()).size;
  }
}
