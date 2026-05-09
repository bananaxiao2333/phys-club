import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { requireAuth, requireAdmin } from '../../lib/auth.js';
import { refundAndDeactivate } from '../../lib/database.js';

export async function onRequestPost(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);
    const body = await context.request.json();
    const result = await refundAndDeactivate({ userId: body.userId, operatorId: ctx.user.id });
    return json(result);
  } catch (error) { return handleError(error); }
}
export { onRequestOptions };
