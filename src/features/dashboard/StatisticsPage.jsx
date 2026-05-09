import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';
import { formatTime } from '../../utils/format.js';

export function StatisticsPage({ statistics, isAdmin, onStatChanged }) {
  const [busy, setBusy] = useState(false);

  async function recalculate() {
    setBusy(true);
    try {
      const payload = await api.recalculateStatistics();
      if (onStatChanged) onStatChanged(payload.statistics);
    } catch (e) {
      // error shown by parent
    } finally { setBusy(false); }
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h4" color="primary.main" fontWeight={800}>
            统计台
          </Typography>
          <Typography color="text.secondary">统计由管理员手动更新，当前展示最近一次快照。</Typography>
        </Box>
        {isAdmin && (
          <Button variant="outlined" startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={recalculate} disabled={busy}>
            重新统计
          </Button>
        )}
      </Box>
      {!statistics ? <Alert severity="info">管理员还没有生成统计快照。</Alert> : null}
      <Box className="metric-grid">
        <Surface sx={{ p: 2 }}>
          <Typography color="text.secondary">上次更新</Typography>
          <Typography variant="h6" color="primary.main">{formatTime(statistics?.updatedAt)}</Typography>
        </Surface>
        <Surface sx={{ p: 2 }}>
          <Typography color="text.secondary">共享资金池</Typography>
          <Typography variant="h4" color="primary.main">{statistics?.sharedPoolTotal || 0}</Typography>
        </Surface>
        <Surface sx={{ p: 2 }}>
          <Typography color="text.secondary">操作组数</Typography>
          <Typography variant="h4" color="primary.main">{statistics?.operationCount || 0}</Typography>
        </Surface>
        <Surface sx={{ p: 2 }}>
          <Typography color="text.secondary">平账状态</Typography>
          <Chip
            sx={{ mt: 1 }}
            color={statistics?.isBalanced ? 'success' : 'error'}
            label={statistics?.isBalanced ? '全部平账' : '存在不平账'}
          />
        </Surface>
      </Box>
    </Stack>
  );
}
