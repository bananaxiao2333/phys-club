import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { requireAuth } from '../../lib/auth.js';
import { assertCanView, listUsers } from '../../lib/database.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    // Allow admin OR clubAdmin members to list users
    if (ctx.user?.role !== 'admin') await assertCanView(ctx.user, 'clubAdmin');
    return json({ users: await listUsers() });
  } catch (error) { return handleError(error); }
}

export async function onRequestPatch(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    if (ctx.user?.role !== 'admin') await assertCanView(ctx.user, 'clubAdmin');
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
    if (body.action === 'batchCreate') {
      const { createUser } = await import('../../lib/database.js');
      const user = await createUser({ username: body.username, password: body.password, displayName: body.displayName || body.username, role: body.role || 'member', groupId: body.groupId || null });
      return json({ user }, 201);
    }
    if (body.action === 'hardDelete') {
      const { hardDeleteUser } = await import('../../lib/database.js');
      return json(await hardDeleteUser(body.userId));
    }
    return json({ message: '未知操作。' }, 400);
  } catch (error) { return handleError(error); }
}

export { onRequestOptions };
