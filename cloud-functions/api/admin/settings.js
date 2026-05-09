import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { requireAuth, requireAdmin } from '../../lib/auth.js';
import { getSettings, updateSettings, VIEW_DEFINITIONS } from '../../lib/database.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);

    return json({ settings: await getSettings(), viewDefinitions: VIEW_DEFINITIONS });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestPut(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);

    const body = await context.request.json();
    return json({ settings: await updateSettings(body) });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
