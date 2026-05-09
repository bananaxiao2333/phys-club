import { json, handleError, onRequestOptions } from '../lib/response.js';
import { GROUPS } from '../lib/database.js';

export async function onRequestGet() {
  try {
    return json({ groups: GROUPS });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
