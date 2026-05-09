// Thin wrapper around the global kv_data binding (EdgeOne Pages KV).
//
// All values are stored as JSON strings. getJSON / setJSON handle
// serialization manually rather than relying on { type: "json" }, because
// EdgeOne's local dev server has a buggy implementation of that option.
//
// With the collection-based data model (one KV key per data type), there
// are no kv.list() calls and only a handful of kv.get()/kv.put() per request,
// so plain string-based get/put works reliably.

const kvStore = kv_data;

export const kv = {
  async get(key) {
    return kvStore.get(String(key));
  },
  async put(key, value) {
    return kvStore.put(String(key), value);
  },
  async delete(key) {
    return kvStore.delete(String(key));
  },
  async list(options) {
    return kvStore.list(options);
  },
};

export async function getJSON(kvBinding, key, fallback = null) {
  console.log("[kv] getJSON:", key);
  const raw = await kvBinding.get(key);
  console.log("[kv] getJSON raw type:", typeof raw, "raw:", raw);
  if (raw === null || raw === undefined) {
    console.log("[kv] getJSON miss, using fallback:", fallback);
    return fallback;
  }
  if (typeof raw === "string") {
    const parsed = JSON.parse(raw);
    console.log(
      "[kv] getJSON parsed:",
      key,
      "keys:",
      Object.keys(parsed).length,
    );
    return parsed;
  }
  console.log("[kv] getJSON already object:", key);
  return raw;
}

export async function setJSON(kvBinding, key, value) {
  const json = JSON.stringify(value);
  console.log("[kv] setJSON:", key, "size:", json.length);
  await kvBinding.put(key, json);
  console.log("[kv] setJSON done:", key);
}
