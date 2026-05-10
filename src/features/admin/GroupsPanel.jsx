import { Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';

const PRESET_COLORS = ['#b00020','#3526a7','#8a7b00','#7b008f','#1565c0','#e65100','#2e7d32','#c62828','#00695c','#4a148c'];

export function GroupsPanel({ users, onChanged, onError }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', alias: '', color: PRESET_COLORS[0] });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  const [busy, setBusy] = useState(false);

  async function load() { setLoading(true); try { const d = await api.adminGroups(); setGroups(d.groups || []); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);

  function openNew() { setForm({ id: '', name: '', alias: '', color: PRESET_COLORS[0] }); setEditOpen(true); }
  function openEdit(g) { setForm({ id: g.id, name: g.name, alias: g.alias, color: g.color }); setEditOpen(true); }

  async function save() {
    setBusy(true);
    try {
      if (form.id) await api.updateGroup(form.id, form);
      else await api.createGroup(form);
      setEditOpen(false);
      await load();
      await onChanged('组已保存。');
    } catch (e) { onError(e.message); }
    finally { setBusy(false); }
  }

  function startDelete(g) {
    setDeleteTarget(g);
    setDeleteCountdown(10);
  }

  useEffect(() => {
    if (deleteCountdown <= 0) return;
    const t = setTimeout(() => setDeleteCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [deleteCountdown]);

  async function confirmDelete() {
    if (deleteCountdown > 0) return;
    setBusy(true);
    try {
      await api.deleteGroup(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      await onChanged(`组"${deleteTarget.name}"已解散，成员已退回无组状态。`);
    } catch (e) { onError(e.message); }
    finally { setBusy(false); }
  }

  const membersInGroup = (gid) => users.filter(u => u.groupId === gid).length;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Stack spacing={2}>
      <Surface sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={800}>社团组管理</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>新增组</Button>
        </Stack>
        <Stack spacing={1}>
          {groups.map(g => (
            <Stack key={g.id} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: g.color, flexShrink: 0, border: '2px solid', borderColor: g.color }} />
              <Typography fontWeight={700} sx={{ minWidth: 60 }}>{g.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>{g.alias}</Typography>
              <Chip size="small" label={`${membersInGroup(g.id)}人`} variant="outlined" />
              <Box sx={{ flex: 1 }} />
              <IconButton size="small" onClick={() => openEdit(g)}><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => startDelete(g)}><DeleteIcon fontSize="small" /></IconButton>
            </Stack>
          ))}
        </Stack>
      </Surface>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{form.id ? '编辑组' : '新增组'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="组名" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required fullWidth />
            <TextField label="英文别名" value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value.toUpperCase() }))} fullWidth />
            <Typography variant="body2" color="text.secondary">边框颜色</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {PRESET_COLORS.map(c => (
                <Box key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: c, cursor: 'pointer', border: form.color === c ? '3px solid' : '2px solid', borderColor: form.color === c ? 'text.primary' : 'transparent' }} />
              ))}
            </Stack>
            <TextField label="自定义颜色" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="#rrggbb" fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button onClick={save} variant="contained" disabled={busy}>保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ color: 'error.main' }}>解散组：{deleteTarget?.name}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            该组当前成员将自动退回无组状态（角色保持不变）。此操作不可撤销。
          </DialogContentText>
          {deleteTarget && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.100', borderRadius: 1, maxHeight: 160, overflow: 'auto' }}>
              <Typography variant="caption" color="text.secondary">当前成员：</Typography>
              {users.filter(u => u.groupId === deleteTarget.id).map(u => (
                <Typography key={u.id} variant="body2">{u.displayName} (@{u.username})</Typography>
              ))}
              {users.filter(u => u.groupId === deleteTarget.id).length === 0 && <Typography variant="body2" color="text.secondary">无成员</Typography>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button onClick={confirmDelete} variant="contained" color="error" disabled={deleteCountdown > 0 || busy}>
            {deleteCountdown > 0 ? `确认解散（${deleteCountdown}s）` : '确认解散'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
