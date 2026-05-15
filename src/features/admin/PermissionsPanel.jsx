import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';

const BASE_IDS = ['public', 'member'];

// All non-public/non-member roles inherit member's permissions.
// public → freely editable
// member → inherits from public; freely editable otherwise
// custom roles → inherit from member; freely editable otherwise

export function PermissionsPanel({ settings, viewDefinitions, onChanged, onError }) {
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [extraRoles, setExtraRoles] = useState([]);
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ id: '', name: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const allRoleIds = [...BASE_IDS, ...extraRoles.map(r => r.id)];

  useEffect(() => {
    if (!settings) return;
    const er = settings.customRoles || [];
    setExtraRoles(er);
    // Use freshly-built role list, NOT the stale allRoleIds from previous render
    const roleIds = [...BASE_IDS, ...er.map(r => r.id)];
    const vis = settings.visibility || {};
    const norm = {};
    for (const [viewId, def] of Object.entries(viewDefinitions || {})) {
      norm[viewId] = {};
      const val = vis[viewId];
      for (const rid of roleIds) {
        if (val && typeof val === 'object') norm[viewId][rid] = val[rid] ?? false;
        else if (typeof val === 'string') norm[viewId][rid] = (def.allowedRoles || []).includes(rid);
        else norm[viewId][rid] = (def.allowedRoles || []).includes(rid);
      }
    }
    setDraft({
      visibility: norm,
      sidebarUsers: settings.sidebarUsers || { enabled: true, minRole: 'member', maxUsers: 10, sortBy: 'lastSeen' },
    });
  }, [settings, viewDefinitions]);

  function toggleRole(viewId, roleId) {
    setDraft(prev => {
      const vis = { ...prev.visibility };
      const view = { ...(vis[viewId] || {}) };
      const newVal = !view[roleId];
      view[roleId] = newVal;

      // public ON → member ON; member OFF → public OFF
      if (roleId === 'public' && newVal) view['member'] = true;
      if (roleId === 'member' && !newVal) view['public'] = false;

      // member ON → all extra roles ON; member OFF → all extra roles OFF
      if (roleId === 'member') {
        for (const rid of allRoleIds) {
          if (!BASE_IDS.includes(rid)) view[rid] = newVal;
        }
      }

      vis[viewId] = view;
      return { ...prev, visibility: vis };
    });
  }

  function checkInherited(viewId, roleId) {
    const view = draft.visibility?.[viewId] || {};
    if (view[roleId]) return true;
    if (roleId === 'member' && view['public']) return true;
    if (!BASE_IDS.includes(roleId) && view['member']) return true;
    return false;
  }

  function checkLocked(viewId, roleId) {
    const view = draft.visibility?.[viewId] || {};
    // member locked when public has it
    if (roleId === 'member' && view['public']) return true;
    // extra roles locked when member has it
    if (!BASE_IDS.includes(roleId) && view['member']) return true;
    return false;
  }

  async function save() {
    // Expand the draft: inherited permissions must be explicitly set to true
    // so the backend stores them correctly.
    const expanded = {};
    for (const viewId of Object.keys(draft.visibility || {})) {
      expanded[viewId] = {};
      for (const rid of allRoleIds) {
        expanded[viewId][rid] = checkInherited(viewId, rid);
      }
    }
    setBusy(true);
    try {
      const payload = await api.updateSettings({ visibility: expanded, customRoles: extraRoles, sidebarUsers: draft.sidebarUsers });
      await onChanged('权限范围已更新。', { settings: payload.settings });
    } catch (e) { onError(e.message); }
    finally { setBusy(false); }
  }

  function addExtraRole() {
    if (!newRoleForm.id || !newRoleForm.name) return;
    setExtraRoles(prev => [...prev, { id: newRoleForm.id, name: newRoleForm.name }]);
    setNewRoleOpen(false);
    setNewRoleForm({ id: '', name: '' });
  }

  function deleteExtraRole(roleId) {
    setExtraRoles(prev => prev.filter(r => r.id !== roleId));
    setDraft(prev => {
      const vis = { ...prev.visibility };
      for (const viewId of Object.keys(vis)) { const v = { ...vis[viewId] }; delete v[roleId]; vis[viewId] = v; }
      return { ...prev, visibility: vis };
    });
    setDeleteTarget(null);
  }

  function roleLabel(id) {
    if (id === 'public') return '公开';
    if (id === 'member') return '社员';
    const found = extraRoles.find(r => r.id === id);
    return found ? found.name : id;
  }

  return (
    <Stack spacing={2}>
      <Surface sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>权限台</Typography>
          <Alert severity="info">社员继承公开的权限。更高权限组继承社员的权限。管理员始终可见全部。</Alert>

          <Typography variant="subtitle1" fontWeight={700}>页面可见范围</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>功能</TableCell>
                  {allRoleIds.map(rid => <TableCell key={rid} align="center">{roleLabel(rid)}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(viewDefinitions || {}).map(([viewId, def]) => (
                  <TableRow key={viewId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{def.label}</TableCell>
                    {allRoleIds.map(rid => {
                      const inherited = checkInherited(viewId, rid);
                      const locked = checkLocked(viewId, rid);
                      return (
                        <TableCell key={rid} align="center">
                          {locked ? (
                            <Typography variant="caption" color="text.secondary">{inherited ? '继承' : '—'}</Typography>
                          ) : (
                            <Checkbox size="small" checked={inherited} onChange={() => toggleRole(viewId, rid)} />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>权限组</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {allRoleIds.map(rid => (
              <Box key={rid} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover', borderRadius: 2, px: 1.5, py: 0.75 }}>
                <Typography variant="body2" fontWeight={600}>{roleLabel(rid)}</Typography>
                {!BASE_IDS.includes(rid) && (
                  <IconButton size="small" onClick={() => setDeleteTarget(rid)}><DeleteIcon fontSize="inherit" /></IconButton>
                )}
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => setNewRoleOpen(true)} sx={{ borderRadius: 2 }}>新增</Button>
          </Stack>

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>侧边栏在线用户</Typography>
          <FormControlLabel
            control={<Switch checked={draft.sidebarUsers?.enabled ?? true} onChange={e => setDraft(n => ({ ...n, sidebarUsers: { ...n.sidebarUsers, enabled: e.target.checked } }))} />}
            label="在侧边栏底部显示在线用户"
          />
          <FormControl fullWidth>
            <InputLabel>可见角色</InputLabel>
            <Select label="可见角色" value={draft.sidebarUsers?.minRole || 'member'}
              onChange={e => setDraft(n => ({ ...n, sidebarUsers: { ...n.sidebarUsers, minRole: e.target.value } }))}>
              {allRoleIds.map(rid => <MenuItem value={rid} key={rid}>{roleLabel(rid)}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="显示人数上限" type="number" value={draft.sidebarUsers?.maxUsers ?? 10}
            onChange={e => setDraft(n => ({ ...n, sidebarUsers: { ...n.sidebarUsers, maxUsers: Math.max(1, Math.min(50, Number(e.target.value) || 10)) } }))}
            inputProps={{ min: 1, max: 50 }} fullWidth />
          <FormControl fullWidth>
            <InputLabel>排序方式</InputLabel>
            <Select label="排序方式" value={draft.sidebarUsers?.sortBy || 'lastSeen'}
              onChange={e => setDraft(n => ({ ...n, sidebarUsers: { ...n.sidebarUsers, sortBy: e.target.value } }))}>
              <MenuItem value="lastSeen">按最近活跃</MenuItem>
              <MenuItem value="name">按姓名排序</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Surface>

      <Surface sx={{ p: 2 }}>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy}>保存权限</Button>
      </Surface>

      <Dialog open={newRoleOpen} onClose={() => setNewRoleOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>新增权限组</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="ID（英文）" value={newRoleForm.id} onChange={e => setNewRoleForm(f => ({ ...f, id: e.target.value }))} required fullWidth />
            <TextField label="名称" value={newRoleForm.name} onChange={e => setNewRoleForm(f => ({ ...f, name: e.target.value }))} required fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRoleOpen(false)}>取消</Button>
          <Button onClick={addExtraRole} variant="contained" disabled={!newRoleForm.id || !newRoleForm.name}>创建</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>删除权限组</DialogTitle>
        <DialogContent><Typography>确认删除 "{roleLabel(deleteTarget)}"？</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button onClick={() => deleteExtraRole(deleteTarget)} variant="contained" color="error">确认删除</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
