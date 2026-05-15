import {
  Alert, Box, Button, FormControl, InputLabel, MenuItem, Select,
  Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, SwapHoriz as TransferIcon,
  PersonAdd as DuesIcon, AccountBalance as SettlementIcon,
  EmojiEvents as RewardIcon, Cancel as RefundIcon } from '@mui/icons-material';
import { useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';

const POOLS = {
  pool_fixed: '固定资金池',
  pool_settlement: '项目待结算池',
  pool_reward: '奖励池',
};

const SUB_TABS = [
  { label: '铸造/销毁', id: 'cast' },
  { label: '转账', id: 'transfer' },
  { label: '社费', id: 'dues' },
  { label: '结算', id: 'settlement' },
  { label: '奖励', id: 'reward' },
  { label: '注销', id: 'refund' },
];

export function MeritPanel({ users, onChanged, onError }) {
  const [subTab, setSubTab] = useState(0);
  const [busy, setBusy] = useState(false);

  // Cast form
  const [cast, setCast] = useState({ amount: '', poolId: 'pool_fixed', reason: '', detail: '' });
  // Destroy form
  const [destroy, setDestroy] = useState({ amount: '', poolId: 'pool_fixed', reason: '', detail: '' });
  // Transfer form
  const [tf, setTf] = useState({ fromPoolId: 'pool_fixed', toPoolId: 'pool_settlement', amount: '', reason: '', detail: '' });
  // Dues form
  const [dues, setDues] = useState({ userId: '', amount: '' });
  // Settlement form
  const [settle, setSettle] = useState({ revenue: '', cost: '', reason: '', detail: '' });
  // Reward fill form
  const [fill, setFill] = useState({ amount: '', reason: '', detail: '' });
  // Reward distribute form
  const [dist, setDist] = useState({ userId: '', amount: '', reason: '', detail: '' });
  // Refund form
  const [refund, setRefund] = useState({ userId: '' });

  async function submit(op, form, reset) {
    setBusy(true);
    try {
      const payload = await op(form);
      reset();
      await onChanged('功勋操作已完成。', { _reload: 'users' });
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  const poolSelect = (value, onChange) => (
    <FormControl sx={{ minWidth: 180 }} required>
      <InputLabel>目标池</InputLabel>
      <Select label="目标池" value={value} onChange={onChange}>
        {Object.entries(POOLS).map(([id, name]) => (
          <MenuItem value={id} key={id}>{name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const userSelect = (value, onChange) => (
    <FormControl sx={{ minWidth: 200 }} required>
      <InputLabel>社员</InputLabel>
      <Select label="社员" value={value} onChange={onChange}>
        {users.filter(u => u.active && u.role !== 'admin').map(u => (
          <MenuItem value={u.id} key={u.id}>{u.displayName} ({u.username})</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Stack spacing={2}>
      <Surface sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>功勋操作台</Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          所有功勋操作都必须对应真实资金变动。铸造代表资金进入，销毁代表资金离开。禁止凭空增减。
        </Alert>
        <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} variant="scrollable">
          {SUB_TABS.map((t, i) => <Tab label={t.label} key={t.id} value={i} />)}
        </Tabs>
      </Surface>

      {/* 铸造 */}
      {subTab === 0 && (
        <Surface sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700} color="success.main">铸造功勋（资金进入系统）</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
              {poolSelect(cast.poolId, e => setCast(c => ({ ...c, poolId: e.target.value })))}
              <TextField label="金额" type="number" value={cast.amount} onChange={e => setCast(c => ({ ...c, amount: e.target.value }))} required />
              <TextField label="原因" value={cast.reason} onChange={e => setCast(c => ({ ...c, reason: e.target.value }))} required sx={{ flex: 1 }} />
            </Stack>
            <TextField label="备注" value={cast.detail} onChange={e => setCast(c => ({ ...c, detail: e.target.value }))} fullWidth />
            <Button variant="contained" color="success" startIcon={<AddIcon />} disabled={busy}
              onClick={() => submit(api.castMerit, { amount: Number(cast.amount), poolId: cast.poolId, reason: cast.reason, detail: cast.detail }, () => setCast({ amount: '', poolId: 'pool_fixed', reason: '', detail: '' }))}>
              铸造
            </Button>
          </Stack>
        </Surface>
      )}

      {/* 销毁 */}
      {subTab === 0 && (
        <Surface sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700} color="error.main">销毁功勋（资金离开系统）</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
              {poolSelect(destroy.poolId, e => setDestroy(c => ({ ...c, poolId: e.target.value })))}
              <TextField label="金额" type="number" value={destroy.amount} onChange={e => setDestroy(c => ({ ...c, amount: e.target.value }))} required />
              <TextField label="原因" value={destroy.reason} onChange={e => setDestroy(c => ({ ...c, reason: e.target.value }))} required sx={{ flex: 1 }} />
            </Stack>
            <TextField label="备注" value={destroy.detail} onChange={e => setDestroy(c => ({ ...c, detail: e.target.value }))} fullWidth />
            <Button variant="contained" color="error" startIcon={<RemoveIcon />} disabled={busy}
              onClick={() => submit(api.destroyMerit, { amount: Number(destroy.amount), poolId: destroy.poolId, reason: destroy.reason, detail: destroy.detail }, () => setDestroy({ amount: '', poolId: 'pool_fixed', reason: '', detail: '' }))}>
              销毁
            </Button>
          </Stack>
        </Surface>
      )}

      {/* 转账 */}
      {subTab === 1 && (
        <Surface sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>池间转账</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
              <FormControl sx={{ minWidth: 180 }} required><InputLabel>来源池</InputLabel>
                <Select label="来源池" value={tf.fromPoolId} onChange={e => setTf(t => ({ ...t, fromPoolId: e.target.value }))}>
                  {Object.entries(POOLS).map(([id, name]) => <MenuItem value={id} key={id}>{name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 180 }} required><InputLabel>目标池</InputLabel>
                <Select label="目标池" value={tf.toPoolId} onChange={e => setTf(t => ({ ...t, toPoolId: e.target.value }))}>
                  {Object.entries(POOLS).map(([id, name]) => <MenuItem value={id} key={id}>{name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="金额" type="number" value={tf.amount} onChange={e => setTf(t => ({ ...t, amount: e.target.value }))} required />
              <TextField label="原因" value={tf.reason} onChange={e => setTf(t => ({ ...t, reason: e.target.value }))} required sx={{ flex: 1 }} />
            </Stack>
            <TextField label="备注" value={tf.detail} onChange={e => setTf(t => ({ ...t, detail: e.target.value }))} fullWidth />
            <Button variant="contained" startIcon={<TransferIcon />} disabled={busy}
              onClick={() => submit(api.transferMerit, { fromPoolId: tf.fromPoolId, toPoolId: tf.toPoolId, amount: Number(tf.amount), reason: tf.reason, detail: tf.detail }, () => setTf({ fromPoolId: 'pool_fixed', toPoolId: 'pool_settlement', amount: '', reason: '', detail: '' }))}>
              转账
            </Button>
          </Stack>
        </Surface>
      )}

      {/* 社费拆分 */}
      {subTab === 2 && (
        <Surface sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>社费拆分（铸造 + 按比例分配）</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
              {userSelect(dues.userId, e => setDues(d => ({ ...d, userId: e.target.value })))}
              <TextField label="社费金额" type="number" value={dues.amount} onChange={e => setDues(d => ({ ...d, amount: e.target.value }))} required />
            </Stack>
            <Button variant="contained" startIcon={<DuesIcon />} disabled={busy}
              onClick={() => submit(api.allocateDues, { userId: dues.userId, amount: Number(dues.amount) }, () => setDues({ userId: '', amount: '' }))}>
              拆分社费
            </Button>
          </Stack>
        </Surface>
      )}

      {/* 项目结算 */}
      {subTab === 3 && (
        <Surface sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>项目结算（收入 − 成本 = 利润 → 固定池）</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
              <TextField label="项目收入" type="number" value={settle.revenue} onChange={e => setSettle(s => ({ ...s, revenue: e.target.value }))} required />
              <TextField label="外部成本" type="number" value={settle.cost} onChange={e => setSettle(s => ({ ...s, cost: e.target.value }))} required />
              <TextField label="项目名/原因" value={settle.reason} onChange={e => setSettle(s => ({ ...s, reason: e.target.value }))} required sx={{ flex: 1 }} />
            </Stack>
            <TextField label="备注" value={settle.detail} onChange={e => setSettle(s => ({ ...s, detail: e.target.value }))} fullWidth />
            <Button variant="contained" startIcon={<SettlementIcon />} disabled={busy}
              onClick={() => submit(api.settleProject, { revenue: Number(settle.revenue), cost: Number(settle.cost), reason: settle.reason, detail: settle.detail }, () => setSettle({ revenue: '', cost: '', reason: '', detail: '' }))}>
              结算
            </Button>
          </Stack>
        </Surface>
      )}

      {/* 奖励 */}
      {subTab === 4 && (
        <Stack spacing={2}>
          <Surface sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={700}>填充奖励池（固定资金池 → 奖励池）</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
                <TextField label="金额" type="number" value={fill.amount} onChange={e => setFill(f => ({ ...f, amount: e.target.value }))} required />
                <TextField label="原因" value={fill.reason} onChange={e => setFill(f => ({ ...f, reason: e.target.value }))} required sx={{ flex: 1 }} />
              </Stack>
              <TextField label="备注" value={fill.detail} onChange={e => setFill(f => ({ ...f, detail: e.target.value }))} fullWidth />
              <Button variant="contained" color="success" disabled={busy}
                onClick={() => submit(api.fillReward, { amount: Number(fill.amount), reason: fill.reason, detail: fill.detail }, () => setFill({ amount: '', reason: '', detail: '' }))}>
                填充奖励池
              </Button>
            </Stack>
          </Surface>

          <Surface sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={700}>发放奖励（奖励池 → 社员）</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
                {userSelect(dist.userId, e => setDist(d => ({ ...d, userId: e.target.value })))}
                <TextField label="金额" type="number" value={dist.amount} onChange={e => setDist(d => ({ ...d, amount: e.target.value }))} required />
                <TextField label="原因" value={dist.reason} onChange={e => setDist(d => ({ ...d, reason: e.target.value }))} required sx={{ flex: 1 }} />
              </Stack>
              <TextField label="备注" value={dist.detail} onChange={e => setDist(d => ({ ...d, detail: e.target.value }))} fullWidth />
              <Button variant="contained" startIcon={<RewardIcon />} disabled={busy}
                onClick={() => submit(api.distributeReward, { userId: dist.userId, amount: Number(dist.amount), reason: dist.reason, detail: dist.detail }, () => setDist({ userId: '', amount: '', reason: '', detail: '' }))}>
                发放奖励
              </Button>
            </Stack>
          </Surface>
        </Stack>
      )}

      {/* 注销退款 */}
      {subTab === 5 && (
        <Surface sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700} color="error.main">注销退款（销毁个人功勋 + 取消激活）</Typography>
            <Alert severity="error">
              此操作不可逆！将销毁社员全部功勋余额并永久取消激活该账户。仅限全额退款，不支持部分提现。
            </Alert>
            {userSelect(refund.userId, e => setRefund({ userId: e.target.value }))}
            <Button variant="contained" color="error" startIcon={<RefundIcon />} disabled={busy}
              onClick={() => submit(api.refundMember, { userId: refund.userId }, () => setRefund({ userId: '' }))}>
              确认注销退款
            </Button>
          </Stack>
        </Surface>
      )}
    </Stack>
  );
}
