import fs from 'node:fs/promises';
import path from 'node:path';

const KEY_PATTERN = /^[A-Za-z0-9_]{1,512}$/;

function assertValidKey(key) {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`Invalid KV key "${key}". Use only letters, numbers, and underscores.`);
  }
}

function normalizeGetOptions(options) {
  if (typeof options === 'string') {
    return { type: options };
  }
  return options || { type: 'text' };
}

function valueToText(value) {
  if (typeof value === 'string') return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value).toString('utf8');
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('utf8');
  }
  return String(value);
}

export class FileKVStore {
  constructor(rootDir = process.env.LOCAL_KV_DIR || './data/kv') {
    this.rootDir = path.resolve(process.cwd(), rootDir);
  }

  keyPath(key) {
    assertValidKey(key);
    return path.join(this.rootDir, key);
  }

  async put(key, value) {
    const filePath = this.keyPath(key);
    await fs.mkdir(this.rootDir, { recursive: true });
    await fs.writeFile(filePath, valueToText(value), 'utf8');
  }

  async get(key, options) {
    const filePath = this.keyPath(key);
    const normalized = normalizeGetOptions(options);

    try {
      const text = await fs.readFile(filePath, 'utf8');
      if (normalized.type === 'json') return JSON.parse(text);
      if (normalized.type === 'arrayBuffer') return Buffer.from(text, 'utf8').buffer;
      return text;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key) {
    const filePath = this.keyPath(key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  async list(options = {}) {
    const { prefix = '', limit = 256, cursor } = options;
    if (prefix) assertValidKey(prefix);

    await fs.mkdir(this.rootDir, { recursive: true });
    const files = (await fs.readdir(this.rootDir))
      .filter((file) => KEY_PATTERN.test(file))
      .filter((file) => file.startsWith(prefix))
      .sort();

    const startIndex = cursor ? Math.max(files.findIndex((file) => file === cursor) + 1, 0) : 0;
    const selected = files.slice(startIndex, startIndex + Math.min(limit, 256));
    const next = files[startIndex + selected.length] || null;

    return {
      complete: next === null,
      cursor: next,
      keys: selected.map((key) => ({ key }))
    };
  }
}

export class EdgeOneKVStore {
  constructor(namespace) {
    this.namespace = namespace;
  }

  async put(key, value) {
    assertValidKey(key);
    await this.namespace.put(key, value);
  }

  async get(key, options) {
    assertValidKey(key);
    return this.namespace.get(key, normalizeGetOptions(options));
  }

  async delete(key) {
    assertValidKey(key);
    await this.namespace.delete(key);
  }

  async list(options = {}) {
    if (options.prefix) assertValidKey(options.prefix);
    return this.namespace.list(options);
  }
}

export function createKVStore(env = globalThis) {
  const bindingName = process.env.EDGEONE_KV_BINDING || 'POINTS_KV';
  const namespace = env?.[bindingName] || globalThis?.[bindingName];
  const driver = process.env.KV_DRIVER || (namespace ? 'edgeone' : 'file');

  if (driver === 'edgeone') {
    if (!namespace) {
      throw new Error(`KV_DRIVER=edgeone but EdgeOne KV binding "${bindingName}" was not found.`);
    }
    return new EdgeOneKVStore(namespace);
  }

  return new FileKVStore();
}

export async function getJSON(kv, key, fallback = null) {
  const value = await kv.get(key, { type: 'json' });
  return value ?? fallback;
}

export async function setJSON(kv, key, value) {
  await kv.put(key, JSON.stringify(value));
}
