import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Stack, Tab, Tabs, Typography,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { AdjustmentsPanel } from './AdjustmentsPanel.jsx';
import { InvitesPanel } from './InvitesPanel.jsx';
import { PermissionsPanel } from './PermissionsPanel.jsx';
import { SidebarPanel } from './SidebarPanel.jsx';
import { StatisticsPanel } from './StatisticsPanel.jsx';
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
  const [emergency, setEmergency] = useState(appState.emergency || false);
  const [emergencyDialog, setEmergencyDialog] = useState(false);

  // Per-dataset loading states
  const [settings, setSettings] = useState(null);
  const [viewDefinitions, setViewDefinitions] = useState(null);
  const [users, setUsers] = useState(null);
  const [invites, setInvites] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [errorSettings, setErrorSettings] = useState('');
  const [errorUsers, setErrorUsers] = useState('');
  const [errorInvites, setErrorInvites] = useState('');
  const [errorStats, setErrorStats] = useState('');

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

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setErrorStats('');
    try {
      const data = await api.statistics();
      setStatistics(data.statistics);
    } catch (e) { setErrorStats(e.message); }
    finally { setLoadingStats(false); }
  }, []);

  // Load dataset on first access
  useEffect(() => {
    if (tab === 0 && settings === null && !loadingSettings) loadSettings();
  }, [tab, settings, loadingSettings, loadSettings]);

  useEffect(() => {
    if ((tab === 1 || tab === 4) && users === null && !loadingUsers) loadUsers();
  }, [tab, users, loadingUsers, loadUsers]);

  useEffect(() => {
    if (tab === 3 && invites === null && !loadingInvites) loadInvites();
  }, [tab, invites, loadingInvites, loadInvites]);

  useEffect(() => {
    if (tab === 2 && statistics === null && !loadingStats) loadStats();
  }, [tab, statistics, loadingStats, loadStats]);

  async function toggleEmergency() {
    setEmergencyDialog(false);
    try {
      const payload = await api.setEmergencyStatus(!emergency);
      setEmergency(payload.emergency);
      await onChanged(payload.emergency ? '应急模式已开启。' : '应急模式已关闭。');
    } catch (error) {
      onError(error.message);
    }
  }

  async function changed(message, patch = {}) {
    if (patch.settings) setSettings(patch.settings);
    if (patch.statistics !== undefined) setStatistics(patch.statistics);
    // Targeted reload: only refresh the dataset that actually changed
    if (patch._reload === 'invites' && invites !== null) loadInvites();
    else if (patch._reload === 'users' && users !== null) { loadUsers(); if (statistics !== null) loadStats(); }
    else if (patch._reload === 'stats' && statistics !== null) loadStats();
    else if (!patch.settings && patch.statistics === undefined) {
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
          onClick={() => setEmergencyDialog(true)}
          sx={{
            bgcolor: emergency ? 'error.main' : '#c62828',
            color: '#fff',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: emergency ? '#b71c1c' : '#b71c1c' },
          }}
        >
          {emergency ? '关闭应急模式' : '应急锁定'}
        </Button>
      </Box>

      <Dialog open={emergencyDialog} onClose={() => setEmergencyDialog(false)}>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 800 }}>
          {emergency ? '关闭应急模式' : '开启应急锁定'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText style={{ whiteSpace: 'pre-wrap' }}>
            {emergency
              ? '确认关闭应急锁定？系统将恢复正常访问。'
              : '确认开启应急锁定？此操作将：\n\n• 强制退出所有非管理员用户\n• 锁定除登录和管理后台外的所有页面\n• 非管理员的所有 API 请求将被拒绝\n\n此状态将持续到管理员手动关闭。'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmergencyDialog(false)}>取消</Button>
          <Button onClick={toggleEmergency} variant="contained" color="error">
            确认{emergency ? '关闭' : '开启'}
          </Button>
        </DialogActions>
      </Dialog>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable">
        <Tab label="权限" />
        <Tab label="流水调整" />
        <Tab label="统计" />
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
          {users && <AdjustmentsPanel users={users} onChanged={changed} onError={onError} />}
        </TabLoader>
      )}

      {tab === 2 && (
        <TabLoader loading={loadingStats} error={errorStats}>
          <StatisticsPanel statistics={statistics} onChanged={changed} onError={onError} />
        </TabLoader>
      )}

      {tab === 3 && (
        <TabLoader loading={loadingInvites} error={errorInvites}>
          {invites && (
            <InvitesPanel groups={groups} invites={invites} onChanged={changed} onError={onError} />
          )}
        </TabLoader>
      )}

      {tab === 4 && (
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

      {tab === 5 && (
        <TabLoader loading={loadingSettings} error={errorSettings}>
          {settings && (
            <SidebarPanel settings={settings} onChanged={changed} onError={onError} />
          )}
        </TabLoader>
      )}
    </Stack>
  );
}
