import { Box, Stack, Typography } from '@mui/material';
import { LedgerTable } from './LedgerTable.jsx';

export function PublicPoolPage({ entries }) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" color="primary.main" fontWeight={800}>
          共享资金池
        </Typography>
        <Typography color="text.secondary">未登录状态只展示共享资金池的加减流水。</Typography>
      </Box>
      <LedgerTable
        title="共享资金池流水"
        subtitle="这里是公开可见的总池变动。成员个人明细需要登录后查看。"
        entries={entries}
        showAccount={false}
      />
    </Stack>
  );
}

export function MyLedgerPage({ entries, user }) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" color="primary.main" fontWeight={800}>
          我的积分明细
        </Typography>
        <Typography color="text.secondary">
          {user?.displayName || '社员'} 可以看到每一分属于自己的加减原因和详情。
        </Typography>
      </Box>
      <LedgerTable title="我的账户流水" entries={entries} showAccount={false} />
    </Stack>
  );
}
