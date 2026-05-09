import {
  Alert,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { AddCircleOutline as AddCircleOutlineIcon } from '@mui/icons-material';
import { useMemo, useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';

export function AdjustmentsPanel({ users, onChanged, onError }) {
  const members = useMemo(() => users.filter((user) => ['member', 'planner'].includes(user.role) && user.active), [users]);
  const [memberForm, setMemberForm] = useState({ userIds: [], delta: 10, reason: '', detail: '' });
  const [poolForm, setPoolForm] = useState({ delta: 100, reason: '', detail: '' });
  const [busy, setBusy] = useState(false);

  async function submitMembers(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.batchAdjustMembers({
        userIds: memberForm.userIds,
        delta: Number(memberForm.delta),
        reason: memberForm.reason,
        detail: memberForm.detail
      });
      setMemberForm((form) => ({ ...form, userIds: [], reason: '', detail: '' }));
      await onChanged('批量积分调整已写入流水。', { _reload: 'users' });
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitPool(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.adjustSharedPool({
        delta: Number(poolForm.delta),
        reason: poolForm.reason,
        detail: poolForm.detail
      });
      setPoolForm((form) => ({ ...form, reason: '', detail: '' }));
      await onChanged('共享资金池调整已写入流水。', { _reload: 'users' });
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack className="two-column" spacing={2}>
      <Surface sx={{ p: 2 }}>
        <Stack component="form" spacing={2} onSubmit={submitMembers}>
          <Typography variant="h6" fontWeight={800}>批量调整社员积分</Typography>
          <Alert severity="info">每个社员都会生成一组对应分录：社员账户变化，共享资金池反向变化。</Alert>
          <FormControl fullWidth required>
            <InputLabel>社员</InputLabel>
            <Select
              multiple
              label="社员"
              value={memberForm.userIds}
              renderValue={(selected) => `${selected.length} 名社员`}
              onChange={(event) => setMemberForm((form) => ({ ...form, userIds: event.target.value }))}
            >
              {members.map((member) => (
                <MenuItem value={member.id} key={member.id}>
                  <Checkbox checked={memberForm.userIds.includes(member.id)} />
                  <ListItemText primary={member.displayName} secondary={`@${member.username}`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="加减数值"
            type="number"
            value={memberForm.delta}
            onChange={(event) => setMemberForm((form) => ({ ...form, delta: event.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="原因"
            value={memberForm.reason}
            onChange={(event) => setMemberForm((form) => ({ ...form, reason: event.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="详情"
            value={memberForm.detail}
            onChange={(event) => setMemberForm((form) => ({ ...form, detail: event.target.value }))}
            fullWidth
            multiline
            minRows={3}
          />
          <Button type="submit" variant="contained" startIcon={<AddCircleOutlineIcon />} disabled={busy}>
            写入批量流水
          </Button>
        </Stack>
      </Surface>

      <Surface sx={{ p: 2 }}>
        <Stack component="form" spacing={2} onSubmit={submitPool}>
          <Typography variant="h6" fontWeight={800}>共享资金池调整</Typography>
          <Alert severity="success">共享资金池的独立加减会和外部校准账户对应，用于平账。</Alert>
          <TextField
            label="资金池变化"
            type="number"
            value={poolForm.delta}
            onChange={(event) => setPoolForm((form) => ({ ...form, delta: event.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="原因"
            value={poolForm.reason}
            onChange={(event) => setPoolForm((form) => ({ ...form, reason: event.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="详情"
            value={poolForm.detail}
            onChange={(event) => setPoolForm((form) => ({ ...form, detail: event.target.value }))}
            fullWidth
            multiline
            minRows={3}
          />
          <Button type="submit" variant="outlined" startIcon={<AddCircleOutlineIcon />} disabled={busy}>
            写入资金池流水
          </Button>
        </Stack>
      </Surface>
    </Stack>
  );
}
