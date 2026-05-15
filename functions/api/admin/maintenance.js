import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { requireAuth, requireAdmin } from '../../lib/auth.js';
import { getMaintenanceStatus, setMaintenanceStatus } from '../../lib/database.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);

    return json({ maintenance: await getMaintenanceStatus() });
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
    await setMaintenanceStatus(Boolean(body.active));

    return json({ maintenance: await getMaintenanceStatus() });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
