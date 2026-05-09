import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { requireAuth } from '../../lib/auth.js';
import { changeProfile } from '../../lib/database.js';

export async function onRequestPatch(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);

    const body = await context.request.json();
    const user = await changeProfile(ctx.user.id, body);
    return json({ user });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
