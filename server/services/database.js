import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { createKVStore, getJSON, setJSON } from '../storage/kvStore.js';

export const kv = createKVStore();

export const GROUPS = [
  { id: 'group_1', name: '奇点', alias: 'SINGULARITY', color: '#b00020' },
  { id: 'group_2', name: '星云', alias: 'NEBULA', color: '#3526a7' },
  { id: 'group_3', name: '脉冲星', alias: 'PULSAR', color: '#8a7b00' },
  { id: 'group_4', name: '磁陀星', alias: 'MAGNETAR', color: '#7b008f' }
];

export const SHARED_POOL = {
  id: 'shared',
  name: '共享资金池',
  color: '#1565c0'
};

export const ROLE_LABELS = {
  public: '公开',
  member: '社员',
  planner: '社团策划层',
  admin: '管理员'
};

export const VIEW_DEFINITIONS = {
  publicPool: { label: '共享资金池', fixedPublic: true, allowedRoles: ['public'] },
  overview: { label: '总览', allowedRoles: ['public', 'member', 'planner'] },
  members: { label: '成员', allowedRoles: ['public', 'member', 'planner'] },
  myLedger: { label: '我的明细', allowedRoles: ['member', 'planner'] },
  statistics: { label: '统计台', allowedRoles: ['member', 'planner'] }
};

const ROLE_RANK = {
  public: 0,
  member: 1,
  planner: 2,
  admin: 3
};

const DEFAULT_SETTINGS = {
  updatedAt: null,
  visibility: {
    publicPool: 'public',
    overview: 'member',
    members: 'planner',
    myLedger: 'member',
    statistics: 'planner'
  }
};

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Physics@2026';

function now() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function userKey(id) {
  return `user_${id}`;
}

function usernameKey(username) {
  const hash = crypto.createHash('sha256').update(normalizeUsername(username)).digest('hex').slice(0, 40);
  return `username_${hash}`;
}

function inviteKey(code) {
  return `invite_${String(code).trim().toUpperCase()}`;
}

function ledgerKey(createdAt, id) {
  return `ledger_${Date.parse(createdAt)}_${id}`;
}

function operationKey(createdAt, id) {
  return `operation_${Date.parse(createdAt)}_${id}`;
}

function settingsKey() {
  return 'settings_app';
}

function statsKey() {
  return 'stats_current';
}

function inviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function isValidGroup(groupId) {
  return GROUPS.some((group) => group.id === groupId);
}

function assertUsername(username) {
  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
    throw new Error('用户名需要为 3-24 位字母、数字或下划线。');
  }
}

function assertPassword(password) {
  if (String(password || '').length < 6) {
    throw new Error('密码至少需要 6 位。');
  }
}

