import { json, handleError, onRequestOptions } from '../lib/response.js';
import { withOptionalAuth } from '../lib/auth.js';
import { assertCanView, getLeaderboard } from '../lib/database.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await withOptionalAuth(context.request, ctx);
    await assertCanView(ctx.user, 'overview');

    return json(await getLeaderboard());
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
