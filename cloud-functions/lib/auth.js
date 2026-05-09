import { signToken as jwtSign, verifyToken as jwtVerify } from './jwt.js';
import { getUserById, touchSession, getMaintenanceStatus } from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || (console.warn('[auth] WARNING: using default JWT_SECRET — set JWT_SECRET env var for production'), 'dev-only-change-this-secret');
const JWT_EXPIRY_SEC = 7 * 24 * 3600; // 7 days

export async function signToken(user) {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    role: user.role,
    username: user.username,
    displayName: user.displayName || user.username,
    active: user.active !== false,
    iat: nowSec,
    exp: nowSec + JWT_EXPIRY_SEC,
  };
  return jwtSign(payload, JWT_SECRET);
}

async function extractUser(request) {
  const header = request.headers.get('Authorization') || '';
  const match = header.trim().match(/^Bearer\s+(.+)$/i);
  if (!match) return { user: null, reason: null };
  const token = match[1].trim();

  try {
    const payload = await jwtVerify(token, JWT_SECRET);
    if (!payload) {
      console.error("[extractUser] jwt verify failed");
      return { user: null, reason: 'token_invalid' };
    }
    // Check JWT-level active flag as first line of defense
    if (payload.active === false) {
      console.error("[extractUser] token issued for inactive user:", payload.sub);
      return { user: null, reason: 'user_inactive' };
    }
    const kvUser = await getUserById(payload.sub);
    if (kvUser) {
      if (!kvUser.active) {
        console.error("[extractUser] user deactivated:", payload.sub);
        return { user: null, reason: 'user_inactive' };
      }
      return { user: kvUser, reason: null };
    }
    // KV unavailable — use JWT payload, but only if the JWT itself says the user was active at issue time
    console.error("[extractUser] KV miss, JWT fallback for:", payload.sub);
    return {
      user: {
        id: payload.sub,
        role: payload.role,
        username: payload.username || '',
        displayName: payload.displayName || payload.username || '用户',
        groupId: null,
        active: payload.active,
      },
      reason: null,
    };
  } catch (e) {
    console.error("[extractUser] exception:", e.message);
    return { user: null, reason: 'exception' };
  }
}

async function blockIfMaintenance(request, ctx) {
  if (!await getMaintenanceStatus()) return;
  // Always allow: login, app bootstrap, and admin routes
  const url = new URL(request.url);
  if (url.pathname === '/api/auth/login' || url.pathname === '/api/app' || url.pathname.startsWith('/api/admin/')) return;
  if (!ctx.user || ctx.user.role !== 'admin') {
    throw throwJson(503, '系统处于维护模式，仅管理员可访问。');
  }
}

// Attach user to context if token present (optional auth).
export async function withOptionalAuth(request, ctx) {
  const { user } = await extractUser(request);
  ctx.user = user || null;
  await blockIfMaintenance(request, ctx);
  if (ctx.user) {
    try { await touchSession(ctx.user); } catch { /* session tracking is non-critical */ }
  }
}

// Require valid auth — throws on failure; catch with handleError().
export async function requireAuth(request, ctx) {
  const { user, reason } = await extractUser(request);
  if (!user) {
    if (reason === 'user_gone' || reason === 'token_invalid') {
      throw throwJson(401, '登录已过期，请重新登录。');
    }
    throw throwJson(401, '请先登录。');
  }
  ctx.user = user;
  await blockIfMaintenance(request, ctx);
  try { await touchSession(ctx.user); } catch { /* session tracking is non-critical */ }
}

// Require admin role — call after requireAuth/withOptionalAuth.
export function requireAdmin(ctx) {
  if (ctx.user?.role !== 'admin') {
    throw throwJson(403, '需要管理员权限。');
  }
}

// Throw a structured error that handleError() will convert to a proper JSON Response.
function throwJson(status, message) {
  return Object.assign(new Error(message), {
    __jsonResponse: true,
    status,
    message
  });
}
