import { json, handleError, onRequestOptions } from '../lib/response.js';
import { requireAuth, requireAdmin } from '../lib/auth.js';
import { assertCanView, getStatistics, recalculateStatistics } from '../lib/database.js';

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

export async function onRequestPost(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);

    return json({ statistics: await recalculateStatistics({ operatorId: ctx.user.id }) });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
