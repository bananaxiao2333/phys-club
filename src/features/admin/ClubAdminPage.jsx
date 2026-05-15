import { Box, Fab, Typography } from '@mui/material';
import { FileUpload as ImportIcon } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { MeritPanel } from './MeritPanel.jsx';
import { DuesImportDialog } from './DuesImportDialog.jsx';

export function ClubAdminPage({ settings, groups, onChanged, onError }) {
  const [users, setUsers] = useState([]);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    api.adminUsers().then(d => setUsers(d.users || [])).catch(() => {});
  }, []);

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" color="primary.main" fontWeight={800}>社团管理台</Typography>
        <Typography color="text.secondary">功勋铸造、销毁、转账、社费拆分、项目结算、奖励管理、注销退款。</Typography>
      </Box>
      <MeritPanel users={users} onChanged={onChanged} onError={onError} />

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}
        onClick={() => setImportOpen(true)}
      >
        <ImportIcon />
      </Fab>

      <DuesImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        users={users}
        groups={groups}
        splitRatio={settings?.duesSplitRatio || 30}
        onChanged={onChanged}
        onError={onError}
      />
    </>
  );
}
