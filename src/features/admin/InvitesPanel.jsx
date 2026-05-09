import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Schedule as ExpireIcon,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';
import { formatTime } from '../../utils/format.js';

export function InvitesPanel({ groups, invites, onChanged, onError }) {
  const [form, setForm] = useState({ groupId: groups[0]?.id || 'group_1', maxUses: 1, expiresAt: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!form.groupId && groups[0]?.id) {
      setForm((next) => ({ ...next, groupId: groups[0].id }));
    }
  }, [groups, form.groupId]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createInvite({
        groupId: form.groupId,
        maxUses: Number(form.maxUses),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null
      });
      setForm((next) => ({ ...next, maxUses: 1, expiresAt: '' }));
      await onChanged('邀请码已创建。', { _reload: 'invites' });
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(code, active) {
    try {
      await api.toggleInviteActive(code, active);
      await onChanged(active ? '邀请码已激活。' : '邀请码已停用。', { _reload: 'invites' });
    } catch (error) {
      onError(error.message);
    }
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // fallback for insecure contexts
    }
  }

  return (
    <Stack spacing={2}>
      <Surface sx={{ p: 2.5 }}>
        <Stack component="form" spacing={2.5} onSubmit={submit}>
          <Typography variant="h6" fontWeight={800}>创建邀请码</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
            <FormControl sx={{ minWidth: 160 }} required>
              <InputLabel>注册组别</InputLabel>
              <Select
                label="注册组别"
                value={form.groupId}
                onChange={(event) => setForm((next) => ({ ...next, groupId: event.target.value }))}
              >
                {groups.map((group) => (
                  <MenuItem value={group.id} key={group.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: group.color, flexShrink: 0 }} />
                      <span>{group.name}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="可使用次数"
              type="number"
              value={form.maxUses}
              onChange={(event) => setForm((next) => ({ ...next, maxUses: event.target.value }))}
              inputProps={{ min: 1, max: 200, step: 1 }}
              required
              sx={{ minWidth: 140 }}
            />
            <TextField
              label="过期时间（可选）"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) => setForm((next) => ({ ...next, expiresAt: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 220 }}
            />
            <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={busy} sx={{ minWidth: 100 }}>
              创建
            </Button>
          </Stack>
        </Stack>
      </Surface>

      <Surface sx={{ p: 0, overflow: 'hidden' }}>
        {invites.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">暂无邀请码，请使用上方表单创建。</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>邀请码</TableCell>
                  <TableCell>组别</TableCell>
                  <TableCell>使用进度</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>过期时间</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invites.map((invite) => {
                  const usage = invite.maxUses > 0 ? (invite.uses / invite.maxUses) * 100 : 0;
                  return (
                    <TableRow key={invite.code} hover>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip
                            label={invite.code}
                            color="primary"
                            variant="outlined"
                            size="small"
                            sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}
                          />
                          <Tooltip title="复制">
                            <IconButton size="small" onClick={() => copyCode(invite.code)}>
                              <CopyIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={groups.find((group) => group.id === invite.groupId)?.name || invite.groupId}
                          sx={{
                            bgcolor: groups.find((group) => group.id === invite.groupId)?.color + '18',
                            color: groups.find((group) => group.id === invite.groupId)?.color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ flex: 1, bgcolor: 'grey.200', borderRadius: 1, height: 6, minWidth: 60, overflow: 'hidden' }}>
                            <Box sx={{ width: `${Math.min(usage, 100)}%`, height: '100%', borderRadius: 1, bgcolor: usage >= 100 ? 'error.main' : 'primary.main', transition: 'width 0.3s' }} />
                          </Box>
                          <Typography variant="body2" color="text.secondary" whiteSpace="nowrap">
                            {invite.uses}/{invite.maxUses}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={invite.active ? <ActiveIcon /> : <InactiveIcon />}
                          label={invite.active ? '有效' : '失效'}
                          color={invite.active ? 'success' : 'default'}
                          variant={invite.active ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        {invite.expiresAt ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <ExpireIcon fontSize="small" color={new Date(invite.expiresAt) < new Date() ? 'error' : 'action'} />
                            <Typography variant="body2" color={new Date(invite.expiresAt) < new Date() ? 'error.main' : 'text.primary'}>
                              {formatTime(invite.expiresAt)}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">永久有效</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatTime(invite.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {invite.active ? (
                          <Button size="small" color="warning" variant="outlined" onClick={() => toggleActive(invite.code, false)}>
                            停用
                          </Button>
                        ) : (
                          <Button size="small" color="success" variant="outlined" onClick={() => toggleActive(invite.code, true)}>
                            激活
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Surface>
    </Stack>
  );
}
