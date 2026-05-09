import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { Calculate as CalculateIcon } from '@mui/icons-material';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';
import { accountTypeLabel, formatTime } from '../../utils/format.js';

export function StatisticsPanel({ statistics, onChanged, onError }) {
  async function recalculate() {
    try {
      const payload = await api.recalculateStatistics();
      await onChanged('统计台已更新。', { statistics: payload.statistics });
    } catch (error) {
      onError(error.message);
    }
  }

  return (
    <Stack spacing={2}>
      <Surface sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={800}>统计台</Typography>
            <Typography color="text.secondary">上次更新：{formatTime(statistics?.updatedAt)}</Typography>
          </Box>
          <Button variant="contained" startIcon={<CalculateIcon />} onClick={recalculate}>
            手动更新统计
          </Button>
        </Stack>
      </Surface>

      <Box className="metric-grid">
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
          <Chip
            sx={{ mt: 1 }}
            color={statistics?.isBalanced ? 'success' : 'error'}
            label={statistics?.isBalanced ? '全部平账' : '存在不平账'}
          />
        </Surface>
      </Box>

      {!statistics ? <Alert severity="info">统计台还没有更新过。点击“手动更新统计”生成第一份快照。</Alert> : null}

      <Surface sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="h6" fontWeight={800}>账户余额</Typography>
        </Box>
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
              {(statistics?.accounts || []).map((account) => (
                <TableRow key={`${account.accountType}:${account.accountId}`}>
                  <TableCell>{accountTypeLabel(account.accountType)}</TableCell>
                  <TableCell>{account.accountId}</TableCell>
                  <TableCell align="right">{account.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Surface>

      <Surface sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="h6" fontWeight={800}>分录对应检查</Typography>
        </Box>
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
              {(statistics?.operationChecks || []).slice(0, 80).map((item) => (
                <TableRow key={item.operationId} hover>
                  <TableCell>{formatTime(item.createdAt)}</TableCell>
                  <TableCell>{item.reason}</TableCell>
                  <TableCell>{item.entryCount}</TableCell>
                  <TableCell>{item.sum}</TableCell>
                  <TableCell>
                    <Chip size="small" color={item.balanced ? 'success' : 'error'} label={item.balanced ? '平账' : '异常'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Surface>
    </Stack>
  );
}
