import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { listLedgerEntries, SHARED_POOL } from '../../lib/database.js';

export async function onRequestGet(context) {
  try {
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
