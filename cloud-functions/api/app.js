import { json, handleError, onRequestOptions } from "../lib/response.js";
import { withOptionalAuth } from "../lib/auth.js";
import {
  getSettings,
  getViewerCapabilities,
  getActiveSessions,
  getEmergencyStatus,
  GROUPS,
  SHARED_POOL,
  VIEW_DEFINITIONS,
  seedDefaultData,
} from "../lib/database.js";

export async function onRequestGet(context) {
  try {
    await seedDefaultData();

    const ctx = {};
    await withOptionalAuth(context.request, ctx);

    const settings = await getSettings();
    const user = ctx.user
      ? (({ passwordHash, ...rest }) => rest)(ctx.user)
      : null;

    return json({
      user,
      groups: GROUPS,
      sharedPool: SHARED_POOL,
      viewDefinitions: VIEW_DEFINITIONS,
      settings,
      capabilities: getViewerCapabilities(ctx.user, settings),
      activeSessions: await getActiveSessions(),
      emergency: await getEmergencyStatus(),
    });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
