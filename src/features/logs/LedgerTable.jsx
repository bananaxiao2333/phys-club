import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography
} from '@mui/material';
import { useMemo, useState } from 'react';
import { Surface } from '../../components/Surface.jsx';
import { accountTypeLabel, formatTime, signedNumber } from '../../utils/format.js';

export function LedgerTable({ title, subtitle, entries, showAccount = true }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const visibleRows = useMemo(
    () => entries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [entries, page, rowsPerPage]
  );

  return (
    <Surface sx={{ p: 0, overflow: 'hidden' }}>
      <Stack sx={{ px: 2, py: 1.5 }} spacing={0.25}>
        <Typography variant="h6" fontWeight={800}>{title}</Typography>
        {subtitle ? <Typography color="text.secondary">{subtitle}</Typography> : null}
      </Stack>
      <Box className="ledger-mobile-cards" sx={{ display: { xs: 'block', sm: 'none' }, px: 2, pb: 1 }}>
        <Stack spacing={1.25}>
          {visibleRows.map((entry) => (
            <Box key={entry.id} className="ledger-mobile-row" sx={{ bgcolor: 'background.paper' }}>
              <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="center">
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800} noWrap>{entry.reason}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatTime(entry.createdAt)}</Typography>
                </Box>
                <Chip
                  size="small"
                  color={entry.delta > 0 ? 'success' : 'error'}
                  label={signedNumber(entry.delta)}
                  sx={{ minWidth: 72, fontWeight: 800 }}
                />
              </Stack>
              {showAccount ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {entry.accountName} · {accountTypeLabel(entry.accountType)}
                </Typography>
              ) : null}
              <Typography variant="body2" sx={{ mt: 1 }}>{entry.detail || '-'}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                操作人：{entry.operatorDisplayName}
              </Typography>
            </Box>
          ))}
          {!entries.length ? (
            <Box sx={{ py: 5, color: 'text.secondary', textAlign: 'center' }}>暂无流水</Box>
          ) : null}
        </Stack>
      </Box>
      <TableContainer className="ledger-desktop-table" sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>时间</TableCell>
              {showAccount ? <TableCell>账户</TableCell> : null}
              <TableCell>变化</TableCell>
              <TableCell>原因</TableCell>
              <TableCell>详情</TableCell>
              <TableCell>操作人</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((entry) => (
              <TableRow key={entry.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTime(entry.createdAt)}</TableCell>
                {showAccount ? (
                  <TableCell>
                    <Typography fontWeight={700}>{entry.accountName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {accountTypeLabel(entry.accountType)}
                    </Typography>
                  </TableCell>
                ) : null}
                <TableCell>
                  <Chip
                    size="small"
                    color={entry.delta > 0 ? 'success' : 'error'}
                    label={signedNumber(entry.delta)}
                    sx={{ minWidth: 72, fontWeight: 800 }}
                  />
                </TableCell>
                <TableCell>{entry.reason}</TableCell>
                <TableCell sx={{ minWidth: 220 }}>{entry.detail || '-'}</TableCell>
                <TableCell>{entry.operatorDisplayName}</TableCell>
              </TableRow>
            ))}
            {!entries.length ? (
              <TableRow>
                <TableCell colSpan={showAccount ? 6 : 5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  暂无流水
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={entries.length}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="每页"
      />
    </Surface>
  );
}
