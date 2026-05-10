import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { requireAuth, requireAdmin } from '../../lib/auth.js';
import { listUsers } from '../../lib/database.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);
    return json({ users: await listUsers() });
  } catch (error) { return handleError(error); }
}

export async function onRequestPatch(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);
    const body = await context.request.json();

    if (body.action === 'batchGroup') {
      const { listUsers, batchUpdateGroup } = await import('../../lib/database.js');
      const result = await batchUpdateGroup({ userIds: body.userIds, groupId: body.groupId, operatorId: ctx.user.id });
      return json({ users: result });
    }
    if (body.action === 'forcePassword') {
      const { forcePassword } = await import('../../lib/database.js');
      const user = await forcePassword({ userId: body.userId, newPassword: body.newPassword });
      return json({ user });
    }
    return json({ message: '未知操作。' }, 400);
  } catch (error) { return handleError(error); }
}

export { onRequestOptions };
