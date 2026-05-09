import {
  Avatar,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useMemo, useState } from 'react';
import { Surface } from '../../components/Surface.jsx';
import { roleAvatarSx, roleLabels } from '../../utils/format.js';

export function MembersPage({ groups, members }) {
  const [groupId, setGroupId] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return members
      .filter((member) => groupId === 'all' || member.groupId === groupId)
      .filter((member) => {
        if (!q) return true;
        return `${member.displayName} ${member.username}`.toLowerCase().includes(q);
      });
  }, [members, groupId, keyword]);

  const visibleRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" color="primary.main" fontWeight={800}>
          成员
        </Typography>
        <Typography color="text.secondary">成员目录会按管理员设定的范围开放。</Typography>
      </Box>
      <Surface sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>小组</InputLabel>
            <Select
              label="小组"
              value={groupId}
              onChange={(event) => {
                setGroupId(event.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">所有小组</MenuItem>
              {groups.map((group) => (
                <MenuItem value={group.id} key={group.id}>{group.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="搜索成员"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(0);
            }}
            fullWidth
          />
        </Stack>
      </Surface>
      <Surface sx={{ p: 0, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>社员</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>组别</TableCell>
                <TableCell align="right">积分</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={roleAvatarSx(member.role, 36)}>{member.displayName.slice(0, 1)}</Avatar>
                      <Box>
                        <Typography fontWeight={700}>{member.displayName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          @{member.username}{member.positionTitle ? ` · ${member.positionTitle}` : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>{roleLabels[member.role] || '社员'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={member.groupName} />
                  </TableCell>
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
          count={filtered.length}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[12, 24, 50]}
          labelRowsPerPage="每页"
        />
      </Surface>
    </Stack>
  );
}
