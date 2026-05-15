import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { requireAuth, requireAdmin } from '../../lib/auth.js';
import { createInvite, listInvites, toggleInviteActive } from '../../lib/database.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);

    return json({ invites: await listInvites() });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestPost(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);

    const body = await context.request.json();
    const invite = await createInvite({
      groupId: body.groupId,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt,
      createdBy: ctx.user.id
    });
    return json({ invite }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestPatch(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);

    const body = await context.request.json();
    const invite = await toggleInviteActive(body.code, body.active);
    return json({ invite });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
