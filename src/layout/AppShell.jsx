import {
  AppBar,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Edit as EditIcon,
  Home as HomeIcon,
  Info as InfoIcon,
  LockReset as LockResetIcon,
  BrightnessAuto as AutoIcon,
  DarkMode as DarkIcon,
  LightMode as LightIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  AdminPanelSettings as ClubAdminIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { api } from '../api.js';
import { roleAvatarSx, roleLabel, signedNumber, formatTime } from '../utils/format.js';
import { ProfileMenu } from '../features/profile/ProfileMenu.jsx';

const drawerWidth = 248;

const navDefinitions = [
  { id: 'overview', label: '总览', icon: <HomeIcon /> },
  { id: 'members', label: '成员', icon: <PeopleIcon /> },
  { id: 'myLedger', label: '我的明细', icon: <PersonIcon /> },
  { id: 'statistics', label: '统计台', icon: <AssessmentIcon /> },
  { id: 'clubAdmin', label: '社团管理台', icon: <ClubAdminIcon /> },
  { id: 'admin', label: '管理员权限台', icon: <SecurityIcon />, adminOnly: true }
];

function getRoleRank(role, customRoles) {
  if (role === 'admin') return 99;
  if (role === 'member') return 1;
  if (role === 'public') return 0;
  const cr = (customRoles || []).find(r => r.id === role);
  return cr?.rank ?? 0;
}

// ---- Sidebar user list widget ----

function SidebarUsers({ activeSessions, settings, user }) {
  const config = settings?.sidebarUsers;
  if (!config?.enabled) return null;

  const userRole = user?.role || 'public';
  if (userRole !== 'admin') {
    const cr = settings?.customRoles || [];
    const minRank = getRoleRank(config.minRole, cr);
    if (getRoleRank(userRole, cr) < minRank) return null;
  }

  const sessions = activeSessions || [];
  const sorted = [...sessions].sort((a, b) => {
    if (config.sortBy === 'name') return (a.displayName || '').localeCompare(b.displayName || '', 'zh-CN');
    return (b.lastSeen || 0) - (a.lastSeen || 0);
  });
  const top = sorted.slice(0, Math.min(config.maxUsers || 10, 50));

  if (!top.length) return null;

  return (
    <Box sx={{ px: 1.5, pb: 1 }}>
      <Divider sx={{ mb: 1 }} />
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 0.5, mb: 0.5, display: 'block' }}>
        在线用户
      </Typography>
      {top.map((s) => (
        <Stack key={s.userId} direction="row" alignItems="center" spacing={1} sx={{ py: 0.25, px: 0.5, borderRadius: 1 }}>
          <Box
            sx={{
              width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0
            }}
          />
          <Avatar sx={{ ...roleAvatarSx(s.role, 24), fontSize: 12 }}>
            {s.displayName?.slice(0, 1)}
          </Avatar>
          <Typography variant="body2" noWrap sx={{ flex: 1, fontSize: 13 }}>
            {s.displayName}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {(() => {
              const sec = Math.floor((Date.now() - s.lastSeen) / 1000);
              if (sec < 60) return '刚刚';
              if (sec < 3600) return `${Math.floor(sec / 60)}分钟前`;
              return `${Math.floor(sec / 3600)}小时前`;
            })()}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}

// ---- Mobile user card ----

function MobileUserCard({ user, personalStats, settings, onProfileChanged, onError, onLogout }) {
  const [statsAnchor, setStatsAnchor] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: user?.displayName || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', nextPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);

  async function submitProfile(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateProfile(profileForm);
      setEditOpen(false);
      await onProfileChanged('昵称已更新。');
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }

  async function submitPassword(e) {
    e.preventDefault();
    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      onError('两次输入的新密码不一致。');
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(passwordForm);
      setPasswordForm({ currentPassword: '', nextPassword: '', confirmPassword: '' });
      setPasswordOpen(false);
      await onProfileChanged('密码已更新。');
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }

  return (
    <Box sx={{ px: 2, py: 2, display: { xs: 'block', md: 'none' } }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar
          sx={{ ...roleAvatarSx(user.role, 40), cursor: 'pointer' }}
          onClick={(e) => setStatsAnchor(e.currentTarget)}
        >
          {user.displayName?.slice(0, 1)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontWeight={700} noWrap>
            {user.displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            @{user.username} · {user.positionTitle || roleLabel(user.role, settings?.customRoles) || '用户'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={(e) => setStatsAnchor(e.currentTarget)}>
          <InfoIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Popover
        open={Boolean(statsAnchor)}
        anchorEl={statsAnchor}
        onClose={() => setStatsAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Box sx={{ width: 260, p: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} gutterBottom>个人数据速览</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.75}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">组别</Typography>
              <Typography variant="body2" fontWeight={800}>{personalStats?.groupName || '-'}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">权限组</Typography>
              <Typography variant="body2" fontWeight={800}>
                {roleLabel(user.role, settings?.customRoles) || '用户'}
                {user.positionTitle ? ` · ${user.positionTitle}` : ''}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">当前积分</Typography>
              <Typography variant="body2" fontWeight={900}>{personalStats?.total ?? 0}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">最近变化</Typography>
              <Typography variant="body2" fontWeight={800}>
                {personalStats?.lastEntry ? signedNumber(personalStats.lastEntry.delta) : '-'}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              最近记录：{formatTime(personalStats?.lastEntry?.createdAt)}
            </Typography>
          </Stack>
        </Box>
      </Popover>

      <Stack spacing={0.75} sx={{ mt: 1.5 }}>
        <Button size="small" startIcon={<EditIcon />} variant="outlined" fullWidth onClick={() => setEditOpen(true)}>
          更改昵称
        </Button>
        <Button size="small" startIcon={<LockResetIcon />} variant="outlined" color="secondary" fullWidth onClick={() => setPasswordOpen(true)}>
          更改密码
        </Button>
        <Button size="small" startIcon={<LogoutIcon />} variant="outlined" color="error" fullWidth onClick={onLogout}>
          退出登录
        </Button>
      </Stack>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>更改昵称</DialogTitle>
        <DialogContent>
          <Stack component="form" id="mobile-profile-form" spacing={2} onSubmit={submitProfile} sx={{ pt: 1 }}>
            <TextField label="昵称" value={profileForm.displayName} onChange={(e) => setProfileForm({ displayName: e.target.value })} required fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button type="submit" form="mobile-profile-form" variant="contained" disabled={busy}>保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>更改密码</DialogTitle>
        <DialogContent>
          <Stack component="form" id="mobile-password-form" spacing={2} onSubmit={submitPassword} sx={{ pt: 1 }}>
            <TextField label="当前密码" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))} required fullWidth />
            <TextField label="新密码" type="password" value={passwordForm.nextPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, nextPassword: e.target.value }))} required fullWidth />
            <TextField label="确认新密码" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} required fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordOpen(false)}>取消</Button>
          <Button type="submit" form="mobile-password-form" variant="contained" disabled={busy}>更新密码</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---- Sidebar ----

function Sidebar({ activePage, capabilities, user, activeSessions, settings, personalStats, onProfileChanged, onError, onNavigate, onLogin, onLogout, themeMode, onToggleTheme }) {
  const theme = useTheme();
  const order = settings?.sidebarOrder || navDefinitions.map((i) => i.id);
  const rank = Object.fromEntries(order.map((id, i) => [id, i]));
  const items = navDefinitions
    .filter((item) => (item.adminOnly ? capabilities.admin : capabilities.views?.[item.id]))
    .sort((a, b) => (rank[a.id] ?? 999) - (rank[b.id] ?? 999));

  return (
    <Box className="sidebar" sx={{ bgcolor: 'background.paper' }}>
      <Box className="sidebar-brand">
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{
            background: 'linear-gradient(135deg, #1e88d8 0%, #0d47a1 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ASJ英东物理社
        </Typography>
        <Typography variant="body2" color="text.secondary">
          积分系统
        </Typography>
      </Box>

      <Divider />

      {user ? (
        <MobileUserCard
          user={user}
          personalStats={personalStats}
          settings={settings}
          onProfileChanged={onProfileChanged}
          onError={onError}
          onLogout={onLogout}
        />
      ) : (
        <Box sx={{ px: 2, py: 2, display: { xs: 'block', md: 'none' } }}>
          <Button variant="contained" startIcon={<LoginIcon />} onClick={onLogin} fullWidth>
            登录 / 注册
          </Button>
        </Box>
      )}

      <List sx={{ px: 1.25, py: 1.5 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.id}
            selected={activePage === item.id}
            onClick={() => onNavigate(item.id)}
            sx={{ borderRadius: 1, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ mt: 'auto' }}>
        <SidebarUsers activeSessions={activeSessions} settings={settings} user={user} />

        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Divider sx={{ mb: 1 }} />
          <FormControl size="small" fullWidth>
            <Select
              value={themeMode}
              onChange={(e) => onToggleTheme(e.target.value)}
              renderValue={(v) => (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  {v === 'auto' ? <AutoIcon fontSize="small" /> : v === 'dark' ? <DarkIcon fontSize="small" /> : <LightIcon fontSize="small" />}
                  <span>{v === 'auto' ? '自动' : v === 'dark' ? '深色' : '浅色'}</span>
                </Stack>
              )}
              sx={{ fontSize: 13, '& .MuiSelect-select': { display: 'flex', alignItems: 'center', py: 0.75 } }}
            >
              <MenuItem value="auto">
                <AutoIcon fontSize="small" sx={{ mr: 1 }} /> 自动
              </MenuItem>
              <MenuItem value="light">
                <LightIcon fontSize="small" sx={{ mr: 1 }} /> 浅色
              </MenuItem>
              <MenuItem value="dark">
                <DarkIcon fontSize="small" sx={{ mr: 1 }} /> 深色
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
    </Box>
  );
}

export function AppShell({
  children,
  activePage,
  capabilities,
  user,
  personalStats,
  activeSessions,
  settings,
  maintenance,
  onProfileChanged,
  onError,
  onNavigate,
  onLogin,
  onLogout,
  themeMode,
  onToggleTheme,
  title,
  subtitle
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <Sidebar
      activePage={activePage}
      capabilities={capabilities}
      user={user}
      activeSessions={activeSessions}
      settings={settings}
      personalStats={personalStats}
      onProfileChanged={onProfileChanged}
      onError={onError}
      onNavigate={(page) => {
        onNavigate(page);
        setMobileOpen(false);
      }}
      onLogin={onLogin}
      onLogout={onLogout}
      themeMode={themeMode}
      onToggleTheme={onToggleTheme}
    />
  );

  const shellTheme = useTheme();
  return (
    <Box className="admin-shell" sx={{ bgcolor: 'background.default' }}>
      <AppBar position="fixed" color="inherit" elevation={0} className="topbar" sx={{ borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <IconButton className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="打开菜单">
            <MenuIcon />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              积分系统 / {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" noWrap>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          <Box className="desktop-account-actions">
            {user ? (
              <ProfileMenu
                user={user}
                personalStats={personalStats}
                customRoles={settings?.customRoles}
                onChanged={onProfileChanged}
                onError={onError}
                onLogout={onLogout}
              />
            ) : (
              <Button variant="contained" startIcon={<LoginIcon />} onClick={onLogin}>
                登录 / 注册
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {maintenance && (
        <Box
          sx={{
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            zIndex: 1100,
            bgcolor: '#c62828',
            color: '#fff',
            textAlign: 'center',
            py: 0.75,
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 1,
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.85 },
            },
          }}
        >
          维护模式已激活 — 仅管理员可访问系统
        </Box>
      )}

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 }, mt: maintenance ? '36px' : 0 }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          {sidebar}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
          open
        >
          {sidebar}
        </Drawer>
      </Box>

      <Box
        component="main"
        className="main-area"
        sx={maintenance ? {
          background: 'repeating-linear-gradient(-45deg, #ffeb3b, #ffeb3b 20px, #212121 20px, #212121 40px) fixed',
          '& > *': { bgcolor: 'background.default', borderRadius: 1 },
        } : undefined}
      >
        {children}
      </Box>
    </Box>
  );
}
