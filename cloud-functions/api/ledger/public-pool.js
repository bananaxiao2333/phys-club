import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { withOptionalAuth } from '../../lib/auth.js';
import { assertCanView, listLedgerEntries, SHARED_POOL } from '../../lib/database.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await withOptionalAuth(context.request, ctx);
    await assertCanView(ctx.user, 'overview');

    const { searchParams } = new URL(context.request.url);
    const entries = await listLedgerEntries({
      accountType: 'pool',
      accountId: SHARED_POOL.id,
      limit: searchParams.get('limit')
    });
    return json({ entries });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
