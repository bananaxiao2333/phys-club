import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';
import { roleLabels } from '../../utils/format.js';

function draftFromUser(user) {
  return {
    displayName: user.displayName,
    groupId: user.role === 'admin' ? null : user.groupId,
    role: user.role,
    positionTitle: user.role === 'planner' ? user.positionTitle || '' : '',
    active: user.active
  };
}

function normalizedDraft(user, draft = {}) {
  const role = draft.role || user.role || 'member';
  return {
    displayName: String(draft.displayName ?? user.displayName ?? '').trim(),
    groupId: role === 'admin' ? null : draft.groupId || user.groupId || '',
    role,
    positionTitle: role === 'planner' ? String(draft.positionTitle || '').trim() : '',
    active: Boolean(draft.active)
  };
}

function hasChanged(user, draft) {
  return JSON.stringify(normalizedDraft(user, draft)) !== JSON.stringify(draftFromUser(user));
}

export function UsersPanel({ groups, users, currentUserId, onChanged, onError }) {
  const editableUsers = users;
  const [drafts, setDrafts] = useState({});
  const [pendingPromotion, setPendingPromotion] = useState(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        editableUsers.map((user) => [user.id, draftFromUser(user)])
      )
    );
  }, [users]);

  const dirtyUserIds = useMemo(() => {
    const draftsReady = editableUsers.every((user) => drafts[user.id]);
    if (!draftsReady) return [];
    return editableUsers.filter((user) => hasChanged(user, drafts[user.id])).map((user) => user.id);
  }, [drafts, editableUsers]);

  function resetDrafts() {
    setDrafts(Object.fromEntries(editableUsers.map((user) => [user.id, draftFromUser(user)])));
  }

  async function executeSaveAll(userIds) {
    try {
      for (const userId of userIds) {
        const user = editableUsers.find((item) => item.id === userId);
        if (user) await api.updateUser(userId, normalizedDraft(user, drafts[userId]));
      }
      await onChanged(`已保存 ${userIds.length} 个成员的修改。`, { _reload: 'users' });
    } catch (error) {
      onError(error.message);
    }
  }

  async function submitChanges() {
    const promotions = dirtyUserIds
      .map((userId) => editableUsers.find((user) => user.id === userId))
      .filter((user) => user?.role !== 'admin' && drafts[user.id]?.role === 'admin');

    if (promotions.length) {
      setPendingPromotion({ userIds: dirtyUserIds, users: promotions });
      return;
    }

    await executeSaveAll(dirtyUserIds);
  }

  return (
    <Surface sx={{ p: 0, overflow: 'hidden' }}>
      <Stack sx={{ px: 2, py: 1.5 }}>
        <Typography variant="h6" fontWeight={800}>成员管理</Typography>
      </Stack>
      {dirtyUserIds.length ? (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Alert
            severity="warning"
            action={(
              <Stack direction="row" spacing={1}>
                <Button color="inherit" size="small" onClick={resetDrafts}>
                  放弃
                </Button>
                <Button color="warning" size="small" variant="contained" startIcon={<SaveIcon />} onClick={submitChanges}>
                  提交
                </Button>
              </Stack>
            )}
          >
            有 {dirtyUserIds.length} 个成员存在未保存修改。
          </Alert>
        </Box>
      ) : null}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>姓名</TableCell>
              <TableCell>用户名</TableCell>
              <TableCell>角色</TableCell>
              <TableCell>职位名称</TableCell>
              <TableCell>组别</TableCell>
              <TableCell>启用</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {editableUsers.map((user) => {
              const draft = drafts[user.id] || {};
              const isSelf = user.id === currentUserId;
              return (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ minWidth: 170 }}>
                    <TextField
                      size="small"
                      value={draft.displayName || ''}
                      onChange={(event) =>
                        setDrafts((next) => ({ ...next, [user.id]: { ...draft, displayName: event.target.value } }))
                      }
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>@{user.username}</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={draft.role || 'member'}
                        disabled={isSelf}
                        onChange={(event) => {
                          const role = event.target.value;
                          setDrafts((next) => ({
                            ...next,
                            [user.id]: {
                              ...draft,
                              role,
                              groupId: role === 'admin' ? null : draft.groupId || groups[0]?.id || '',
                              positionTitle: role === 'planner' ? draft.positionTitle || '' : ''
                            }
                          }));
                        }}
                      >
                        <MenuItem value="member">{roleLabels.member}</MenuItem>
                        <MenuItem value="planner">{roleLabels.planner}</MenuItem>
                        <MenuItem value="admin">{roleLabels.admin}</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <TextField
                      size="small"
                      value={draft.positionTitle || ''}
                      placeholder="如：活动策划"
                      disabled={draft.role !== 'planner'}
                      onChange={(event) =>
                        setDrafts((next) => ({ ...next, [user.id]: { ...draft, positionTitle: event.target.value } }))
                      }
                      fullWidth
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={draft.role === 'admin' ? '' : draft.groupId || groups[0]?.id || ''}
                        disabled={draft.role === 'admin'}
                        onChange={(event) =>
                          setDrafts((next) => ({ ...next, [user.id]: { ...draft, groupId: event.target.value } }))
                        }
                      >
                        {draft.role === 'admin' ? <MenuItem value="">管理员无组别</MenuItem> : null}
                        {groups.map((group) => (
                          <MenuItem value={group.id} key={group.id}>{group.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={Boolean(draft.active)}
                      disabled={isSelf}
                      onChange={(event) =>
                        setDrafts((next) => ({ ...next, [user.id]: { ...draft, active: event.target.checked } }))
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={Boolean(pendingPromotion)} onClose={() => setPendingPromotion(null)} fullWidth maxWidth="sm">
        <DialogTitle>确认提升为管理员？</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              管理员可以查看和修改全部成员、邀请码、权限范围、积分流水和统计台，也可以继续提升其他账号权限。
            </Alert>
            <Typography>
              即将把 {(pendingPromotion?.users || []).map((user) => user.displayName).join('、') || '选中用户'} 提升为管理员。请确认这些都是可信账号。
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingPromotion(null)}>取消</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<SaveIcon />}
            onClick={async () => {
              const targets = pendingPromotion?.userIds || [];
              setPendingPromotion(null);
              if (targets.length) await executeSaveAll(targets);
            }}
          >
            确认提权
          </Button>
        </DialogActions>
      </Dialog>
    </Surface>
  );
}
