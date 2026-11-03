import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_DATA = { version: 1, groups: {} };

export class JsonStore {
  #filePath;
  #data = structuredClone(DEFAULT_DATA);
  #loaded = false;
  #writeQueue = Promise.resolve();

  constructor(filePath) {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new TypeError('A data file path is required.');
    }
    this.#filePath = path.resolve(filePath);
  }

  async load() {
    if (this.#loaded) return this;

    await mkdir(path.dirname(this.#filePath), { recursive: true });

    try {
      const source = await readFile(this.#filePath, 'utf8');
      const parsed = JSON.parse(source);

      if (
        !parsed ||
        parsed.version !== 1 ||
        !parsed.groups ||
        typeof parsed.groups !== 'object' ||
        Array.isArray(parsed.groups)
      ) {
        throw new Error('Unsupported or invalid Nexora data file format.');
      }

      this.#data = { version: 1, groups: parsed.groups };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error('Unable to read Nexora data file safely: ' + error.message);
      }
    }

    this.#loaded = true;
    return this;
  }

  #assertLoaded() {
    if (!this.#loaded) throw new Error('JsonStore.load() must be called first.');
  }

  getGroupSettings(groupJid) {
    this.#assertLoaded();
    if (typeof groupJid !== 'string' || !groupJid.endsWith('@g.us')) {
      throw new TypeError('A valid group JID is required.');
    }

    const saved = this.#data.groups[groupJid] ?? {};
    return Object.freeze({
      welcome: saved.welcome === true,
      goodbye: saved.goodbye === true,
    });
  }

  async setGroupSettings(groupJid, patch) {
    this.#assertLoaded();
    if (typeof groupJid !== 'string' || !groupJid.endsWith('@g.us')) {
      throw new TypeError('A valid group JID is required.');
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new TypeError('Settings patch must be an object.');
    }

    const allowedKeys = ['welcome', 'goodbye'];
    for (const [key, value] of Object.entries(patch)) {
      if (!allowedKeys.includes(key) || typeof value !== 'boolean') {
        throw new TypeError('Invalid group setting: ' + key);
      }
    }

    this.#data.groups[groupJid] = {
      ...this.#data.groups[groupJid],
      ...patch,
    };
    await this.#persist();
    return this.getGroupSettings(groupJid);
  }

  async #persist() {
    const snapshot = JSON.stringify(this.#data, null, 2);
    const operation = this.#writeQueue.then(async () => {
      await mkdir(path.dirname(this.#filePath), { recursive: true });
      const temporaryPath = this.#filePath + '.' + process.pid + '.tmp';
      await writeFile(temporaryPath, snapshot, { encoding: 'utf8', mode: 0o600 });
      await rename(temporaryPath, this.#filePath);
    });

    this.#writeQueue = operation.catch(() => {});
    await operation;
  }
}
