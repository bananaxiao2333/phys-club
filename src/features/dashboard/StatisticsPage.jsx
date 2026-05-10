import { Alert, Box, Button, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';
import { accountTypeLabel, formatTime } from '../../utils/format.js';

export function StatisticsPage({ statistics, isAdmin, onStatChanged }) {
  const [busy, setBusy] = useState(false);

  async function recalculate() {
    setBusy(true);
    try {
      const payload = await api.recalculateStatistics();
      if (onStatChanged) onStatChanged(payload.statistics);
    } finally { setBusy(false); }
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h4" color="primary.main" fontWeight={800}>统计台</Typography>
          <Typography color="text.secondary">统计由管理员手动更新，最近一次快照：{formatTime(statistics?.updatedAt)}</Typography>
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
          <Typography color="text.secondary">流水条目</Typography>
          <Typography variant="h4" color="primary.main">{statistics?.entryCount || 0}</Typography>
        </Surface>
        <Surface sx={{ p: 2 }}>
          <Typography color="text.secondary">操作组数</Typography>
          <Typography variant="h4" color="primary.main">{statistics?.operationCount || 0}</Typography>
        </Surface>
        <Surface sx={{ p: 2 }}>
          <Typography color="text.secondary">共享资金池</Typography>
          <Typography variant="h4" color="primary.main">{statistics?.sharedPoolTotal || 0}</Typography>
        </Surface>
        <Surface sx={{ p: 2 }}>
          <Typography color="text.secondary">平账状态</Typography>
          <Chip sx={{ mt: 1 }} color={statistics?.isBalanced ? 'success' : 'error'} label={statistics?.isBalanced ? '全部平账' : '存在不平账'} />
        </Surface>
      </Box>

      {statistics && (
        <>
          <Surface sx={{ p: 0, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5 }}><Typography variant="h6" fontWeight={800}>账户余额</Typography></Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>账户类型</TableCell>
                    <TableCell>账户 ID</TableCell>
                    <TableCell align="right">余额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(statistics.accounts || []).map((a) => (
                    <TableRow key={`${a.accountType}:${a.accountId}`}>
                      <TableCell>{accountTypeLabel(a.accountType)}</TableCell>
                      <TableCell>{a.accountId}</TableCell>
                      <TableCell align="right">{a.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Surface>

          <Surface sx={{ p: 0, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5 }}><Typography variant="h6" fontWeight={800}>分录对应检查</Typography></Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>时间</TableCell>
                    <TableCell>原因</TableCell>
                    <TableCell>条目</TableCell>
                    <TableCell>合计</TableCell>
                    <TableCell>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(statistics.operationChecks || []).slice(0, 80).map((item) => (
                    <TableRow key={item.operationId} hover>
                      <TableCell>{formatTime(item.createdAt)}</TableCell>
                      <TableCell>{item.reason}</TableCell>
                      <TableCell>{item.entryCount}</TableCell>
                      <TableCell>{item.sum}</TableCell>
                      <TableCell><Chip size="small" color={item.balanced ? 'success' : 'error'} label={item.balanced ? '平账' : '异常'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Surface>
        </>
      )}
    </Stack>
  );
}
