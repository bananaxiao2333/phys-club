import { json, handleError, onRequestOptions } from '../../../lib/response.js';
import { requireAuth, requireAdmin } from '../../../lib/auth.js';
import { updateUser } from '../../../lib/database.js';

export async function onRequestPatch(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);

    const body = await context.request.json();
    const user = await updateUser(context.params.id, body);
    return json({ user });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
