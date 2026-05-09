import bcrypt from "bcryptjs";
import { makeId, randomHex } from "./crypto-helpers.js";

// ---- constants ----

export const GROUPS = [
  { id: "group_1", name: "奇点", alias: "SINGULARITY", color: "#b00020" },
  { id: "group_2", name: "星云", alias: "NEBULA", color: "#3526a7" },
  { id: "group_3", name: "脉冲星", alias: "PULSAR", color: "#8a7b00" },
  { id: "group_4", name: "磁陀星", alias: "MAGNETAR", color: "#7b008f" },
];

// ---- pool definitions ----

export const FIXED_POOL = {
  id: "pool_fixed",
  name: "固定资金池",
  color: "#1565c0",
  description: "社团公共资金，用于公共物资、活动垫付、奖励注资、维护支出",
};

export const SETTLEMENT_POOL = {
  id: "pool_settlement",
  name: "项目待结算池",
  color: "#e65100",
  description: "临时中转区，营业收入先入此池，扣除成本后利润转入固定池",
};

export const REWARD_POOL = {
  id: "pool_reward",
  name: "奖励池",
  color: "#2e7d32",
  description: "固定资金池中的锁定部分，专门用于发放社员奖励",
};

// Legacy alias for backward compatibility in ledger data
export const SHARED_POOL = FIXED_POOL;

export const VIEW_DEFINITIONS = {
  overview: { label: "总览", allowedRoles: ["public", "member", "planner"] },
  members: { label: "成员", allowedRoles: ["public", "member", "planner"] },
  myLedger: { label: "我的明细", allowedRoles: ["member", "planner"] },
  statistics: { label: "统计台", allowedRoles: ["member", "planner"] },
};

const ROLE_RANK = { public: 0, member: 1, planner: 2, admin: 3 };

const DEFAULT_SETTINGS = {
  updatedAt: null,
  visibility: {
    overview: "public",
    members: "planner",
    myLedger: "member",
    statistics: "planner",
  },
  sidebarUsers: {
    enabled: true,
    minRole: "member",
    maxUsers: 10,
    sortBy: "lastSeen",
  },
  sidebarOrder: ["overview", "members", "myLedger", "statistics", "admin"],
  duesSplitRatio: 30,          // % of new member dues going to fixed pool
  wartimeGap: 0,               // amount owed to fixed pool from wartime reward fills
};

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  (console.warn(
    "[db] WARNING: using default admin password — set ADMIN_PASSWORD env var",
  ),
  "rRycmg2eUwttM5XH69dq");

// ---- collection keys ----

const KEY_USERS = "data_users";
const KEY_USERNAMES = "data_usernames";
const KEY_INVITES = "data_invites";
const KEY_LEDGER = "data_ledger";
const KEY_OPERATIONS = "data_operations";
const KEY_SETTINGS = "data_settings";
const KEY_STATS = "data_stats";
const KEY_SESSIONS = "data_sessions";
const KEY_SIDEBAR = "data_sidebar";
const KEY_MAINTENANCE = "data_maintenance";

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ---- KV helpers with base64 encoding ----
// The local KV emulator's RESP transport corrupts raw JSON strings
// (especially CJK characters). Base64-encoding avoids this entirely.

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function stripRESP(raw) {
  if (typeof raw !== "string") return raw;
  const idx = raw.indexOf("\n*");
  return idx > 0 ? raw.slice(0, idx) : raw;
}

async function loadCollection(key) {
  const raw = await kv_data.get(key);
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== "string") return raw;
  const cleaned = stripRESP(raw);
  // Try base64 first, then plain JSON for backwards compatibility,
  // then empty object if both fail (corrupted data shouldn't block auth).
  try {
    return JSON.parse(fromBase64(cleaned));
  } catch {
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.error(
        "[loadCollection] failed for",
        key,
        "raw starts with:",
        cleaned.slice(0, 80),
        e.message,
      );
      return {};
    }
  }
}

async function saveCollection(key, data) {
  await kv_data.put(key, toBase64(JSON.stringify(data)));
}

// ---- session tracking ----

export async function touchSession(user) {
  const sessions = await loadCollection(KEY_SESSIONS);
  const nowTs = Date.now();
  // Clean up expired sessions (inactive > SESSION_TTL_MS)
  for (const [uid, s] of Object.entries(sessions)) {
    if (nowTs - (s.lastSeen || 0) > SESSION_TTL_MS) {
      delete sessions[uid];
    }
  }
  sessions[user.id] = {
    userId: user.id,
    displayName: user.displayName,
    role: user.role,
    groupId: user.groupId,
    lastSeen: nowTs,
  };
  await saveCollection(KEY_SESSIONS, sessions);
}

