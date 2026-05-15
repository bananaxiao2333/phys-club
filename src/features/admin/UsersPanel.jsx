import { Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { DeleteForever as DeleteIcon, LockReset as PasswordIcon, Save as SaveIcon } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';
import { roleLabel, roleLabels } from '../../utils/format.js';

function isAdminRole(r) { return r === 'admin'; }
function canHavePositionTitle() { return true; }

function draftFromUser(user) {
  return { displayName: user.displayName, groupId: isAdminRole(user.role) ? null : user.groupId, role: user.role, positionTitle: user.positionTitle || '', active: user.active };
}

function normalizedDraft(user, draft = {}) {
  const role = draft.role || user.role || 'member';
  return { displayName: String(draft.displayName ?? user.displayName ?? '').trim(), groupId: isAdminRole(role) ? null : draft.groupId || user.groupId || '', role, positionTitle: String(draft.positionTitle ?? user.positionTitle ?? '').trim(), active: Boolean(draft.active) };
}

function hasChanged(user, draft) {
  return JSON.stringify(normalizedDraft(user, draft)) !== JSON.stringify(draftFromUser(user));
}

export function UsersPanel({ groups, users, currentUserId, customRoles, onChanged, onError }) {
  const allRoleEntries = [...Object.entries(roleLabels), ...(customRoles || []).map(r => [r.id, r.name])];
  const editableUsers = users;
  const [drafts, setDrafts] = useState({});
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [batchGroupId, setBatchGroupId] = useState('');
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyBatch, setBusyBatch] = useState(false);

  useEffect(() => { setDrafts(Object.fromEntries(editableUsers.map(u => [u.id, draftFromUser(u)]))); }, [users]);

  const dirtyUserIds = useMemo(() => {
    if (!editableUsers.every(u => drafts[u.id])) return [];
    return editableUsers.filter(u => hasChanged(u, drafts[u.id])).map(u => u.id);
  }, [drafts, editableUsers]);

  function resetDrafts() { setDrafts(Object.fromEntries(editableUsers.map(u => [u.id, draftFromUser(u)]))); }

  async function executeSaveAll(userIds) {
    try {
      for (const uid of userIds) { const u = editableUsers.find(i => i.id === uid); if (u) await api.updateUser(uid, normalizedDraft(u, drafts[uid])); }
      await onChanged(`已保存 ${userIds.length} 个成员的修改。`, { _reload: 'users' });
    } catch (e) { onError(e.message); }
  }

  async function submitChanges() {
    const promotions = dirtyUserIds.map(uid => editableUsers.find(u => u.id === uid)).filter(u => u?.role !== 'admin' && drafts[u.id]?.role === 'admin');
    if (promotions.length) { setPendingPromotion({ userIds: dirtyUserIds, users: promotions }); return; }
    await executeSaveAll(dirtyUserIds);
  }

  async function batchGroupChange() {
    if (!batchGroupId || selected.size === 0) return;
    setBusyBatch(true);
    try {
      await api.batchUpdateGroup({ userIds: [...selected], groupId: batchGroupId });
      setSelected(new Set()); setBatchGroupId('');
      await onChanged(`已将成员移至目标组。`, { _reload: 'users' });
    } catch (e) { onError(e.message); } finally { setBusyBatch(false); }
  }

  async function submitForcePassword() {
    if (!passwordTarget || passwordForm.newPassword !== passwordForm.confirmPassword) return onError('两次密码不一致。');
    setBusyBatch(true);
    try {
      await api.forcePassword({ userId: passwordTarget.id, newPassword: passwordForm.newPassword });
      setPasswordTarget(null); setPasswordForm({ newPassword: '', confirmPassword: '' });
      await onChanged(`已强制修改密码。`);
    } catch (e) { onError(e.message); } finally { setBusyBatch(false); }
  }

  async function submitHardDelete() {
    if (!deleteTarget) return;
    setBusyBatch(true);
    try {
      await api.hardDeleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await onChanged(`已强制删除用户 ${deleteTarget.displayName}。`, { _reload: 'users' });
    } catch (e) { onError(e.message); } finally { setBusyBatch(false); }
  }

  function toggleSelect(uid) { setSelected(prev => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n; }); }

  return (
    <Stack spacing={2}>
      {selected.size > 0 && (
        <Surface sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`已选 ${selected.size} 人`} onDelete={() => setSelected(new Set())} />
          <FormControl size="small" sx={{ minWidth: 160 }}><InputLabel>目标组</InputLabel>
            <Select label="目标组" value={batchGroupId} onChange={e => setBatchGroupId(e.target.value)}>
              <MenuItem value="">— 无组 —</MenuItem>
              {groups.map(g => <MenuItem value={g.id} key={g.id}>{g.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" size="small" onClick={batchGroupChange} disabled={!batchGroupId || busyBatch}>批量改组</Button>
        </Surface>
      )}

      <Surface sx={{ p: 0, overflow: 'hidden' }}>
        <Stack sx={{ px: 2, py: 1.5 }}><Typography variant="h6" fontWeight={800}>成员管理</Typography></Stack>
        {dirtyUserIds.length > 0 && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Alert severity="warning" action={<Stack direction="row" spacing={1}><Button color="inherit" size="small" onClick={resetDrafts}>放弃</Button><Button color="warning" size="small" variant="contained" startIcon={<SaveIcon />} onClick={submitChanges}>提交</Button></Stack>}>
              有 {dirtyUserIds.length} 个成员存在未保存修改。
            </Alert>
          </Box>
        )}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"><Checkbox size="small" checked={selected.size === editableUsers.length && editableUsers.length > 0} onChange={e => setSelected(e.target.checked ? new Set(editableUsers.map(u => u.id)) : new Set())} /></TableCell>
                <TableCell>姓名</TableCell><TableCell>用户名</TableCell><TableCell>角色</TableCell>
                <TableCell>职位名称</TableCell><TableCell>组别</TableCell><TableCell>启用</TableCell><TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {editableUsers.map(user => {
                const draft = drafts[user.id] || {};
                const isSelf = user.id === currentUserId;
                return (
                  <TableRow key={user.id} hover>
                    <TableCell padding="checkbox"><Checkbox size="small" checked={selected.has(user.id)} onChange={() => toggleSelect(user.id)} /></TableCell>
                    <TableCell sx={{ minWidth: 170 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box sx={{ width: 6, height: 24, borderRadius: 1, bgcolor: user.groupId ? groups.find(g => g.id === user.groupId)?.color || 'grey.400' : 'grey.300', flexShrink: 0 }} />
                        <TextField size="small" variant="standard" value={draft.displayName || ''} onChange={e => setDrafts(prev => ({ ...prev, [user.id]: { ...draft, displayName: e.target.value } }))} InputProps={{ disableUnderline: true }} sx={{ fontWeight: 700 }} />
                      </Stack>
                    </TableCell>
                    <TableCell>@{user.username}</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <FormControl size="small" fullWidth>
                        <Select value={draft.role || user.role || 'member'} onChange={e => setDrafts(prev => ({ ...prev, [user.id]: { ...draft, role: e.target.value } }))} disabled={isSelf}>
                          {allRoleEntries.map(([value, label]) => <MenuItem value={value} key={value}>{label}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      <TextField size="small" variant="standard" placeholder="职位" value={draft.positionTitle || ''} onChange={e => setDrafts(prev => ({ ...prev, [user.id]: { ...draft, positionTitle: e.target.value } }))} InputProps={{ disableUnderline: true }} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      {isAdminRole(draft.role || user.role) ? <Typography variant="body2" color="text.secondary">—</Typography> : (
                        <FormControl size="small" fullWidth>
                          <Select value={draft.groupId || ''} onChange={e => setDrafts(prev => ({ ...prev, [user.id]: { ...draft, groupId: e.target.value } }))}>
                            <MenuItem value="">—</MenuItem>
                            {groups.map(g => <MenuItem value={g.id} key={g.id}>{g.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      )}
                    </TableCell>
                    <TableCell><Switch size="small" checked={Boolean(draft.active)} onChange={e => setDrafts(prev => ({ ...prev, [user.id]: { ...draft, active: e.target.checked } }))} disabled={isSelf} /></TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<PasswordIcon />} onClick={() => { setPasswordTarget(user); setPasswordForm({ newPassword: '', confirmPassword: '' }); }}>改密</Button>
                      {!isSelf && user.role !== 'admin' && (
                        <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteTarget(user)}>删除</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Surface>

      <Dialog open={!!pendingPromotion} onClose={() => setPendingPromotion(null)}>
        <DialogTitle>确认提升为管理员？</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">管理员可以查看和修改全部成员、邀请码、权限范围、积分流水和统计台，也可以继续提升其他账号权限。</Alert>
            <Typography>即将把 {(pendingPromotion?.users || []).map(u => u.displayName).join('、')} 提升为管理员。请确认这些都是可信账号。</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingPromotion(null)}>取消</Button>
          <Button variant="contained" color="error" startIcon={<SaveIcon />} onClick={async () => { const targets = pendingPromotion?.userIds || []; setPendingPromotion(null); if (targets.length) await executeSaveAll(targets); }}>确认提权</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!passwordTarget} onClose={() => setPasswordTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>强制改密 — {passwordTarget?.displayName}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="新密码" type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} required fullWidth />
            <TextField label="确认新密码" type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} required fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordTarget(null)}>取消</Button>
          <Button variant="contained" color="error" onClick={submitForcePassword} disabled={busyBatch}>确认修改</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle sx={{ color: 'error.main' }}>强制删除用户</DialogTitle>
        <DialogContent>
          <Typography>确认永久删除 <strong>{deleteTarget?.displayName}</strong>（@{deleteTarget?.username}）？此操作不可撤销，所有相关数据将丢失。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="contained" color="error" onClick={submitHardDelete} disabled={busyBatch}>确认删除</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
