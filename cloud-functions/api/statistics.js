import { json, handleError, onRequestOptions } from '../lib/response.js';
import { requireAuth } from '../lib/auth.js';
import { assertCanView, getStatistics } from '../lib/database.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    await assertCanView(ctx.user, 'statistics');

    return json({ statistics: await getStatistics() });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
