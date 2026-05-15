import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { assertCanView } from '../../lib/database.js';
import { requireAuth } from '../../lib/auth.js';
import { settleProject } from '../../lib/database.js';

export async function onRequestPost(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    await assertCanView(ctx.user, 'clubAdmin');
    const body = await context.request.json();
    const entries = await settleProject({ revenue: body.revenue, cost: body.cost, reason: body.reason, detail: body.detail, operatorId: ctx.user.id });
    return json({ entries }, 201);
  } catch (error) { return handleError(error); }
}
export { onRequestOptions };
