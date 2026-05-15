import { json, handleError, onRequestOptions } from '../lib/response.js';

export async function onRequestGet() {
  return json({ ok: true });
}

export { onRequestOptions };
