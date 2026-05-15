import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { assertCanView } from '../../lib/database.js';
import { requireAuth } from '../../lib/auth.js';
import { allocateDues } from '../../lib/database.js';

export async function onRequestPost(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    await assertCanView(ctx.user, 'clubAdmin');
    const body = await context.request.json();
    const entries = await allocateDues({ userId: body.userId, amount: body.amount, operatorId: ctx.user.id });
    return json({ entries }, 201);
  } catch (error) { return handleError(error); }
}
export { onRequestOptions };
