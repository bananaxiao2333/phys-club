import { json, handleError, onRequestOptions } from '../lib/response.js';
import { withOptionalAuth, requireAuth, requireAdmin } from '../lib/auth.js';
import { canView, getSettings, getStatistics, recalculateStatistics } from '../lib/database.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await withOptionalAuth(context.request, ctx);

    const stats = await getStatistics();
    if (!stats) return json({ statistics: null });

    // Check visibility: show stats to anyone with permission, including public
    const settings = await getSettings();
    if (!canView(ctx.user, 'statistics', settings)) {
      return json({ message: '无权查看统计台。' }, 403);
    }

    return json({ statistics: stats });
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
