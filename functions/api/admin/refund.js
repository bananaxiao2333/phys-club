import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { assertCanView } from '../../lib/database.js';
import { requireAuth } from '../../lib/auth.js';
import { refundAndDeactivate } from '../../lib/database.js';

export async function onRequestPost(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    await assertCanView(ctx.user, 'clubAdmin');
    const body = await context.request.json();
    const result = await refundAndDeactivate({ userId: body.userId, operatorId: ctx.user.id });
    return json(result);
  } catch (error) { return handleError(error); }
}
export { onRequestOptions };