export async function getActiveSessions() {
  const sessions = await loadCollection(KEY_SESSIONS);
  const nowTs = Date.now();
  return Object.values(sessions)
    .filter((s) => s && typeof s.userId === 'string' && typeof s.lastSeen === 'number')
    .filter((s) => nowTs - s.lastSeen <= SESSION_TTL_MS)
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

// ---- maintenance mode ----

export async function getMaintenanceStatus() {
  const data = await loadCollection(KEY_MAINTENANCE);
  return data?.active === true;
}

export async function setMaintenanceStatus(active) {
  if (active) {
    // Force logout all non-admin users
    const sessions = await loadCollection(KEY_SESSIONS);
    const users = await loadCollection(KEY_USERS);
    for (const [uid, s] of Object.entries(sessions)) {
      const user = users[uid];
      if (!user || user.role !== "admin") {
        delete sessions[uid];
      }
    }
    await saveCollection(KEY_SESSIONS, sessions);
  }
  await saveCollection(KEY_MAINTENANCE, { active, updatedAt: now() });
}

// ---- helpers ----

function now() {
  return new Date().toISOString();
}

function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase();
}

function isValidGroup(groupId) {
  return GROUPS.some((g) => g.id === groupId);
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

function viewerRole(user) {
  if (!user) return "public";
  if (user.role === "admin") return "admin";
  if (user.role === "planner") return "planner";
  return "member";
}

export function canView(user, viewId, settings) {
  const role = viewerRole(user);
  if (role === "admin") return true;
  const required = settings.visibility?.[viewId] || "admin";
  if (required === "public") return true;
  if (!user) return false;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

// ---- validation ----

function assertUsername(username) {
  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
    throw new Error("用户名需要为 3-24 位字母、数字或下划线。");
  }
}

function assertPassword(password) {
  if (String(password || "").length < 8) {
    throw new Error("密码至少需要 8 位。");
  }
}

function assertDelta(delta, label = "数值") {
  const amount = Number(delta);
  if (
    !Number.isInteger(amount) ||
    amount === 0 ||
    amount < -100000 ||
    amount > 100000
  ) {
    throw new Error(`${label}需要是 -100000 到 100000 之间的非零整数。`);
  }
  return amount;
}

function inviteCode() {
  return randomHex(8).toUpperCase();
}

// ---- seed ----

export async function seedDefaultData() {
  const settings = await getSettings();
  if (settings.updatedAt) return;

  const adminUsername = normalizeUsername(ADMIN_USERNAME);
  const usernames = await loadCollection(KEY_USERNAMES);
  const users = await loadCollection(KEY_USERS);
  const existingAdminId = usernames[adminUsername];

  if (!existingAdminId) {
    const createdAt = now();
    const admin = {
      id: makeId("admin"),
      username: adminUsername,
      displayName: "系统管理员",
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: "admin",
      groupId: null,
      active: true,
      createdAt,
      updatedAt: createdAt,
    };
    users[admin.id] = admin;
    usernames[admin.username] = admin.id;
    await saveCollection(KEY_USERS, users);
    await saveCollection(KEY_USERNAMES, usernames);
  } else {
    const admin = users[existingAdminId];
    if (
      admin &&
      (admin.role !== "admin" || !admin.active || admin.groupId !== null)
    ) {
      admin.role = "admin";
      admin.groupId = null;
      admin.positionTitle = "";
      admin.active = true;
      admin.updatedAt = now();
      await saveCollection(KEY_USERS, users);
    }
  }

  settings.updatedAt = now();
  await saveCollection(KEY_SETTINGS, settings);
}

// ---- settings ----

export async function getSettings() {
  const saved = await loadCollection(KEY_SETTINGS);
  const sidebarSaved = await loadCollection(KEY_SIDEBAR);
  const mergedVisibility = {
    ...DEFAULT_SETTINGS.visibility,
    ...(saved?.visibility || {}),
  };
  for (const viewId of Object.keys(mergedVisibility)) {
    const def = VIEW_DEFINITIONS[viewId];
    if (
      def?.allowedRoles &&
      !def.allowedRoles.includes(mergedVisibility[viewId])
    ) {
      mergedVisibility[viewId] =
        DEFAULT_SETTINGS.visibility[viewId] || def.allowedRoles[0];
    }
  }
  return {
    ...DEFAULT_SETTINGS,
    ...(saved || {}),
    visibility: mergedVisibility,
    sidebarUsers: {
      ...DEFAULT_SETTINGS.sidebarUsers,
      ...(sidebarSaved || {}),
    },
  };
}

export async function updateSettings(patch) {
  console.log("[updateSettings] patch:", JSON.stringify(patch));
  const current = await getSettings();
  const visibility = { ...current.visibility };
  for (const [viewId, role] of Object.entries(patch.visibility || {})) {
    const def = VIEW_DEFINITIONS[viewId];
    if (!def || !ROLE_RANK.hasOwnProperty(role)) continue;
    if (def.allowedRoles && !def.allowedRoles.includes(role)) continue;
    visibility[viewId] = role;
  }
  let sidebarUsers = { ...current.sidebarUsers };
  if (patch.sidebarUsers) {
    sidebarUsers = {
      ...sidebarUsers,
      ...patch.sidebarUsers,
      maxUsers: Math.max(
        1,
        Math.min(50, Number(patch.sidebarUsers.maxUsers) || 10),
      ),
    };
  }
  let sidebarOrder = current.sidebarOrder || DEFAULT_SETTINGS.sidebarOrder;
  if (patch.sidebarOrder) {
    sidebarOrder = patch.sidebarOrder;
  }
  let duesSplitRatio = current.duesSplitRatio ?? DEFAULT_SETTINGS.duesSplitRatio;
  if (patch.duesSplitRatio !== undefined) {
    duesSplitRatio = Math.max(0, Math.min(100, Number(patch.duesSplitRatio) || 0));
  }
  let wartimeGap = current.wartimeGap ?? 0;
  if (patch.wartimeGap !== undefined) {
    wartimeGap = Math.max(0, Number(patch.wartimeGap) || 0);
  }
  const next = { ...current, visibility, sidebarOrder, duesSplitRatio, wartimeGap, updatedAt: now() };
  await saveCollection(KEY_SETTINGS, next);
  await saveCollection(KEY_SIDEBAR, sidebarUsers);
  console.log(
    "[updateSettings] saved sidebarUsers:",
    JSON.stringify(sidebarUsers),
  );
  console.log(
    "[updateSettings] saved sidebarOrder:",
    JSON.stringify(sidebarOrder),
  );
  return { ...next, sidebarUsers };
}

export function getViewerCapabilities(user, settings) {
  const views = Object.fromEntries(
    Object.keys(VIEW_DEFINITIONS).map((vid) => [
      vid,
      canView(user, vid, settings),
    ]),
  );
  return { role: viewerRole(user), views, admin: user?.role === "admin" };
}

// ---- users ----

export async function createUser({
  username,
  password,
  displayName,
  role = "member",
  groupId = null,
}) {
  const clean = normalizeUsername(username);
  assertUsername(clean);
  assertPassword(password);
  if (!["member", "planner", "admin"].includes(role))
    throw new Error("无效用户角色。");
  if (role !== "admin" && !isValidGroup(groupId))
    throw new Error("请选择有效组别。");

  const usernames = await loadCollection(KEY_USERNAMES);
  if (usernames[clean]) throw new Error("用户名已被使用。");

  const users = await loadCollection(KEY_USERS);
  const createdAt = now();
  const user = {
    id: makeId("user"),
    username: clean,
    displayName: String(displayName || clean)
      .trim()
      .slice(0, 32),
    passwordHash: await bcrypt.hash(password, 12),
    role,
    groupId: role === "admin" ? null : groupId,
    positionTitle: "",
    active: true,
    createdAt,
    updatedAt: createdAt,
  };

  users[user.id] = user;
  usernames[user.username] = user.id;
  await saveCollection(KEY_USERS, users);
  await saveCollection(KEY_USERNAMES, usernames);
  return publicUser(user);
}

export async function getUserById(id) {
  const users = await loadCollection(KEY_USERS);
  const user = users[id];
  return user && typeof user.id === 'string' && typeof user.role === 'string' ? user : null;
}

export async function getUserByUsername(username) {
  const usernames = await loadCollection(KEY_USERNAMES);
  const id = usernames[normalizeUsername(username)];
  if (!id) return null;
  return getUserById(id);
}

export async function verifyLogin(username, password) {
  const user = await getUserByUsername(username);
  if (!user || !user.active) return null;
  const ok = await bcrypt.compare(String(password || ""), user.passwordHash);
  return ok ? publicUser(user) : null;
}

export async function changePassword(userId, currentPassword, nextPassword) {
  const users = await loadCollection(KEY_USERS);
  const user = users[userId];
  if (!user) throw new Error("用户不存在。");
  const ok = await bcrypt.compare(
    String(currentPassword || ""),
    user.passwordHash,
  );
  if (!ok) throw new Error("当前密码不正确。");
  assertPassword(nextPassword);
  user.passwordHash = await bcrypt.hash(nextPassword, 12);
  user.updatedAt = now();
  await saveCollection(KEY_USERS, users);
  return publicUser(user);
}

export async function changeProfile(userId, patch) {
  const users = await loadCollection(KEY_USERS);
  const user = users[userId];
  if (!user) throw new Error("用户不存在。");
  if (patch.displayName !== undefined) {
    const dn = String(patch.displayName).trim();
    if (!dn) throw new Error("昵称不能为空。");
    user.displayName = dn.slice(0, 32);
  }
  user.updatedAt = now();
  await saveCollection(KEY_USERS, users);
  return publicUser(user);
}

function isValidUser(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.username === "string" &&
    typeof obj.role === "string"
  );
}

