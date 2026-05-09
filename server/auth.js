import jwt from 'jsonwebtoken';
import { getUserById } from './services/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-this-secret';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: '请先登录。' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ message: '登录状态已失效。' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: '登录状态已失效。' });
  }
}

export async function optionalAuthMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(payload.sub);
    req.user = user?.active ? user : null;
  } catch {
    req.user = null;
  }

  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限。' });
  }
  next();
}
