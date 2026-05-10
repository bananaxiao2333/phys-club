import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { requireAuth, requireAdmin } from '../../lib/auth.js';
import { loadGroups, createGroup, updateGroup, deleteGroup } from '../../lib/database.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);
    return json({ groups: await loadGroups() });
  } catch (error) { return handleError(error); }
}

export async function onRequestPost(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);
    const body = await context.request.json();
    return json({ group: await createGroup(body) }, 201);
  } catch (error) { return handleError(error); }
}

export async function onRequestPatch(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);
    const body = await context.request.json();
    return json({ group: await updateGroup(body.id, body) });
  } catch (error) { return handleError(error); }
}

export async function onRequestDelete(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    requireAdmin(ctx);
    const { searchParams } = new URL(context.request.url);
    return json(await deleteGroup(searchParams.get('id')));
  } catch (error) { return handleError(error); }
}

export { onRequestOptions };