export async function listUsers() {
  const users = await loadCollection(KEY_USERS);
  return Object.values(users)
    .filter(isValidUser)
    .map(publicUser)
    .filter(Boolean)
    .sort((a, b) => {
      if (a.role !== b.role)
        return (ROLE_RANK[b.role] || 0) - (ROLE_RANK[a.role] || 0);
      return (a.displayName || "").localeCompare(b.displayName || "", "zh-CN");
    });
}

export async function updateUser(userId, patch) {
  const users = await loadCollection(KEY_USERS);
  const user = users[userId];
  if (!user) throw new Error("用户不存在。");

  if (patch.displayName !== undefined) {
    const dn = String(patch.displayName).trim();
    if (!dn) throw new Error("姓名不能为空。");
    user.displayName = dn.slice(0, 32);
  }
  if (patch.role !== undefined) {
    if (!["member", "planner", "admin"].includes(patch.role))
      throw new Error("无效用户角色。");
    user.role = patch.role;
  }
  if (user.role === "admin") {
    user.groupId = null;
  } else if (patch.groupId !== undefined) {
    if (!isValidGroup(patch.groupId)) throw new Error("请选择有效组别。");
    user.groupId = patch.groupId;
  } else if (!isValidGroup(user.groupId)) {
    user.groupId = GROUPS[0].id;
  }
  if (patch.positionTitle !== undefined) {
    user.positionTitle =
      user.role === "planner"
        ? String(patch.positionTitle || "")
            .trim()
            .slice(0, 32)
        : "";
  } else if (user.role !== "planner") {
    user.positionTitle = "";
  }
  if (patch.active !== undefined) user.active = Boolean(patch.active);

  user.updatedAt = now();
  await saveCollection(KEY_USERS, users);
  return publicUser(user);
}

