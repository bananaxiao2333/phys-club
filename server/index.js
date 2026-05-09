import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authMiddleware, optionalAuthMiddleware, requireAdmin, signToken } from './auth.js';
import {
  addBatchMemberAdjustment,
  addMemberAdjustment,
  addSharedPoolAdjustment,
  assertCanView,
  changePassword,
  changeProfile,
  createInvite,
  getLeaderboard,
  getSettings,
  getStatistics,
  getViewerCapabilities,
  GROUPS,
  listInvites,
  listLedgerEntries,
  listUsers,
  recalculateStatistics,
  registerMember,
  seedDefaultData,
  SHARED_POOL,
  updateSettings,
  updateUser,
  verifyLogin,
  VIEW_DEFINITIONS
} from './services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8791);

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/app', optionalAuthMiddleware, asyncRoute(async (req, res) => {
  const settings = await getSettings();
  res.json({
    user: publicUser(req.user),
    groups: GROUPS,
    sharedPool: SHARED_POOL,
    viewDefinitions: VIEW_DEFINITIONS,
    settings,
    capabilities: getViewerCapabilities(req.user, settings)
  });
}));

app.get('/api/groups', (req, res) => {
  res.json({ groups: GROUPS });
});

app.get('/api/leaderboard', optionalAuthMiddleware, asyncRoute(async (req, res) => {
  await assertCanView(req.user, 'overview');
  res.json(await getLeaderboard());
}));

app.get('/api/ledger/public-pool', asyncRoute(async (req, res) => {
  res.json({
    entries: await listLedgerEntries({
      accountType: 'pool',
      accountId: SHARED_POOL.id,
      limit: req.query.limit
    })
  });
}));

app.get('/api/ledger/me', authMiddleware, asyncRoute(async (req, res) => {
  await assertCanView(req.user, 'myLedger');
  res.json({
    entries: await listLedgerEntries({
      accountType: 'member',
      accountId: req.user.id,
      limit: req.query.limit
    })
  });
}));

app.get('/api/ledger/all', authMiddleware, asyncRoute(async (req, res) => {
  await assertCanView(req.user, 'statistics');
  res.json({ entries: await listLedgerEntries({ limit: req.query.limit }) });
}));

app.get('/api/statistics', authMiddleware, asyncRoute(async (req, res) => {
  await assertCanView(req.user, 'statistics');
  res.json({ statistics: await getStatistics() });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const user = await verifyLogin(req.body.username, req.body.password);
  if (!user) return res.status(401).json({ message: '用户名或密码错误。' });
  res.json({ token: signToken(user), user });
}));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const user = await registerMember(req.body);
  res.status(201).json({ token: signToken(user), user });
}));

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post('/api/auth/password', authMiddleware, asyncRoute(async (req, res) => {
  const user = await changePassword(req.user.id, req.body.currentPassword, req.body.nextPassword);
  res.json({ user });
}));

app.patch('/api/auth/profile', authMiddleware, asyncRoute(async (req, res) => {
  const user = await changeProfile(req.user.id, req.body);
  res.json({ user });
}));

app.get('/api/admin/users', authMiddleware, requireAdmin, asyncRoute(async (req, res) => {
  res.json({ users: await listUsers() });
}));

app.patch('/api/admin/users/:id', authMiddleware, requireAdmin, asyncRoute(async (req, res) => {
  res.json({ user: await updateUser(req.params.id, req.body) });
}));

app.get('/api/admin/invites', authMiddleware, requireAdmin, asyncRoute(async (req, res) => {
  res.json({ invites: await listInvites() });
}));

app.post('/api/admin/invites', authMiddleware, requireAdmin, asyncRoute(async (req, res) => {
  const invite = await createInvite({
    groupId: req.body.groupId,
    maxUses: req.body.maxUses,
    expiresAt: req.body.expiresAt,
    createdBy: req.user.id
  });
  res.status(201).json({ invite });
}));

app.get('/api/admin/settings', authMiddleware, requireAdmin, asyncRoute(async (req, res) => {
  res.json({ settings: await getSettings(), viewDefinitions: VIEW_DEFINITIONS });
}));

app.put('/api/admin/settings', authMiddleware, requireAdmin, asyncRoute(async (req, res) => {
  res.json({ settings: await updateSettings(req.body) });
}));

app.post('/api/admin/ledger/member-adjust', authMiddleware, requireAdmin, asyncRoute(async (req, res) => {
  const entries = await addMemberAdjustment({
    userId: req.body.userId,
    delta: req.body.delta,
    reason: req.body.reason,
    detail: req.body.detail,
    operatorId: req.user.id
  });
  res.status(201).json({ entries });
}));

app.post('/api/admin/ledger/batch-member-adjust', authMiddleware, requireAdmin, asyncRoute(async (req, res) => {
  const entries = await addBatchMemberAdjustment({
    userIds: req.body.userIds,
    delta: req.body.delta,
    reason: req.body.reason,
    detail: req.body.detail,
    operatorId: req.user.id
  });
  res.status(201).json({ entries });
}));

app.post('/api/admin/ledger/pool-adjust', authMiddleware, requireAdmin, asyncRoute(async (req, res) => {
  const entries = await addSharedPoolAdjustment({
    delta: req.body.delta,
    reason: req.body.reason,
    detail: req.body.detail,
    operatorId: req.user.id
  });
  res.status(201).json({ entries });
}));

app.post('/api/admin/statistics/recalculate', authMiddleware, requireAdmin, asyncRoute(async (req, res) => {
  res.json({ statistics: await recalculateStatistics({ operatorId: req.user.id }) });
}));

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(rootDir, 'dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error, req, res, next) => {
  const status = error.message === '无权查看该内容。' ? 403 : 400;
  if (status !== 403) console.error(error);
  res.status(status).json({ message: error.message || '请求处理失败。' });
});

await seedDefaultData();

app.listen(port, () => {
  console.log(`Physics club points API running at http://127.0.0.1:${port}`);
  console.log(`Default admin: ${process.env.ADMIN_USERNAME || 'admin'} / ${process.env.ADMIN_PASSWORD || 'Physics@2026'}`);
});
