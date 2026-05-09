import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  Badge as BadgeIcon,
  Edit as EditIcon,
  LockReset as LockResetIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { formatTime, roleAvatarSx, roleLabels, signedNumber } from '../../utils/format.js';

export function ProfileMenu({ user, personalStats, onChanged, onError, onLogout }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: user?.displayName || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', nextPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setProfileForm({ displayName: user?.displayName || '' });
  }, [user]);

  if (!user) return null;

  const open = Boolean(anchorEl);
  const roleText = user.positionTitle || roleLabels[user.role] || '社员';

  function closeMenu() {
    setAnchorEl(null);
  }

  async function submitProfile(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.updateProfile(profileForm);
      setProfileOpen(false);
      closeMenu();
      await onChanged('昵称已更新。');
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      onError('两次输入的新密码不一致。');
      return;
    }

    setBusy(true);
    try {
      await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        nextPassword: passwordForm.nextPassword
      });
      setPasswordForm({ currentPassword: '', nextPassword: '', confirmPassword: '' });
      setPasswordOpen(false);
      closeMenu();
      await onChanged('密码已更新。');
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        color="inherit"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ px: 1, py: 0.5, borderRadius: 1, minWidth: 0 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={roleAvatarSx(user.role, 36)}>{user.displayName?.slice(0, 1)}</Avatar>
          <Box sx={{ textAlign: 'left', display: { xs: 'none', lg: 'block' }, minWidth: 0 }}>
            <Typography fontWeight={800} lineHeight={1.1} noWrap>
              {user.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {roleText}
            </Typography>
          </Box>
        </Stack>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        PaperProps={{ sx: { width: 320, p: 0.5 } }}
      >
        <Box sx={{ px: 1.5, py: 1.25 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar sx={roleAvatarSx(user.role, 46)}>{user.displayName?.slice(0, 1)}</Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={900} noWrap>{user.displayName}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                @{user.username} · {roleText}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ px: 1.5, py: 1.25 }}>
          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">个人数据速览</Typography>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">组别</Typography>
              <Typography variant="body2" fontWeight={800}>{personalStats?.groupName || '-'}</Typography>
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
        <Divider />
        <MenuItem onClick={() => { closeMenu(); setProfileOpen(true); }}>
          <EditIcon fontSize="small" sx={{ mr: 1.25 }} />
          更改昵称
        </MenuItem>
        <MenuItem onClick={() => { closeMenu(); setPasswordOpen(true); }}>
          <LockResetIcon fontSize="small" sx={{ mr: 1.25 }} />
          更改密码
        </MenuItem>
        <MenuItem onClick={onLogout}>
          <LogoutIcon fontSize="small" sx={{ mr: 1.25 }} />
          退出登录
        </MenuItem>
      </Menu>

      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <BadgeIcon color="primary" />
            <span>更改昵称</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack component="form" id="profile-form" spacing={2} onSubmit={submitProfile} sx={{ pt: 1 }}>
            <TextField
              label="昵称"
              value={profileForm.displayName}
              onChange={(event) => setProfileForm({ displayName: event.target.value })}
              required
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileOpen(false)}>取消</Button>
          <Button type="submit" form="profile-form" variant="contained" disabled={busy}>保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <LockResetIcon color="primary" />
            <span>更改密码</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack component="form" id="password-form" spacing={2} onSubmit={submitPassword} sx={{ pt: 1 }}>
            <TextField
              label="当前密码"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((form) => ({ ...form, currentPassword: event.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="新密码"
              type="password"
              value={passwordForm.nextPassword}
              onChange={(event) => setPasswordForm((form) => ({ ...form, nextPassword: event.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="确认新密码"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((form) => ({ ...form, confirmPassword: event.target.value }))}
              required
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordOpen(false)}>取消</Button>
          <Button type="submit" form="password-form" variant="contained" disabled={busy}>更新密码</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
