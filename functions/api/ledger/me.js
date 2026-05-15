import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { requireAuth } from '../../lib/auth.js';
import { assertCanView, listLedgerEntries } from '../../lib/database.js';

export async function onRequestGet(context) {
  try {
    const ctx = {};
    await requireAuth(context.request, ctx);
    await assertCanView(ctx.user, 'myLedger');

    const { searchParams } = new URL(context.request.url);
    const entries = await listLedgerEntries({
      accountType: 'member',
      accountId: ctx.user.id,
      limit: searchParams.get('limit')
    });
    return json({ entries });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
