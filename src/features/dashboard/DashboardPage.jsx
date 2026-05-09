import {
  Avatar,
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
import { Star as StarIcon } from '@mui/icons-material';
import { useMemo, useState } from 'react';
import { Surface } from '../../components/Surface.jsx';
import { roleAvatarSx } from '../../utils/format.js';

function totalMemberPoints(members) {
  return members.reduce((sum, member) => sum + Number(member.total || 0), 0);
}

export function DashboardPage({ leaderboard }) {
  const groups = leaderboard?.groups || [];
  const members = leaderboard?.members || [];
  const fixedPool = leaderboard?.fixedPool;
  const settlementPool = leaderboard?.settlementPool;
  const rewardPool = leaderboard?.rewardPool;
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  const visibleMembers = useMemo(
    () => members.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [members, page, rowsPerPage]
  );

  const totalPoints = totalMemberPoints(members);
  const average = members.length ? Math.round(totalPoints / members.length) : 0;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" color="primary.main" fontWeight={800}>
          总览
        </Typography>
        <Typography color="text.secondary">查看各小组、资金池和社员功勋概况。</Typography>
      </Box>

      <Box className="metric-grid">
        <Surface sx={{ p: 2 }}>
          <Typography color="text.secondary">总成员</Typography>
          <Typography variant="h4" color="primary.main">{members.length}人</Typography>
        </Surface>
        <Surface sx={{ p: 2 }}>
          <Typography color="text.secondary">固定资金池</Typography>
          <Typography variant="h4" color="primary.main">{fixedPool?.total || 0}</Typography>
        </Surface>
        <Surface sx={{ p: 2 }}>
          <Typography color="text.secondary">待结算池</Typography>
          <Typography variant="h4" color="primary.main">{settlementPool?.total || 0}</Typography>
        </Surface>
        <Surface sx={{ p: 2 }}>
          <Typography color="text.secondary">奖励池</Typography>
          <Typography variant="h4" color="primary.main">{rewardPool?.total || 0}</Typography>
        </Surface>
      </Box>

      <Box>
        <Typography variant="h6" color="primary.main" fontWeight={800} sx={{ mb: 2 }}>
          各小组成员
        </Typography>
        <Box className="group-lanes">
          {groups.map((group) => {
            const groupMembers = members.filter((member) => member.groupId === group.id);
            return (
              <Box className="group-lane" key={group.id} style={{ '--group-color': group.color }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1.25} alignItems="baseline">
                    <Typography className="group-letter">{group.alias?.slice(0, 1) || group.name.slice(0, 1)}</Typography>
                    <Box>
                      <Typography color="primary.main" fontWeight={800}>{group.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{group.alias}</Typography>
                    </Box>
                  </Stack>
                  <Chip size="small" label={`${groupMembers.length}人`} />
                </Stack>
                <Stack spacing={1.5}>
                  {groupMembers.slice(0, 3).map((member) => (
                    <Surface key={member.id} sx={{ p: 1.5, borderColor: group.color }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar sx={roleAvatarSx(member.role, 40)}>{member.displayName.slice(0, 1)}</Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={700} noWrap>
                            {member.displayName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            @{member.username}{member.positionTitle ? ` · ${member.positionTitle}` : ''}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5} alignItems="center" color={group.color}>
                          <StarIcon fontSize="small" />
                          <Typography fontWeight={800}>{member.total}</Typography>
                        </Stack>
                      </Stack>
                    </Surface>
                  ))}
                  {!groupMembers.length ? (
                    <Typography variant="body2" color="text.secondary">暂无成员</Typography>
                  ) : null}
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Surface sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="h6" fontWeight={800}>积分榜</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>排名</TableCell>
                <TableCell>社员</TableCell>
                <TableCell>组别</TableCell>
                <TableCell align="right">积分</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleMembers.map((member, index) => (
                <TableRow key={member.id} hover>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={roleAvatarSx(member.role, 30)}>{member.displayName.slice(0, 1)}</Avatar>
                      <Box>
                        <Typography fontWeight={700}>{member.displayName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{member.username}{member.positionTitle ? ` · ${member.positionTitle}` : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>{member.groupName}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={800}>{member.total}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={members.length}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[8, 15, 30]}
          labelRowsPerPage="每页"
        />
      </Surface>
    </Stack>
  );
}
