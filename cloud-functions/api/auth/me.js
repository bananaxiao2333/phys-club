import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { requireAuth } from '../../lib/auth.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    const { passwordHash, ...user } = ctx.user;
    return json({ user });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