// ---- invites ----

export async function createInvite({
  groupId,
  maxUses = 1,
  expiresAt = null,
  createdBy,
}) {
  if (!isValidGroup(groupId)) throw new Error("请选择有效组别。");
  const limit = Number(maxUses);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new Error("邀请码可使用次数需要在 1-200 之间。");
  }

  const invites = await loadCollection(KEY_INVITES);
  let code;
  do {
    code = inviteCode();
  } while (invites[code]);

  const createdAt = now();
  const invite = {
    code,
    groupId,
    maxUses: limit,
    uses: 0,
    active: true,
    expiresAt: expiresAt || null,
    createdBy,
    createdAt,
    updatedAt: createdAt,
  };
  invites[code] = invite;
  await saveCollection(KEY_INVITES, invites);
  return invite;
}

export async function listInvites() {
  const invites = await loadCollection(KEY_INVITES);
  return Object.values(invites).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
}

export async function toggleInviteActive(code, active) {
  const invites = await loadCollection(KEY_INVITES);
  const invite = invites[String(code).trim().toUpperCase()];
  if (!invite) throw new Error("邀请码不存在。");
  invite.active = Boolean(active);
  invite.updatedAt = now();
  await saveCollection(KEY_INVITES, invites);
  return invite;
}

export async function registerMember({
  inviteCode: code,
  username,
  password,
  displayName,
}) {
  const invites = await loadCollection(KEY_INVITES);
  const invite = invites[String(code).trim().toUpperCase()];
  if (!invite || !invite.active) throw new Error("邀请码无效。");
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date())
    throw new Error("邀请码已过期。");
  if (invite.uses >= invite.maxUses) throw new Error("邀请码使用次数已满。");

  const user = await createUser({
    username,
    password,
    displayName,
    role: "member",
    groupId: invite.groupId,
  });

  invite.uses += 1;
  invite.active = invite.uses < invite.maxUses;
  invite.updatedAt = now();
  await saveCollection(KEY_INVITES, invites);
  return user;
}