function assertDelta(delta, label = '数值') {
  const amount = Number(delta);
  if (!Number.isInteger(amount) || amount === 0 || amount < -100000 || amount > 100000) {
    throw new Error(`${label}需要是 -100000 到 100000 之间的非零整数。`);
  }
  return amount;
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

function viewerRole(user) {
  if (!user) return 'public';
  if (user.role === 'admin') return 'admin';
  if (user.role === 'planner') return 'planner';
  return 'member';
}

function canView(user, viewId, settings) {
  const role = viewerRole(user);
  if (role === 'admin') return true;
  if (viewId === 'publicPool') return true;
  const required = settings.visibility?.[viewId] || 'admin';
  if (required === 'public') return true;
  if (!user) return false;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

async function listJSONByPrefix(prefix) {
  const values = [];
  let cursor;
  let result;

  do {
    result = await kv.list({ prefix, limit: 256, cursor });
    const records = await Promise.all(result.keys.map(({ key }) => getJSON(kv, key)));
    values.push(...records.filter(Boolean));
    cursor = result.cursor;
  } while (result && !result.complete);

  return values;
}

export async function seedDefaultData() {
  const existingAdminId = await kv.get(usernameKey(ADMIN_USERNAME));
  if (!existingAdminId) {
    const createdAt = now();
    const admin = {
      id: makeId('admin'),
      username: ADMIN_USERNAME,
      displayName: '系统管理员',
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: 'admin',
      groupId: null,
      active: true,
      createdAt,
      updatedAt: createdAt
    };

    await setJSON(kv, userKey(admin.id), admin);
    await kv.put(usernameKey(admin.username), admin.id);
  } else {
    const admin = await getUserById(existingAdminId);
    if (admin && (admin.role !== 'admin' || !admin.active || admin.groupId !== null)) {
      admin.role = 'admin';
      admin.groupId = null;
      admin.positionTitle = '';
      admin.active = true;
      admin.updatedAt = now();
      await setJSON(kv, userKey(admin.id), admin);
    }
  }

  const settings = await getSettings();
  if (!settings.updatedAt) {
    settings.updatedAt = now();
    await setJSON(kv, settingsKey(), settings);
  }
}

export async function getSettings() {
  const saved = await getJSON(kv, settingsKey());
  const mergedVisibility = {
    ...DEFAULT_SETTINGS.visibility,
    ...(saved?.visibility || {}),
    publicPool: 'public'
  };
  for (const viewId of Object.keys(mergedVisibility)) {
    const definition = VIEW_DEFINITIONS[viewId];
    if (definition?.allowedRoles && !definition.allowedRoles.includes(mergedVisibility[viewId])) {
      mergedVisibility[viewId] = DEFAULT_SETTINGS.visibility[viewId] || definition.allowedRoles[0];
    }
  }
  return {
    ...DEFAULT_SETTINGS,
    ...(saved || {}),
    visibility: mergedVisibility
  };
}

export async function updateSettings(patch) {
  const current = await getSettings();
  const visibility = { ...current.visibility };
  for (const [viewId, role] of Object.entries(patch.visibility || {})) {
    const definition = VIEW_DEFINITIONS[viewId];
    if (!definition) continue;
    if (!ROLE_RANK.hasOwnProperty(role)) continue;
    if (definition.allowedRoles && !definition.allowedRoles.includes(role)) continue;
    visibility[viewId] = viewId === 'publicPool' ? 'public' : role;
  }

  const next = {
    ...current,
    visibility,
    updatedAt: now()
  };
  await setJSON(kv, settingsKey(), next);
  return next;
}

export function getViewerCapabilities(user, settings) {
  const views = Object.fromEntries(
    Object.keys(VIEW_DEFINITIONS).map((viewId) => [viewId, canView(user, viewId, settings)])
  );
  return {
    role: viewerRole(user),
    views,
    admin: user?.role === 'admin'
  };
}

export async function createUser({ username, password, displayName, role = 'member', groupId = null }) {
  const cleanUsername = normalizeUsername(username);
  assertUsername(cleanUsername);
  assertPassword(password);

  if (!['member', 'planner', 'admin'].includes(role)) {
    throw new Error('无效用户角色。');
  }
  if (role !== 'admin' && !isValidGroup(groupId)) {
    throw new Error('请选择有效组别。');
  }

  const existing = await kv.get(usernameKey(cleanUsername));
  if (existing) throw new Error('用户名已被使用。');

  const createdAt = now();
  const user = {
    id: makeId('user'),
    username: cleanUsername,
    displayName: String(displayName || cleanUsername).trim().slice(0, 32),
    passwordHash: await bcrypt.hash(password, 12),
    role,
    groupId: role === 'admin' ? null : groupId,
    positionTitle: '',
    active: true,
    createdAt,
    updatedAt: createdAt
  };

  await setJSON(kv, userKey(user.id), user);
  await kv.put(usernameKey(user.username), user.id);
  return publicUser(user);
}

export async function getUserById(id) {
  return getJSON(kv, userKey(id));
}

export async function getUserByUsername(username) {
  const id = await kv.get(usernameKey(username));
  if (!id) return null;
  return getUserById(id);
}

export async function verifyLogin(username, password) {
  const user = await getUserByUsername(username);
  if (!user || !user.active) return null;
  const ok = await bcrypt.compare(String(password || ''), user.passwordHash);
  return ok ? publicUser(user) : null;
}

export async function changePassword(userId, currentPassword, nextPassword) {
  const user = await getUserById(userId);
  if (!user) throw new Error('用户不存在。');
  const ok = await bcrypt.compare(String(currentPassword || ''), user.passwordHash);
  if (!ok) throw new Error('当前密码不正确。');
  assertPassword(nextPassword);
  user.passwordHash = await bcrypt.hash(nextPassword, 12);
  user.updatedAt = now();
  await setJSON(kv, userKey(user.id), user);
  return publicUser(user);
}

export async function changeProfile(userId, patch) {
  const user = await getUserById(userId);
  if (!user) throw new Error('用户不存在。');

  if (patch.displayName !== undefined) {
    const displayName = String(patch.displayName).trim();
    if (!displayName) throw new Error('昵称不能为空。');
    user.displayName = displayName.slice(0, 32);
  }

  user.updatedAt = now();
  await setJSON(kv, userKey(user.id), user);
  return publicUser(user);
}

export async function listUsers() {
  const users = await listJSONByPrefix('user_');
  return users
    .map(publicUser)
    .sort((a, b) => {
      if (a.role !== b.role) return ROLE_RANK[b.role] - ROLE_RANK[a.role];
      return a.displayName.localeCompare(b.displayName, 'zh-CN');
    });
}

export async function updateUser(userId, patch) {
  const user = await getUserById(userId);
  if (!user) throw new Error('用户不存在。');

  if (patch.displayName !== undefined) {
    const displayName = String(patch.displayName).trim();
    if (!displayName) throw new Error('姓名不能为空。');
    user.displayName = displayName.slice(0, 32);
  }
  if (patch.role !== undefined) {
    if (!['member', 'planner', 'admin'].includes(patch.role)) throw new Error('无效用户角色。');
    user.role = patch.role;
  }
  if (user.role === 'admin') {
    user.groupId = null;
  } else if (patch.groupId !== undefined) {
    if (!isValidGroup(patch.groupId)) throw new Error('请选择有效组别。');
    user.groupId = patch.groupId;
  } else if (!isValidGroup(user.groupId)) {
    user.groupId = GROUPS[0].id;
  }
  if (patch.positionTitle !== undefined) {
    user.positionTitle = user.role === 'planner' ? String(patch.positionTitle || '').trim().slice(0, 32) : '';
  } else if (user.role !== 'planner') {
    user.positionTitle = '';
  }
  if (patch.active !== undefined) {
    user.active = Boolean(patch.active);
  }

  user.updatedAt = now();
  await setJSON(kv, userKey(user.id), user);
  return publicUser(user);
}

export async function createInvite({ groupId, maxUses = 1, expiresAt = null, createdBy }) {
  if (!isValidGroup(groupId)) throw new Error('请选择有效组别。');
  const usesLimit = Number(maxUses);
  if (!Number.isInteger(usesLimit) || usesLimit < 1 || usesLimit > 200) {
    throw new Error('邀请码可使用次数需要在 1-200 之间。');
  }

  let code;
  do {
    code = inviteCode();
  } while (await kv.get(inviteKey(code)));

  const createdAt = now();
  const invite = {
    code,
    groupId,
    maxUses: usesLimit,
    uses: 0,
    active: true,
    expiresAt: expiresAt || null,
    createdBy,
    createdAt,
    updatedAt: createdAt
  };

  await setJSON(kv, inviteKey(code), invite);
  return invite;
}

export async function listInvites() {
  const invites = await listJSONByPrefix('invite_');
  return invites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function registerMember({ inviteCode: code, username, password, displayName }) {
  const invite = await getJSON(kv, inviteKey(code));
  if (!invite || !invite.active) throw new Error('邀请码无效。');
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) throw new Error('邀请码已过期。');
  if (invite.uses >= invite.maxUses) throw new Error('邀请码使用次数已满。');

  const user = await createUser({
    username,
    password,
    displayName,
    role: 'member',
    groupId: invite.groupId
  });

  invite.uses += 1;
  invite.active = invite.uses < invite.maxUses;
  invite.updatedAt = now();
  await setJSON(kv, inviteKey(invite.code), invite);
  return user;
}

async function createLedgerOperation({ type, reason, detail = '', operatorId, entries, metadata = {} }) {
  const cleanReason = String(reason || '').trim();
  if (!cleanReason) throw new Error('请填写原因。');
  if (!Array.isArray(entries) || entries.length < 2) throw new Error('流水必须至少包含两条对应分录。');

  const sum = entries.reduce((total, entry) => total + Number(entry.delta || 0), 0);
  if (sum !== 0) throw new Error('流水分录未平账。');

  const createdAt = now();
  const operation = {
    id: makeId('op'),
    type,
    reason: cleanReason.slice(0, 80),
    detail: String(detail || '').trim().slice(0, 500),
    operatorId,
    metadata,
    createdAt
  };

  const records = entries.map((entry) => ({
    id: makeId('ledger'),
    operationId: operation.id,
    type,
    accountType: entry.accountType,
    accountId: entry.accountId,
    userId: entry.userId || null,
    groupId: entry.groupId || null,
    poolId: entry.poolId || null,
    delta: Number(entry.delta),
    reason: operation.reason,
    detail: operation.detail,
    operatorId,
    createdAt
  }));

  await setJSON(kv, operationKey(createdAt, operation.id), operation);
  await Promise.all(records.map((record) => setJSON(kv, ledgerKey(createdAt, record.id), record)));
  return enrichLedgerEntries(records);
}

export async function addMemberAdjustment({ userId, delta, reason, detail = '', operatorId }) {
  const user = await getUserById(userId);
  if (!user || !['member', 'planner'].includes(user.role)) throw new Error('请选择有效社员。');
  if (!user.active) throw new Error('该社员已停用。');

  const amount = assertDelta(delta, '积分变化');
  return createLedgerOperation({
    type: 'member_adjustment',
    reason,
    detail,
    operatorId,
    metadata: { userIds: [user.id], count: 1 },
    entries: [
      {
        accountType: 'member',
        accountId: user.id,
        userId: user.id,
        groupId: user.groupId,
        delta: amount
      },
      {
        accountType: 'pool',
        accountId: SHARED_POOL.id,
        poolId: SHARED_POOL.id,
        delta: -amount
      }
    ]
  });
}

export async function addBatchMemberAdjustment({ userIds, delta, reason, detail = '', operatorId }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) throw new Error('请选择至少一名社员。');
  const amount = assertDelta(delta, '批量积分变化');
  const result = [];

  for (const userId of ids) {
    const entries = await addMemberAdjustment({ userId, delta: amount, reason, detail, operatorId });
    result.push(...entries);
  }

  return result;
}

export async function addSharedPoolAdjustment({ delta, reason, detail = '', operatorId }) {
  const amount = assertDelta(delta, '共享资金池变化');
  return createLedgerOperation({
    type: 'pool_adjustment',
    reason,
    detail,
    operatorId,
    metadata: { poolId: SHARED_POOL.id },
    entries: [
      {
        accountType: 'pool',
        accountId: SHARED_POOL.id,
        poolId: SHARED_POOL.id,
        delta: amount
      },
      {
        accountType: 'external',
        accountId: 'external',
        delta: -amount
      }
    ]
  });
}

export async function listLedgerEntries({ limit = 500, accountType, accountId, userId, poolId } = {}) {
  const entries = await listJSONByPrefix('ledger_');
  const selected = entries
    .filter((entry) => !accountType || entry.accountType === accountType)
    .filter((entry) => !accountId || entry.accountId === accountId)
    .filter((entry) => !userId || entry.userId === userId)
    .filter((entry) => !poolId || entry.poolId === poolId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, Math.min(Number(limit) || 500, 1000));
  return enrichLedgerEntries(selected);
}

export async function enrichLedgerEntries(entries) {
  const users = await listUsers();
  const userMap = new Map(users.map((user) => [user.id, user]));
  const groupMap = new Map(GROUPS.map((group) => [group.id, group]));
  const operatorMap = new Map(users.map((user) => [user.id, user.displayName]));

  return entries.map((entry) => ({
    ...entry,
    userDisplayName: entry.userId ? userMap.get(entry.userId)?.displayName || '未知社员' : null,
    username: entry.userId ? userMap.get(entry.userId)?.username || '' : null,
    groupName: entry.groupId ? groupMap.get(entry.groupId)?.name || '未分组' : null,
    poolName: entry.poolId === SHARED_POOL.id ? SHARED_POOL.name : null,
    accountName:
      entry.accountType === 'member'
        ? userMap.get(entry.accountId)?.displayName || '未知社员'
        : entry.accountType === 'pool'
          ? SHARED_POOL.name
          : '外部校准',
    operatorDisplayName: operatorMap.get(entry.operatorId) || '系统'
  }));
}

export async function getLeaderboard() {
  const [users, entries] = await Promise.all([listUsers(), listLedgerEntries({ accountType: 'member', limit: 1000 })]);
  const totals = new Map();
  for (const entry of entries) {
    totals.set(entry.accountId, (totals.get(entry.accountId) || 0) + entry.delta);
  }

  const members = users
    .filter((user) => ['member', 'planner'].includes(user.role))
    .map((user) => ({
      ...user,
      groupName: GROUPS.find((group) => group.id === user.groupId)?.name || '未分组',
      total: totals.get(user.id) || 0
    }))
    .sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName, 'zh-CN'));

  const groups = GROUPS.map((group) => {
    const groupMembers = members.filter((member) => member.groupId === group.id);
    return {
      ...group,
      memberCount: groupMembers.length,
      total: groupMembers.reduce((sum, member) => sum + member.total, 0)
    };
  });

  const sharedPoolTotal = (await listLedgerEntries({ accountType: 'pool', accountId: SHARED_POOL.id, limit: 1000 }))
    .reduce((sum, entry) => sum + entry.delta, 0);

  return { groups, members, sharedPool: { ...SHARED_POOL, total: sharedPoolTotal } };
}

