import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Stack, Tab, Tabs, Typography,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { MeritPanel } from './MeritPanel.jsx';
import { InvitesPanel } from './InvitesPanel.jsx';
import { PermissionsPanel } from './PermissionsPanel.jsx';
import { SidebarPanel } from './SidebarPanel.jsx';
import { UsersPanel } from './UsersPanel.jsx';

function TabLoader({ loading, error, children }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  return children;
}

export function AdminPage({ groups, appState, onChanged, onError }) {
  const [tab, setTab] = useState(0);
  const [maintenance, setMaintenance] = useState(appState.maintenance || false);
  const [maintenanceDialog, setMaintenanceDialog] = useState(false);

  // Per-dataset loading states
  const [settings, setSettings] = useState(null);
  const [viewDefinitions, setViewDefinitions] = useState(null);
  const [users, setUsers] = useState(null);
  const [invites, setInvites] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [errorSettings, setErrorSettings] = useState('');
  const [errorUsers, setErrorUsers] = useState('');
  const [errorInvites, setErrorInvites] = useState('');

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    setErrorSettings('');
    try {
      const data = await api.adminSettings();
      setSettings(data.settings);
      setViewDefinitions(data.viewDefinitions);
    } catch (e) { setErrorSettings(e.message); }
    finally { setLoadingSettings(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setErrorUsers('');
    try {
      const data = await api.adminUsers();
      setUsers(data.users || []);
    } catch (e) { setErrorUsers(e.message); }
    finally { setLoadingUsers(false); }
  }, []);

  const loadInvites = useCallback(async () => {
    setLoadingInvites(true);
    setErrorInvites('');
    try {
      const data = await api.adminInvites();
      setInvites(data.invites || []);
    } catch (e) { setErrorInvites(e.message); }
    finally { setLoadingInvites(false); }
  }, []);

  // Load dataset on first access
  useEffect(() => {
    if (tab === 0 && settings === null && !loadingSettings) loadSettings();
  }, [tab, settings, loadingSettings, loadSettings]);

  useEffect(() => {
    if ((tab === 1 || tab === 3) && users === null && !loadingUsers) loadUsers();
  }, [tab, users, loadingUsers, loadUsers]);

  useEffect(() => {
    if (tab === 2 && invites === null && !loadingInvites) loadInvites();
  }, [tab, invites, loadingInvites, loadInvites]);

  async function toggleMaintenance() {
    setMaintenanceDialog(false);
    try {
      const payload = await api.setMaintenanceStatus(!maintenance);
      setMaintenance(payload.maintenance);
      await onChanged(payload.maintenance ? '维护模式已开启。' : '维护模式已关闭。');
    } catch (error) {
      onError(error.message);
    }
  }

  async function changed(message, patch = {}) {
    if (patch.settings) setSettings(patch.settings);
    if (patch._reload === 'invites' && invites !== null) loadInvites();
    else if (patch._reload === 'users' && users !== null) loadUsers();
    else if (!patch.settings) {
      if (users !== null) loadUsers();
      if (invites !== null) loadInvites();
    }
    await onChanged(message);
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" color="primary.main" fontWeight={800}>
            管理员权限台
          </Typography>
          <Typography color="text.secondary">权限范围、批量流水、邀请码、统计和平账检查集中在这里。</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<WarningIcon />}
          onClick={() => setMaintenanceDialog(true)}
          sx={{
            bgcolor: maintenance ? 'error.main' : '#c62828',
            color: '#fff',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: maintenance ? '#b71c1c' : '#b71c1c' },
          }}
        >
          {maintenance ? '关闭维护模式' : '维护锁定'}
        </Button>
      </Box>

      <Dialog open={maintenanceDialog} onClose={() => setMaintenanceDialog(false)}>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 800 }}>
          {maintenance ? '关闭维护模式' : '开启维护锁定'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText style={{ whiteSpace: 'pre-wrap' }}>
            {maintenance
              ? '确认关闭维护锁定？系统将恢复正常访问。'
              : '确认开启维护锁定？此操作将：\n\n• 强制退出所有非管理员用户\n• 锁定除登录和管理后台外的所有页面\n• 非管理员的所有 API 请求将被拒绝\n\n此状态将持续到管理员手动关闭。'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMaintenanceDialog(false)}>取消</Button>
          <Button onClick={toggleMaintenance} variant="contained" color="error">
            确认{maintenance ? '关闭' : '开启'}
          </Button>
        </DialogActions>
      </Dialog>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable">
        <Tab label="权限" />
        <Tab label="功勋操作" />
        <Tab label="邀请码" />
        <Tab label="成员" />
        <Tab label="侧边栏" />
      </Tabs>

      {tab === 0 && (
        <TabLoader loading={loadingSettings} error={errorSettings}>
          {settings && (
            <PermissionsPanel
              settings={settings}
              viewDefinitions={viewDefinitions || appState.viewDefinitions}
              onChanged={changed}
              onError={onError}
            />
          )}
        </TabLoader>
      )}

      {tab === 1 && (
        <TabLoader loading={loadingUsers} error={errorUsers}>
          {users && <MeritPanel users={users} onChanged={changed} onError={onError} />}
        </TabLoader>
      )}

      {tab === 2 && (
        <TabLoader loading={loadingInvites} error={errorInvites}>
          {invites && (
            <InvitesPanel groups={groups} invites={invites} onChanged={changed} onError={onError} />
          )}
        </TabLoader>
      )}

      {tab === 3 && (
        <TabLoader loading={loadingUsers} error={errorUsers}>
          {users && (
            <UsersPanel
              groups={groups}
              users={users}
              currentUserId={appState.user?.id}
              onChanged={changed}
              onError={onError}
            />
          )}
        </TabLoader>
      )}

      {tab === 4 && (
        <TabLoader loading={loadingSettings} error={errorSettings}>
          {settings && (
            <SidebarPanel settings={settings} onChanged={changed} onError={onError} />
          )}
        </TabLoader>
      )}
    </Stack>
  );
}