// ---- ledger (double-entry) ----

async function createLedgerOperation({
  type,
  reason,
  detail = "",
  operatorId,
  entries,
  metadata = {},
}) {
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw new Error("请填写原因。");
  if (!Array.isArray(entries) || entries.length < 2)
    throw new Error("流水必须至少包含两条对应分录。");
  const sum = entries.reduce((t, e) => t + Number(e.delta || 0), 0);
  if (sum !== 0) throw new Error("流水分录未平账。");

  const createdAt = now();
  const operation = {
    id: makeId("op"),
    type,
    reason: cleanReason.slice(0, 80),
    detail: String(detail || "")
      .trim()
      .slice(0, 500),
    operatorId,
    metadata,
    createdAt,
  };

  const records = entries.map((entry) => ({
    id: makeId("ledger"),
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
    createdAt,
  }));

  const ledger = await loadCollection(KEY_LEDGER);
  const operations = await loadCollection(KEY_OPERATIONS);
  operations[operation.id] = operation;
  for (const r of records) ledger[r.id] = r;
  await saveCollection(KEY_LEDGER, ledger);
  await saveCollection(KEY_OPERATIONS, operations);
  return enrichLedgerEntries(records);
}

export async function addMemberAdjustment({
  userId,
  delta,
  reason,
  detail = "",
  operatorId,
}) {
  const user = await getUserById(userId);
  if (!user || !["member", "planner"].includes(user.role))
    throw new Error("请选择有效社员。");
  if (!user.active) throw new Error("该社员已停用。");
  const amount = assertDelta(delta, "积分变化");
  return createLedgerOperation({
    type: "member_adjustment",
    reason,
    detail,
    operatorId,
    metadata: { userIds: [user.id], count: 1 },
    entries: [
      {
        accountType: "member",
        accountId: user.id,
        userId: user.id,
        groupId: user.groupId,
        delta: amount,
      },
      {
        accountType: "pool",
        accountId: SHARED_POOL.id,
        poolId: SHARED_POOL.id,
        delta: -amount,
      },
    ],
  });
}

export async function addBatchMemberAdjustment({
  userIds,
  delta,
  reason,
  detail = "",
  operatorId,
}) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) throw new Error("请选择至少一名社员。");
  const amount = assertDelta(delta, "批量积分变化");
  const result = [];
  for (const userId of ids) {
    result.push(
      ...(await addMemberAdjustment({
        userId,
        delta: amount,
        reason,
        detail,
        operatorId,
      })),
    );
  }
  return result;
}

export async function addSharedPoolAdjustment({
  delta,
  reason,
  detail = "",
  operatorId,
}) {
  const amount = assertDelta(delta, "共享资金池变化");
  return createLedgerOperation({
    type: "pool_adjustment",
    reason,
    detail,
    operatorId,
    metadata: { poolId: SHARED_POOL.id },
    entries: [
      {
        accountType: "pool",
        accountId: SHARED_POOL.id,
        poolId: SHARED_POOL.id,
        delta: amount,
      },
      { accountType: "external", accountId: "external", delta: -amount },
    ],
  });
}

// ---- new 功勋 operations (casting / destruction / transfer) ----

