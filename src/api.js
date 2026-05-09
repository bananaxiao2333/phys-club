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

async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

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
  getEmergencyStatus: () => request('/api/admin/emergency'),
  setEmergencyStatus: (active) => request('/api/admin/emergency', { method: 'POST', body: { active } }),
};
