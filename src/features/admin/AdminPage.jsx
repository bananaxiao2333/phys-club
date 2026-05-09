import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { AdjustmentsPanel } from "./AdjustmentsPanel.jsx";
import { InvitesPanel } from "./InvitesPanel.jsx";
import { PermissionsPanel } from "./PermissionsPanel.jsx";
import { SidebarPanel } from "./SidebarPanel.jsx";
import { StatisticsPanel } from "./StatisticsPanel.jsx";
import { UsersPanel } from "./UsersPanel.jsx";

export function AdminPage({ groups, appState, onChanged, onError }) {
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [settings, setSettings] = useState(appState.settings);
  const [viewDefinitions, setViewDefinitions] = useState(
    appState.viewDefinitions,
  );
  const [statistics, setStatistics] = useState(null);
  const [emergency, setEmergency] = useState(appState.emergency || false);
  const [emergencyDialog, setEmergencyDialog] = useState(false);

  async function loadAdmin() {
    const [userData, inviteData, settingData, statsData] = await Promise.all([
      api.adminUsers(),
      api.adminInvites(),
      api.adminSettings(),
      api.statistics(),
    ]);
    setUsers(userData.users || []);
    setInvites(inviteData.invites || []);
    setSettings(settingData.settings);
    setViewDefinitions(settingData.viewDefinitions);
    setStatistics(statsData.statistics);
  }

  useEffect(() => {
    loadAdmin().catch((error) => onError(error.message));
  }, []);

  async function toggleEmergency() {
    setEmergencyDialog(false);
    try {
      const payload = await api.setEmergencyStatus(!emergency);
      setEmergency(payload.emergency);
      await onChanged(
        payload.emergency ? "应急模式已开启。" : "应急模式已关闭。",
      );
    } catch (error) {
      onError(error.message);
    }
  }

  async function changed(message, patch = {}) {
    if (patch.settings) setSettings(patch.settings);
    if (patch.statistics !== undefined) setStatistics(patch.statistics);
    if (!patch.settings && patch.statistics === undefined) {
      await loadAdmin();
    }
    await onChanged(message);
  }

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h4" color="primary.main" fontWeight={800}>
            管理员权限台
          </Typography>
          <Typography color="text.secondary">
            权限范围、批量流水、邀请码、统计和平账检查集中在这里。
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<WarningIcon />}
          onClick={() => setEmergencyDialog(true)}
          sx={{
            bgcolor: emergency ? "error.main" : "#c62828",
            color: "#fff",
            fontWeight: 700,
            whiteSpace: "nowrap",
            "&:hover": { bgcolor: emergency ? "#b71c1c" : "#b71c1c" },
          }}
        >
          {emergency ? "关闭应急模式" : "应急锁定"}
        </Button>
      </Box>

      <Dialog open={emergencyDialog} onClose={() => setEmergencyDialog(false)}>
        <DialogTitle sx={{ color: "error.main", fontWeight: 800 }}>
          {emergency ? "关闭应急模式" : "开启应急锁定"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText style={{ whiteSpace: "pre-wrap" }}>
            {emergency
              ? "确认关闭应急锁定？系统将恢复正常访问。"
              : "确认开启应急锁定？此操作将：\n\n• 强制退出所有非管理员用户\n• 锁定除登录和管理后台外的所有页面\n• 非管理员的所有 API 请求将被拒绝\n\n此状态将持续到管理员手动关闭。"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmergencyDialog(false)}>取消</Button>
          <Button onClick={toggleEmergency} variant="contained" color="error">
            确认{emergency ? "关闭" : "开启"}
          </Button>
        </DialogActions>
      </Dialog>
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
      >
        <Tab label="权限" />
        <Tab label="流水调整" />
        <Tab label="统计" />
        <Tab label="邀请码" />
        <Tab label="成员" />
        <Tab label="侧边栏" />
      </Tabs>
      {tab === 0 ? (
        <PermissionsPanel
          settings={settings}
          viewDefinitions={viewDefinitions}
          onChanged={changed}
          onError={onError}
        />
      ) : null}
      {tab === 1 ? (
        <AdjustmentsPanel users={users} onChanged={changed} onError={onError} />
      ) : null}
      {tab === 2 ? (
        <StatisticsPanel
          statistics={statistics}
          onChanged={changed}
          onError={onError}
        />
      ) : null}
      {tab === 3 ? (
        <InvitesPanel
          groups={groups}
          invites={invites}
          onChanged={changed}
          onError={onError}
        />
      ) : null}
      {tab === 4 ? (
        <UsersPanel
          groups={groups}
          users={users}
          currentUserId={appState.user?.id}
          onChanged={changed}
          onError={onError}
        />
      ) : null}
      {tab === 5 ? (
        <SidebarPanel
          settings={settings}
          onChanged={changed}
          onError={onError}
        />
      ) : null}
    </Stack>
  );
}
