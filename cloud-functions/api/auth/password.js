import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { requireAuth } from '../../lib/auth.js';
import { changePassword } from '../../lib/database.js';

export async function onRequestPost(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);

    const body = await context.request.json();
    const user = await changePassword(ctx.user.id, body.currentPassword, body.nextPassword);
    return json({ user });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
