import { Alert, Box, Button, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';
import { roleLabels } from '../../utils/format.js';

const ALL_ROLES = ['public', 'member', 'planner'];

export function PermissionsPanel({ settings, viewDefinitions, onChanged, onError }) {
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft({
      visibility: settings?.visibility || {},
      sidebarUsers: settings?.sidebarUsers || { enabled: true, minRole: 'member', maxUsers: 10, sortBy: 'lastSeen' },
    });
  }, [settings]);

  async function save() {
    setBusy(true);
    try {
      const payload = await api.updateSettings(draft);
      await onChanged('权限范围已更新。', { settings: payload.settings });
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  function setVisibility(viewId, role) {
    setDraft(prev => ({ ...prev, visibility: { ...prev.visibility, [viewId]: role } }));
  }

  return (
    <Surface sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={800}>权限台</Typography>
        <Alert severity="info">点击单元格设置该功能的最低可见角色。某一角色可访问时，所有更高角色自动继承访问权。</Alert>

        <Typography variant="subtitle1" fontWeight={700}>页面可见范围</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>功能</TableCell>
                {ALL_ROLES.map(role => (
                  <TableCell key={role} align="center">{roleLabels[role]}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(viewDefinitions || {}).map(([viewId, def]) => {
                const current = draft.visibility?.[viewId] || def.allowedRoles?.[0] || 'member';
                const options = def.allowedRoles || ALL_ROLES;
                return (
                  <TableRow key={viewId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{def.label}</TableCell>
                    {ALL_ROLES.map(role => {
                      const allowed = options.includes(role);
                      const selected = allowed && current === role;
                      const enabled = allowed && role !== current;
                      return (
                        <TableCell
                          key={role}
                          align="center"
                          onClick={() => enabled && setVisibility(viewId, role)}
                          sx={{
                            cursor: enabled ? 'pointer' : 'default',
                            bgcolor: selected ? 'primary.main' : 'transparent',
                            color: selected ? '#fff' : enabled ? 'text.primary' : 'text.disabled',
                            borderRadius: 1,
                            fontWeight: selected ? 700 : 400,
                            transition: 'background-color 0.15s',
                            '&:hover': enabled ? { bgcolor: selected ? 'primary.dark' : 'primary.light', color: selected ? '#fff' : 'text.primary' } : {},
                          }}
                        >
                          {selected ? '✓' : allowed ? '—' : '✕'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 2 }}>侧边栏在线用户</Typography>
        <FormControlLabel
          control={<Switch checked={draft.sidebarUsers?.enabled ?? true} onChange={(e) => setDraft(n => ({ ...n, sidebarUsers: { ...n.sidebarUsers, enabled: e.target.checked } }))} />}
          label="在侧边栏底部显示在线用户"
        />
        <FormControl fullWidth>
          <InputLabel>可见角色</InputLabel>
          <Select label="可见角色" value={draft.sidebarUsers?.minRole || 'member'} onChange={(e) => setDraft(n => ({ ...n, sidebarUsers: { ...n.sidebarUsers, minRole: e.target.value } }))}>
            {Object.entries(roleLabels).map(([role, label]) => <MenuItem value={role} key={role}>{label}</MenuItem>)}
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

        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy}>保存权限</Button>
      </Stack>
    </Surface>
  );
}
