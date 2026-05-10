let token = localStorage.getItem('physics_points_token') || '';

export function getToken() {
  return token;
}

export function setToken(nextToken) {
  token = nextToken || '';
  if (token) {
    localStorage.setItem('physics_points_token', token);
  } else {
    localStorage.removeItem('physics_points_token');
  }
}

// ---- global loading state ----

let loadingCount = 0;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(loadingCount > 0));
}

export function onApiLoadingChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  loadingCount++;
  notify();

  try {
    const response = await fetch(path, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || '请求失败');
    }
    return payload;
  } finally {
    loadingCount--;
    notify();
  }
}

export const api = {
  app: () => request('/api/app'),
  groups: () => request('/api/groups'),
  leaderboard: () => request('/api/leaderboard'),
  myLedger: () => request('/api/ledger/me?limit=300'),
  allLedger: () => request('/api/ledger/all?limit=800'),
  statistics: () => request('/api/statistics'),
  me: () => request('/api/auth/me'),
  updateProfile: (body) => request('/api/auth/profile', { method: 'PATCH', body }),
  login: (body) => request('/api/auth/login', { method: 'POST', body }),
  register: (body) => request('/api/auth/register', { method: 'POST', body }),
  changePassword: (body) => request('/api/auth/password', { method: 'POST', body }),
  adminUsers: () => request('/api/admin/users'),
  adminInvites: () => request('/api/admin/invites'),
  adminSettings: () => request('/api/admin/settings'),
  updateSettings: (body) => request('/api/admin/settings', { method: 'PUT', body }),
  createInvite: (body) => request('/api/admin/invites', { method: 'POST', body }),
  toggleInviteActive: (code, active) => request('/api/admin/invites', { method: 'PATCH', body: { code, active } }),
  adjustMember: (body) => request('/api/admin/ledger/member-adjust', { method: 'POST', body }),
  batchAdjustMembers: (body) => request('/api/admin/ledger/batch-member-adjust', { method: 'POST', body }),
  adjustSharedPool: (body) => request('/api/admin/ledger/pool-adjust', { method: 'POST', body }),
  recalculateStatistics: () => request('/api/admin/statistics/recalculate', { method: 'POST' }),
  updateUser: (id, body) => request(`/api/admin/users/${id}`, { method: 'PATCH', body }),
  getMaintenanceStatus: () => request('/api/admin/maintenance'),
  setMaintenanceStatus: (active) => request('/api/admin/maintenance', { method: 'POST', body: { active } }),
  // 功勋操作
  castMerit: (body) => request('/api/admin/ledger/cast', { method: 'POST', body }),
  destroyMerit: (body) => request('/api/admin/ledger/destroy', { method: 'POST', body }),
  transferMerit: (body) => request('/api/admin/ledger/transfer', { method: 'POST', body }),
  allocateDues: (body) => request('/api/admin/dues', { method: 'POST', body }),
  settleProject: (body) => request('/api/admin/settlement', { method: 'POST', body }),
  fillReward: (body) => request('/api/admin/reward/fill', { method: 'POST', body }),
  distributeReward: (body) => request('/api/admin/reward/distribute', { method: 'POST', body }),
  refundMember: (body) => request('/api/admin/refund', { method: 'POST', body }),
  adminGroups: () => request('/api/admin/groups'),
  createGroup: (body) => request('/api/admin/groups', { method: 'POST', body }),
  updateGroup: (id, body) => request('/api/admin/groups', { method: 'PATCH', body: { id, ...body } }),
  deleteGroup: (id) => request(`/api/admin/groups?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  batchUpdateGroup: (body) => request('/api/admin/users', { method: 'PATCH', body: { action: 'batchGroup', ...body } }),
  forcePassword: (body) => request('/api/admin/users', { method: 'PATCH', body: { action: 'forcePassword', ...body } }),
};
