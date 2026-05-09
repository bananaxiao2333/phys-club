import { Alert, Button, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, Switch, TextField, Typography } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';
import { roleLabels } from '../../utils/format.js';

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
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={800}>权限台</Typography>
        <Alert severity="info">
          总览和成员页可以设为公开。个人明细不开放公开权限，管理员始终可见全部内容。
        </Alert>

        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>页面可见范围</Typography>
        {Object.entries(viewDefinitions || {}).map(([viewId, definition]) => {
          const options = definition.allowedRoles || ['member', 'planner'];
          return (
            <FormControl fullWidth key={viewId} disabled={options.length === 1}>
              <InputLabel>{definition.label}</InputLabel>
              <Select
                label={definition.label}
                value={draft.visibility?.[viewId] || options[0]}
                onChange={(event) => setDraft((next) => ({ ...next, visibility: { ...next.visibility, [viewId]: event.target.value } }))}
              >
                {options.map((role) => (
                  <MenuItem value={role} key={role}>{roleLabels[role]}</MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        })}

        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 2 }}>侧边栏在线用户</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={draft.sidebarUsers?.enabled ?? true}
              onChange={(e) => setDraft((next) => ({ ...next, sidebarUsers: { ...next.sidebarUsers, enabled: e.target.checked } }))}
            />
          }
          label="在侧边栏底部显示在线用户"
        />
        <FormControl fullWidth>
          <InputLabel>可见角色</InputLabel>
          <Select
            label="可见角色"
            value={draft.sidebarUsers?.minRole || 'member'}
            onChange={(e) => setDraft((next) => ({ ...next, sidebarUsers: { ...next.sidebarUsers, minRole: e.target.value } }))}
          >
            {Object.entries(roleLabels).map(([role, label]) => (
              <MenuItem value={role} key={role}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="显示人数上限"
          type="number"
          value={draft.sidebarUsers?.maxUsers ?? 10}
          onChange={(e) => setDraft((next) => ({ ...next, sidebarUsers: { ...next.sidebarUsers, maxUsers: Math.max(1, Math.min(50, Number(e.target.value) || 10)) } }))}
          inputProps={{ min: 1, max: 50 }}
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>排序方式</InputLabel>
          <Select
            label="排序方式"
            value={draft.sidebarUsers?.sortBy || 'lastSeen'}
            onChange={(e) => setDraft((next) => ({ ...next, sidebarUsers: { ...next.sidebarUsers, sortBy: e.target.value } }))}
          >
            <MenuItem value="lastSeen">按最近活跃</MenuItem>
            <MenuItem value="name">按姓名排序</MenuItem>
          </Select>
        </FormControl>

        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy}>
          保存权限
        </Button>
      </Stack>
    </Surface>
  );
}