async function createMeritOperation({ type, reason, detail = "", operatorId, entries, metadata = {} }) {
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw new Error("请填写原因。");
  if (!Array.isArray(entries) || entries.length < 2) throw new Error("分录至少需要两条。");
  const sum = entries.reduce((t, e) => t + Number(e.delta || 0), 0);
  if (sum !== 0) throw new Error("分录未平账。");

  const createdAt = now();
  const operation = {
    id: makeId("op"),
    type,
    reason: cleanReason.slice(0, 120),
    detail: String(detail || "").trim().slice(0, 500),
    operatorId,
    metadata,
    createdAt,
  };

  const records = entries.map((entry) => ({
    id: makeId("ledger"),
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
    createdAt,
  }));

  const ledger = await loadCollection(KEY_LEDGER);
  const operations = await loadCollection(KEY_OPERATIONS);
  operations[operation.id] = operation;
  for (const r of records) ledger[r.id] = r;
  await saveCollection(KEY_LEDGER, ledger);
  await saveCollection(KEY_OPERATIONS, operations);
  return enrichLedgerEntries(records);
}

// 铸造：真实资金进入系统，功勋增加
export async function castMerit({ amount, poolId, reason, detail = "", operatorId }) {
  const amt = Math.abs(assertDelta(amount, "铸造金额"));
  return createMeritOperation({
    type: "casting",
    reason, detail, operatorId,
    metadata: { poolId, amount: amt },
    entries: [
      { accountType: "pool", accountId: poolId, poolId, delta: amt },
      { accountType: "external", accountId: "external", delta: -amt },
    ],
  });
}

// 销毁：真实资金离开系统，功勋消灭
export async function destroyMerit({ amount, poolId, reason, detail = "", operatorId }) {
  const amt = Math.abs(assertDelta(amount, "销毁金额"));
  return createMeritOperation({
    type: "destruction",
    reason, detail, operatorId,
    metadata: { poolId, amount: amt },
    entries: [
      { accountType: "pool", accountId: poolId, poolId, delta: -amt },
      { accountType: "external", accountId: "external", delta: amt },
    ],
  });
}

// 转账：池子之间的功勋转移
export async function transferMerit({ fromPoolId, toPoolId, amount, reason, detail = "", operatorId }) {
  const amt = Math.abs(assertDelta(amount, "转账金额"));
  return createMeritOperation({
    type: "transfer",
    reason, detail, operatorId,
    metadata: { fromPoolId, toPoolId, amount: amt },
    entries: [
      { accountType: "pool", accountId: fromPoolId, poolId: fromPoolId, delta: -amt },
      { accountType: "pool", accountId: toPoolId, poolId: toPoolId, delta: amt },
    ],
  });
}

// 社费拆分：新社员缴费，按比例分配固定池和个人账户
export async function allocateDues({ userId, amount, operatorId }) {
  const user = await getUserById(userId);
  if (!user) throw new Error("社员不存在。");
  const amt = Math.abs(assertDelta(amount, "社费金额"));
  const settings = await getSettings();
  const ratio = (settings.duesSplitRatio || 30) / 100;
  const toFixed = Math.round(amt * ratio);
  const toMember = amt - toFixed;

  return createMeritOperation({
    type: "dues_split",
    reason: `社费拆分（${settings.duesSplitRatio || 30}%归公）`,
    detail: `${amt} 功勋铸造 → 固定池 ${toFixed} + 个人 ${toMember}`,
    operatorId,
    metadata: { userId, amount: amt, splitRatio: settings.duesSplitRatio || 30, toFixed, toMember },
    entries: [
      { accountType: "pool", accountId: FIXED_POOL.id, poolId: FIXED_POOL.id, delta: toFixed },
      { accountType: "member", accountId: userId, userId, groupId: user.groupId, delta: toMember },
      { accountType: "external", accountId: "external", delta: -amt },
    ],
  });
}

// 项目结算：待结算池 → 付成本（销毁）→ 利润转固定池
export async function settleProject({ revenue, cost, reason, detail = "", operatorId }) {
  const rev = Math.abs(assertDelta(revenue, "项目收入"));
  const cst = Math.abs(assertDelta(cost, "项目成本"));
  if (cst > rev) throw new Error("成本不能超过收入。");
  const profit = rev - cst;

  return createMeritOperation({
    type: "project_settle",
    reason,
    detail: `${detail} — 收入 ${rev}，成本 ${cst}，利润 ${profit}`.slice(0, 500),
    operatorId,
    metadata: { revenue: rev, cost: cst, profit },
    entries: [
      { accountType: "pool", accountId: SETTLEMENT_POOL.id, poolId: SETTLEMENT_POOL.id, delta: -(rev - cst) },
      ...(cst > 0 ? [{ accountType: "external", accountId: "external", delta: cst }] : []),
      ...(profit > 0 ? [{ accountType: "pool", accountId: FIXED_POOL.id, poolId: FIXED_POOL.id, delta: profit }] : []),
    ],
  });
}

