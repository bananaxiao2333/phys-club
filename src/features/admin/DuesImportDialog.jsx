import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, LinearProgress, MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Download as DownloadIcon, Upload as UploadIcon, PlayArrow as RunIcon } from '@mui/icons-material';
import { useState } from 'react';
import { api } from '../../api.js';

function randomPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

function parseCSV(text, groupMap) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length >= 2 && cols[0] && cols[1]) {
      const groupName = (cols[2] || '').trim();
      const groupId = groupName ? (groupMap[groupName] || groupMap[Object.keys(groupMap).find(k => k.toLowerCase() === groupName.toLowerCase())] || '') : '';
      rows.push({ username: cols[0], amount: parseFloat(cols[1]) || 0, groupName, groupId });
    }
  }
  return rows.filter(r => r.amount > 0);
}

function downloadCSV(filename, data) {
  const csv = '用户名,密码,组别\n' + data.map(r => `${r.username},${r.password},${r.groupName || ''}`).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function DuesImportDialog({ open, onClose, users, groups, splitRatio, onChanged, onError }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [defaultGroup, setDefaultGroup] = useState('');

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const gMap = {};
      for (const g of (groups || [])) { gMap[g.name] = g.id; if (g.alias) gMap[g.alias] = g.id; }
      const parsed = parseCSV(ev.target.result, gMap);
      setRows(parsed.map(r => {
        const existing = (users || []).find(u => u.username === r.username);
        return {
          ...r,
          userId: existing?.id || null,
          exists: !!existing,
          toFixed: Math.round(r.amount * (splitRatio / 100)),
          toMember: r.amount - Math.round(r.amount * (splitRatio / 100)),
          password: existing ? '' : randomPassword(),
          status: existing ? '已存在' : '将新建',
        };
      }));
    };
    reader.readAsText(file);
  }

  function updateAmount(idx, val) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const amt = parseFloat(val) || 0;
      return { ...r, amount: amt, groupId: r.groupId, groupName: r.groupName, toFixed: Math.round(amt * (splitRatio / 100)), toMember: amt - Math.round(amt * (splitRatio / 100)) };
    }));
  }

  async function execute() {
    setBusy(true);
    const newAccounts = [];
    for (const r of rows) {
      try {
        let uid = r.userId;
        if (!uid) {
          // Create new account directly (club admin permission)
          const gid = r.groupId || defaultGroup || null;
          const result = await api.batchCreateUser({ username: r.username, password: r.password, displayName: r.username, role: 'member', groupId: gid });
          uid = result.user?.id;
          newAccounts.push({ username: r.username, password: r.password, groupName: r.groupName || '' });
          setRows(prev => prev.map((rr, i) => i === rows.indexOf(r) ? { ...rr, userId: uid, status: '已创建' } : rr));
        }
        if (uid) {
          const gid = r.groupId || defaultGroup || null;
          if (gid) {
            await api.updateUser(uid, { groupId: gid });
          }
          await api.allocateDues({ userId: uid, amount: r.amount });
          setRows(prev => prev.map((rr, i) => i === rows.indexOf(r) ? { ...rr, status: '已完成' } : rr));
        }
      } catch (e) {
        setRows(prev => prev.map((rr, i) => i === rows.indexOf(r) ? { ...rr, status: `失败: ${e.message}` } : rr));
      }
    }
    setBusy(false);
    if (newAccounts.length > 0) {
      downloadCSV('new_accounts.csv', newAccounts);
    }
    if (rows.some(r => r.status === '已完成')) {
      await onChanged(`批量社费拆分完成。`);
    }
    onClose();
  }

  const totalFixed = rows.reduce((s, r) => s + r.toFixed, 0);
  const totalMember = rows.reduce((s, r) => s + r.toMember, 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>批量社费拆分导入</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            CSV 格式：用户名,金额[,组别名]。分割比例：{splitRatio}% 归公。组别名可选，未指定则使用下方默认组。
          </Typography>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>新建用户默认组别</InputLabel>
            <Select label="新建用户默认组别" value={defaultGroup} onChange={e => setDefaultGroup(e.target.value)}>
              <MenuItem value="">— 不指定 —</MenuItem>
              {(groups || []).map(g => <MenuItem value={g.id} key={g.id}>{g.name}</MenuItem>)}
            </Select>
          </FormControl>

          {rows.length === 0 ? (
            <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 4, textAlign: 'center' }}>
              <UploadIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">选择 CSV 文件开始预览</Typography>
              <Button component="label" variant="outlined" sx={{ mt: 2 }}>
                选择文件
                <input type="file" accept=".csv" hidden onChange={handleFile} />
              </Button>
            </Box>
          ) : (
            <>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip label={fileName} onDelete={() => { setRows([]); setFileName(''); }} />
                <Button component="label" size="small">
                  更换文件
                  <input type="file" accept=".csv" hidden onChange={handleFile} />
                </Button>
              </Stack>

              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>用户名</TableCell>
                      <TableCell>金额</TableCell>
                      <TableCell>组别</TableCell>
                      <TableCell>归公 ({splitRatio}%)</TableCell>
                      <TableCell>归个人</TableCell>
                      <TableCell>密码</TableCell>
                      <TableCell>状态</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.username}</TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={r.amount} onChange={e => updateAmount(i, e.target.value)} sx={{ width: 100 }} />
                        </TableCell>
                        <TableCell>
                          {(r.groupId || (!r.exists && defaultGroup))
                            ? (() => { const g = groups.find(x => x.id === (r.groupId || defaultGroup)); return g ? <Chip size="small" label={g.name} sx={{ bgcolor: g.color + '22', color: g.color, fontWeight: 600 }} /> : '—'; })()
                            : '—'}
                        </TableCell>
                        <TableCell>{r.toFixed}</TableCell>
                        <TableCell>{r.toMember}</TableCell>
                        <TableCell>{r.password || (r.exists ? '—' : '生成中...')}</TableCell>
                        <TableCell>
                          <Chip size="small" label={r.status} color={r.exists ? 'success' : 'warning'} variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack direction="row" justifyContent="space-between" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                <Typography variant="body2">合计归公：<strong>{totalFixed}</strong></Typography>
                <Typography variant="body2">合计归个人：<strong>{totalMember}</strong></Typography>
                <Typography variant="body2">总计：<strong>{totalFixed + totalMember}</strong></Typography>
              </Stack>
            </>
          )}

          {busy && <LinearProgress />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        <Button variant="contained" startIcon={<RunIcon />} onClick={execute} disabled={rows.length === 0 || busy}>
          批量执行
        </Button>
      </DialogActions>
    </Dialog>
  );
}
