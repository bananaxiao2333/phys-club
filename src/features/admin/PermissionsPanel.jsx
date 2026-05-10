import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';
import { roleLabels } from '../../utils/format.js';

const BUILTIN_ROLES = ['public', 'member'];
const DEFAULT_ROLES = ['public', 'member', 'planner'];

function roleRank(r) { return r === 'admin' ? 99 : r === 'planner' ? 2 : r === 'member' ? 1 : 0; }
function roleName(role, customRoles) { return roleLabels[role] || customRoles.find(r => r.id === role)?.name || role; }

export function PermissionsPanel({ settings, viewDefinitions, onChanged, onError }) {
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [customRoles, setCustomRoles] = useState([]);
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ id: '', name: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const allRoles = [...DEFAULT_ROLES, ...customRoles.map(r => r.id)];
  const initRef = useRef(false);

  useEffect(() => {
    // Only initialize once from server settings; after that, draft is managed locally
    if (initRef.current || !settings) return;
    initRef.current = true;

    const vis = settings.visibility || {};
    const normalized = {};
    for (const [viewId, def] of Object.entries(viewDefinitions || {})) {
      normalized[viewId] = {};
      const oldVal = vis[viewId];
      for (const role of allRoles) {
        if (typeof oldVal === 'string') {
          normalized[viewId][role] = role === 'admin' || roleRank(role) >= roleRank(oldVal);
        } else if (oldVal && typeof oldVal === 'object') {
          normalized[viewId][role] = oldVal[role] ?? false;
        } else {
          normalized[viewId][role] = (def.allowedRoles || []).includes(role) || role === 'admin';
        }
      }
    }
    const saved = settings.customRoles || [];
    setCustomRoles(saved);
    setDraft({
      visibility: normalized,
      sidebarUsers: settings.sidebarUsers || { enabled: true, minRole: 'member', maxUsers: 10, sortBy: 'lastSeen' },
    });
  }, [settings, viewDefinitions, allRoles]);

  function toggleRole(viewId, role) {
    if (role === 'admin') return; // admin always sees everything
    setDraft(prev => {
      const vis = { ...prev.visibility };
      const view = { ...(vis[viewId] || {}) };
      view[role] = !view[role];
      // Apply inheritance: if public is enabled, member must also be enabled
      if (role === 'public' && view[role]) view['member'] = true;
      if (role === 'member' && !view[role]) view['public'] = false;
      // Propagate to higher roles
      const all = [...allRoles];
      if (view['public']) { view['member'] = true; }
      if (view['member']) { for (const r of all) { if (roleRank(r) > 1) view[r] = true; } }
      vis[viewId] = view;
      return { ...prev, visibility: vis };
    });
  }

  function isInherited(viewId, role) {
    if (role === 'admin') return true;
    const view = draft.visibility?.[viewId] || {};
    if (view[role]) return true;
    // Check if a lower role has this enabled (inherited)
    if (role === 'member' && view['public']) return true;
    if (roleRank(role) > 1 && view['member']) return true;
    return false;
  }

  function isDirectlySet(viewId, role) {
    return draft.visibility?.[viewId]?.[role] === true;
  }

  async function save() {
    setBusy(true);
    try {
      const payload = await api.updateSettings({ visibility: draft.visibility, customRoles, sidebarUsers: draft.sidebarUsers });
      await onChanged('权限范围已更新。', { settings: payload.settings });
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  function addCustomRole() {
    if (!newRoleForm.id || !newRoleForm.name) return;
    setCustomRoles(prev => [...prev, { id: newRoleForm.id, name: newRoleForm.name, rank: prev.length + 2 }]);
    setNewRoleOpen(false);
    setNewRoleForm({ id: '', name: '' });
  }

  function deleteCustomRole(roleId) {
    setCustomRoles(prev => prev.filter(r => r.id !== roleId));
    setDeleteTarget(null);
  }

  return (
    <Stack spacing={2}>
      <Surface sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>权限台</Typography>
          <Alert severity="info">每列独立控制。社员自动继承公开的权限，更高角色自动继承社员权限。管理员始终可见全部。</Alert>

          <Typography variant="subtitle1" fontWeight={700}>页面可见范围</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>功能</TableCell>
                  {allRoles.map(role => (
                    <TableCell key={role} align="center">{roleName(role, customRoles)}</TableCell>
                  ))}
                  <TableCell align="center">管理员</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(viewDefinitions || {}).map(([viewId, def]) => (
                  <TableRow key={viewId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{def.label}</TableCell>
                    {allRoles.map(role => {
                      const view = draft.visibility?.[viewId] || {};
                      const inherited = isInherited(viewId, role);
                      // Locked if a lower role has this enabled (inheritance):
                      // member is locked when public has it; higher roles locked when member has it
                      const locked = role !== 'public' && (
                        (role === 'member' && view['public']) ||
                        (roleRank(role) > 1 && view['member'])
                      );
                      return (
                        <TableCell key={role} align="center">
                          <Checkbox
                            size="small"
                            checked={inherited}
                            disabled={locked}
                            onChange={() => toggleRole(viewId, role)}
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell align="center"><Checkbox size="small" checked disabled /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>权限组管理</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {allRoles.map(role => (
              <Box key={role} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover', borderRadius: 2, px: 1.5, py: 0.75 }}>
                <Typography variant="body2" fontWeight={600}>{roleName(role, customRoles)}</Typography>
                {!BUILTIN_ROLES.includes(role) && (
                  <IconButton size="small" onClick={() => setDeleteTarget(role)}><DeleteIcon fontSize="inherit" /></IconButton>
                )}
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => setNewRoleOpen(true)} sx={{ borderRadius: 2 }}>新增</Button>
          </Stack>

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>侧边栏在线用户</Typography>
          <FormControlLabel
            control={<Switch checked={draft.sidebarUsers?.enabled ?? true} onChange={(e) => setDraft(n => ({ ...n, sidebarUsers: { ...n.sidebarUsers, enabled: e.target.checked } }))} />}
            label="在侧边栏底部显示在线用户"
          />
          <FormControl fullWidth>
            <InputLabel>可见角色</InputLabel>
            <Select label="可见角色" value={draft.sidebarUsers?.minRole || 'member'} onChange={(e) => setDraft(n => ({ ...n, sidebarUsers: { ...n.sidebarUsers, minRole: e.target.value } }))}>
              {allRoles.map(role => <MenuItem value={role} key={role}>{roleName(role, customRoles)}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="显示人数上限" type="number" value={draft.sidebarUsers?.maxUsers ?? 10}
            onChange={(e) => setDraft(n => ({ ...n, sidebarUsers: { ...n.sidebarUsers, maxUsers: Math.max(1, Math.min(50, Number(e.target.value) || 10)) } }))}
            inputProps={{ min: 1, max: 50 }} fullWidth />
          <FormControl fullWidth>
            <InputLabel>排序方式</InputLabel>
            <Select label="排序方式" value={draft.sidebarUsers?.sortBy || 'lastSeen'} onChange={(e) => setDraft(n => ({ ...n, sidebarUsers: { ...n.sidebarUsers, sortBy: e.target.value } }))}>
              <MenuItem value="lastSeen">按最近活跃</MenuItem>
              <MenuItem value="name">按姓名排序</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Surface>

      <Surface sx={{ p: 2 }}>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy}>保存权限</Button>
      </Surface>

      {/* New role dialog */}
      <Dialog open={newRoleOpen} onClose={() => setNewRoleOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>新增权限组</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="权限组 ID（英文）" value={newRoleForm.id} onChange={e => setNewRoleForm(f => ({ ...f, id: e.target.value }))} required fullWidth helperText="如：planner、secretary" />
            <TextField label="权限组名称" value={newRoleForm.name} onChange={e => setNewRoleForm(f => ({ ...f, name: e.target.value }))} required fullWidth helperText="如：社团策划层" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRoleOpen(false)}>取消</Button>
          <Button onClick={addCustomRole} variant="contained" disabled={!newRoleForm.id || !newRoleForm.name}>创建</Button>
        </DialogActions>
      </Dialog>

      {/* Delete role confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>解散权限组</DialogTitle>
        <DialogContent>
          <Typography>确认解散权限组 "{roleName(deleteTarget, customRoles)}"？该组成员将退回到社员权限。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button onClick={() => deleteCustomRole(deleteTarget)} variant="contained" color="error">确认解散</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