// 填充奖励池：从固定池划拨到奖励池
export async function fillRewardPool({ amount, reason, detail = "", operatorId }) {
  const amt = Math.abs(assertDelta(amount, "奖励池填充金额"));
  return createMeritOperation({
    type: "reward_fill",
    reason, detail, operatorId,
    metadata: { amount: amt },
    entries: [
      { accountType: "pool", accountId: FIXED_POOL.id, poolId: FIXED_POOL.id, delta: -amt },
      { accountType: "pool", accountId: REWARD_POOL.id, poolId: REWARD_POOL.id, delta: amt },
    ],
  });
}

// 发放奖励：从奖励池发给社员
export async function distributeReward({ userId, amount, reason, detail = "", operatorId }) {
  const user = await getUserById(userId);
  if (!user) throw new Error("社员不存在。");
  const amt = Math.abs(assertDelta(amount, "奖励金额"));
  return createMeritOperation({
    type: "reward_distribute",
    reason, detail, operatorId,
    metadata: { userId, amount: amt },
    entries: [
      { accountType: "pool", accountId: REWARD_POOL.id, poolId: REWARD_POOL.id, delta: -amt },
      { accountType: "member", accountId: userId, userId, groupId: user.groupId, delta: amt },
    ],
  });
}

// 注销退款：销毁个人功勋，取消激活账户
export async function refundAndDeactivate({ userId, operatorId }) {
  const users = await loadCollection(KEY_USERS);
  const user = users[userId];
  if (!user) throw new Error("社员不存在。");
  if (!user.active) throw new Error("该社员已被注销。");
  if (!["member", "planner"].includes(user.role)) throw new Error("仅社员可注销退款。");

  // Calculate total balance
  const allEntries = await listLedgerEntries({ accountType: "member", accountId: userId, limit: 1000 });
  const balance = allEntries.reduce((sum, e) => sum + e.delta, 0);
  if (balance <= 0) throw new Error("账户余额为零或负，无需退款。");

  const entries = await createMeritOperation({
    type: "refund",
    reason: "社员注销全额退款",
    detail: `${user.displayName}（${user.username}）注销，退款 ${balance} 功勋`,
    operatorId,
    metadata: { userId, refundAmount: balance },
    entries: [
      { accountType: "member", accountId: userId, userId, groupId: user.groupId, delta: -balance },
      { accountType: "external", accountId: "external", delta: balance },
    ],
  });

  user.active = false;
  user.updatedAt = now();
  await saveCollection(KEY_USERS, users);

  return { entries, user: publicUser(user), refundAmount: balance };
}

export async function listLedgerEntries({
  limit = 500,
  accountType,
  accountId,
  userId,
  poolId,
} = {}) {
  const ledger = await loadCollection(KEY_LEDGER);
  const selected = Object.values(ledger)
    .filter((e) => !accountType || e.accountType === accountType)
    .filter((e) => !accountId || e.accountId === accountId)
    .filter((e) => !userId || e.userId === userId)
    .filter((e) => !poolId || e.poolId === poolId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, Math.min(Number(limit) || 500, 1000));
  return enrichLedgerEntries(selected);
}

export async function enrichLedgerEntries(entries) {
  const users = await listUsers();
  const userMap = new Map(users.map((u) => [u.id, u]));
  const groupMap = new Map(GROUPS.map((g) => [g.id, g]));
  const opMap = new Map(users.map((u) => [u.id, u.displayName]));

  return entries.map((entry) => ({
    ...entry,
    userDisplayName: entry.userId
      ? userMap.get(entry.userId)?.displayName || "未知社员"
      : null,
    username: entry.userId ? userMap.get(entry.userId)?.username || "" : null,
    groupName: entry.groupId
      ? groupMap.get(entry.groupId)?.name || "未分组"
      : null,
    poolName: entry.poolId === SHARED_POOL.id ? SHARED_POOL.name : null,
    accountName:
      entry.accountType === "member"
        ? userMap.get(entry.accountId)?.displayName || "未知社员"
        : entry.accountType === "pool"
          ? SHARED_POOL.name
          : "外部校准",
    operatorDisplayName: opMap.get(entry.operatorId) || "系统",
  }));
}

// ---- leaderboard ----