export async function recalculateStatistics({ operatorId }) {
  const entries = await listJSONByPrefix('ledger_');
  const operations = await listJSONByPrefix('operation_');
  const operationMap = new Map(operations.map((operation) => [operation.id, operation]));
  const byOperation = new Map();
  const accountTotals = new Map();

  for (const entry of entries) {
    if (!byOperation.has(entry.operationId)) byOperation.set(entry.operationId, []);
    byOperation.get(entry.operationId).push(entry);
    const key = `${entry.accountType}:${entry.accountId}`;
    accountTotals.set(key, (accountTotals.get(key) || 0) + entry.delta);
  }

  const operationChecks = [...byOperation.entries()].map(([operationId, operationEntries]) => {
    const sum = operationEntries.reduce((total, entry) => total + entry.delta, 0);
    return {
      operationId,
      type: operationMap.get(operationId)?.type || 'unknown',
      reason: operationMap.get(operationId)?.reason || operationEntries[0]?.reason || '',
      createdAt: operationMap.get(operationId)?.createdAt || operationEntries[0]?.createdAt || null,
      entryCount: operationEntries.length,
      sum,
      balanced: sum === 0
    };
  });

  const accounts = [...accountTotals.entries()].map(([key, total]) => {
    const [accountType, accountId] = key.split(':');
    return { accountType, accountId, total };
  });

  const snapshot = {
    id: makeId('stats'),
    updatedAt: now(),
    updatedBy: operatorId,
    entryCount: entries.length,
    operationCount: operationChecks.length,
    balancedOperationCount: operationChecks.filter((item) => item.balanced).length,
    unbalancedOperationCount: operationChecks.filter((item) => !item.balanced).length,
    isBalanced: operationChecks.every((item) => item.balanced),
    sharedPoolTotal: accountTotals.get(`pool:${SHARED_POOL.id}`) || 0,
    memberTotal: accounts
      .filter((account) => account.accountType === 'member')
      .reduce((sum, account) => sum + account.total, 0),
    externalTotal: accountTotals.get('external:external') || 0,
    accounts,
    operationChecks: operationChecks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  };

  await setJSON(kv, statsKey(), snapshot);
  return snapshot;
}

export async function getStatistics() {
  return getJSON(kv, statsKey(), null);
}

export async function assertCanView(user, viewId) {
  const settings = await getSettings();
  if (!canView(user, viewId, settings)) {
    throw new Error('无权查看该内容。');
  }
  return settings;
}

export function roleRank(role) {
  return ROLE_RANK[role] ?? 0;
}
