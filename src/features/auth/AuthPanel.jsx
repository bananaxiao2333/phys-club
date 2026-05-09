import { Alert, Box, Button, Divider, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { Login as LoginIcon, PersonAddAlt as PersonAddAltIcon } from '@mui/icons-material';
import { useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';

export function AuthPanel({ onAuthed, maintenance }) {
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    inviteCode: '',
    username: '',
    displayName: '',
    password: ''
  });

  async function submitLogin(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onAuthed(await api.login(loginForm));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onAuthed(await api.register(registerForm));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface sx={{ p: 3, maxWidth: 460 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" color="primary.main" fontWeight={800}>
            登录积分系统
          </Typography>
          <Typography color="text.secondary">社员登录后只能看到自己的积分明细和授权内容。</Typography>
        </Box>
        {maintenance ? (
          <Alert severity="warning" sx={{ fontWeight: 700 }}>系统处于维护锁定状态，暂不开放注册。</Alert>
        ) : (
          <Tabs value={tab} onChange={(_, value) => setTab(value)}>
            <Tab icon={<LoginIcon />} iconPosition="start" label="登录" />
            <Tab icon={<PersonAddAltIcon />} iconPosition="start" label="注册" />
          </Tabs>
        )}
        <Divider />
        {error ? <Alert severity="error">{error}</Alert> : null}
        {tab === 0 || maintenance ? (
          <Stack component="form" spacing={2} onSubmit={submitLogin}>
            <TextField
              label="用户名"
              value={loginForm.username}
              onChange={(event) => setLoginForm((form) => ({ ...form, username: event.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="密码"
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((form) => ({ ...form, password: event.target.value }))}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" startIcon={<LoginIcon />} disabled={busy}>
              登录
            </Button>
          </Stack>
        ) : (
          <Stack component="form" spacing={2} onSubmit={submitRegister}>
            <TextField
              label="邀请码"
              value={registerForm.inviteCode}
              onChange={(event) => setRegisterForm((form) => ({ ...form, inviteCode: event.target.value.toUpperCase() }))}
              required
              fullWidth
            />
            <TextField
              label="用户名"
              value={registerForm.username}
              onChange={(event) => setRegisterForm((form) => ({ ...form, username: event.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="姓名"
              value={registerForm.displayName}
              onChange={(event) => setRegisterForm((form) => ({ ...form, displayName: event.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="密码"
              type="password"
              value={registerForm.password}
              onChange={(event) => setRegisterForm((form) => ({ ...form, password: event.target.value }))}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" color="secondary" startIcon={<PersonAddAltIcon />} disabled={busy}>
              注册并登录
            </Button>
          </Stack>
        )}
      </Stack>
    </Surface>
  );
}