export async function getLeaderboard() {
  const [users, entries] = await Promise.all([
    listUsers(),
    listLedgerEntries({ accountType: "member", limit: 1000 }),
  ]);
  const totals = new Map();
  for (const e of entries)
    totals.set(e.accountId, (totals.get(e.accountId) || 0) + e.delta);

  const members = users
    .filter((u) => ["member", "planner"].includes(u.role))
    .map((u) => ({
      ...u,
      groupName: GROUPS.find((g) => g.id === u.groupId)?.name || "未分组",
      total: totals.get(u.id) || 0,
    }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        (a.displayName || "").localeCompare(b.displayName || "", "zh-CN"),
    );

  const groups = GROUPS.map((group) => {
    const gm = members.filter((m) => m.groupId === group.id);
    return {
      ...group,
      memberCount: gm.length,
      total: gm.reduce((s, m) => s + m.total, 0),
    };
  });

  const poolEntries = await listLedgerEntries({ accountType: "pool", limit: 1000 });
  const fixedTotal = poolEntries.filter(e => e.poolId === FIXED_POOL.id).reduce((s, e) => s + e.delta, 0);
  const settlementTotal = poolEntries.filter(e => e.poolId === SETTLEMENT_POOL.id).reduce((s, e) => s + e.delta, 0);
  const rewardTotal = poolEntries.filter(e => e.poolId === REWARD_POOL.id).reduce((s, e) => s + e.delta, 0);

  return {
    groups, members,
    fixedPool: { ...FIXED_POOL, total: fixedTotal },
    settlementPool: { ...SETTLEMENT_POOL, total: settlementTotal },
    rewardPool: { ...REWARD_POOL, total: rewardTotal },
    sharedPool: { ...SHARED_POOL, total: fixedTotal },
  };
}

// ---- statistics ----

export async function recalculateStatistics({ operatorId }) {
  const ledger = await loadCollection(KEY_LEDGER);
  const operations = await loadCollection(KEY_OPERATIONS);
  const entries = Object.values(ledger);
  const ops = Object.values(operations);

  const byOp = new Map();
  const accountTotals = new Map();
  for (const e of entries) {
    if (!byOp.has(e.operationId)) byOp.set(e.operationId, []);
    byOp.get(e.operationId).push(e);
    accountTotals.set(
      `${e.accountType}:${e.accountId}`,
      (accountTotals.get(`${e.accountType}:${e.accountId}`) || 0) + e.delta,
    );
  }

  const opMap = new Map(ops.map((o) => [o.id, o]));
  const opChecks = [...byOp.entries()].map(([oid, oentries]) => {
    const s = oentries.reduce((t, e) => t + e.delta, 0);
    const op = opMap.get(oid);
    return {
      operationId: oid,
      type: op?.type || "unknown",
      reason: op?.reason || oentries[0]?.reason || "",
      createdAt: op?.createdAt || oentries[0]?.createdAt || null,
      entryCount: oentries.length,
      sum: s,
      balanced: s === 0,
    };
  });

  const accounts = [...accountTotals.entries()].map(([key, total]) => {
    const [accountType, accountId] = key.split(":");
    return { accountType, accountId, total };
  });

  const snapshot = {
    id: makeId("stats"),
    updatedAt: now(),
    updatedBy: operatorId,
    entryCount: entries.length,
    operationCount: opChecks.length,
    balancedOperationCount: opChecks.filter((c) => c.balanced).length,
    unbalancedOperationCount: opChecks.filter((c) => !c.balanced).length,
    isBalanced: opChecks.every((c) => c.balanced),
    sharedPoolTotal: accountTotals.get(`pool:${SHARED_POOL.id}`) || 0,
    memberTotal: accounts
      .filter((a) => a.accountType === "member")
      .reduce((s, a) => s + a.total, 0),
    externalTotal: accountTotals.get("external:external") || 0,
    accounts,
    operationChecks: opChecks.sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    ),
  };

  await saveCollection(KEY_STATS, snapshot);
  return snapshot;
}

export async function getStatistics() {
  const stats = await loadCollection(KEY_STATS);
  return Object.keys(stats).length > 0 ? stats : null;
}

export async function assertCanView(user, viewId) {
  const settings = await getSettings();
  if (!canView(user, viewId, settings)) {
    throw new Error("无权查看该内容。");
  }
  return settings;
}

export function roleRank(role) {
  return ROLE_RANK[role] ?? 0;
}
