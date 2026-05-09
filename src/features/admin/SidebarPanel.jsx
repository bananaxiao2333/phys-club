import { Box, Button, IconButton, List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import {
  Save as SaveIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  Assessment as AssessmentIcon,
  Home as HomeIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { api } from '../../api.js';
import { Surface } from '../../components/Surface.jsx';

const navMeta = {
  overview: { label: '总览', icon: <HomeIcon /> },
  members: { label: '成员', icon: <PeopleIcon /> },
  myLedger: { label: '我的明细', icon: <PersonIcon /> },
  statistics: { label: '统计台', icon: <AssessmentIcon /> },
  admin: { label: '管理员权限台', icon: <SecurityIcon /> },
};

export function SidebarPanel({ settings, onChanged, onError }) {
  const [order, setOrder] = useState(settings?.sidebarOrder || Object.keys(navMeta));
  const [busy, setBusy] = useState(false);

  function moveUp(index) {
    if (index === 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index) {
    if (index === order.length - 1) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      const payload = await api.updateSettings({ sidebarOrder: order });
      await onChanged('侧边栏顺序已更新。', { settings: payload.settings });
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={800}>侧边栏管理</Typography>
        <Typography variant="body2" color="text.secondary">
          拖拽调整导航项顺序，顶部为最前，底部为最后。修改后点击保存生效。
        </Typography>

        <List sx={{ bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          {order.map((id, index) => {
            const meta = navMeta[id];
            if (!meta) return null;
            return (
              <ListItem
                key={id}
                sx={{
                  bgcolor: 'background.paper',
                  borderBottom: index < order.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => moveUp(index)} disabled={index === 0}>
                      <UpIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => moveDown(index)} disabled={index === order.length - 1}>
                      <DownIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{meta.icon}</ListItemIcon>
                <ListItemText primary={meta.label} primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItem>
            );
          })}
        </List>

        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy}>
          保存顺序
        </Button>
      </Stack>
    </Surface>
  );
}
