import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Fade,
  Snackbar,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import { Error as ErrorIcon, PanTool as StopIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import { Component, useCallback, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken, onApiLoadingChange } from "./api.js";
import { AppShell } from "./layout/AppShell.jsx";
import { AuthPanel } from "./features/auth/AuthPanel.jsx";
import { DashboardPage } from "./features/dashboard/DashboardPage.jsx";
import { MembersPage } from "./features/dashboard/MembersPage.jsx";
import { StatisticsPage } from "./features/dashboard/StatisticsPage.jsx";
import { MyLedgerPage } from "./features/logs/PublicPoolPage.jsx";
import { AdminPage } from "./features/admin/AdminPage.jsx";

const sharedComponents = {
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: 'Roboto, "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif',
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
};

const lightTheme = createTheme({
  palette: {
    primary: { main: "#1e88d8" },
    secondary: { main: "#00897b" },
    background: { default: "#f7f9fc", paper: "#ffffff" },
    error: { main: "#c62828" },
  },
  ...sharedComponents,
  components: {
    ...sharedComponents.components,
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 800, color: "#263238", background: "#f6f9fc" },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#42a5f5" },
    secondary: { main: "#26a69a" },
    background: { default: "#121212", paper: "#1e1e1e" },
    error: { main: "#ef5350" },
  },
  ...sharedComponents,
});

function getInitialMode() {
  const saved = localStorage.getItem("physics_theme");
  if (saved === "light" || saved === "dark" || saved === "auto") return saved;
  return "auto";
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4, maxWidth: 720, mx: 'auto', textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={800} color="error.main" gutterBottom>
            发生了未预期的错误
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            请截屏此页面并发送给管理员以协助排查问题。
          </Typography>
          <Box
            component="pre"
            sx={{
              textAlign: 'left',
              bgcolor: 'grey.100',
              color: 'text.primary',
              p: 2,
              borderRadius: 1,
              fontSize: 12,
              overflow: 'auto',
              maxHeight: 320,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {this.state.error.stack || this.state.error.message}
          </Box>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            sx={{ mt: 3 }}
          >
            重新加载
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

const titles = {
  overview: ["总览", "小组和社员积分概览"],
  members: ["成员", "成员目录和积分排序"],
  myLedger: ["我的明细", "只展示当前登录社员自己的积分分录"],
  statistics: ["统计台", "最近一次手动统计快照"],
  admin: ["管理员权限台", "权限、流水、统计和成员管理"],
  auth: ["登录", "登录后查看授权内容"],
};

function getHashPage() {
  const hash = window.location.hash;
  return hash ? hash.replace("#/", "") : "overview";
}

function firstAllowedPage(capabilities, sidebarOrder) {
  const order = sidebarOrder || [
    "overview",
    "members",
    "myLedger",
    "statistics",
    "admin",
  ];
  for (const page of order) {
    if (page === "auth" || page === "admin") continue;
    if (capabilities?.views?.[page]) return page;
  }
  return "overview";
}

export default function App() {
  const [appState, setAppState] = useState(null);
  const [activePage, setActivePage] = useState(getHashPage);
  const [themeMode, setThemeMode] = useState(getInitialMode);
  const [sysDark, setSysDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSysDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function setTheme(next) {
    setThemeMode(next);
    localStorage.setItem('physics_theme', next);
  }

  const theme = themeMode === 'dark' ? darkTheme : themeMode === 'light' ? lightTheme : sysDark ? darkTheme : lightTheme;
  const [myEntries, setMyEntries] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const capabilities = appState?.capabilities || {
    views: { overview: true },
    admin: false,
  };
  const user = appState?.user || null;
  const groups = appState?.groups || [];
  const [title, subtitle] = titles[activePage] || titles.overview;

  const navigateTo = useCallback((page) => {
    window.location.hash = `#/${page}`;
  }, []);

  useEffect(() => {
    const handler = () => setActivePage(getHashPage());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  async function loadData(nextPage = activePage) {
    const appPayload = await api.app();
    setAppState(appPayload);
    const caps = appPayload.capabilities;
    const currentPageAllowed =
      nextPage === "auth" || nextPage === "admin"
        ? nextPage === "auth" || caps.admin
        : caps.views?.[nextPage];
    const page = currentPageAllowed
      ? nextPage
      : firstAllowedPage(caps, appPayload.settings?.sidebarOrder);
    if (page !== getHashPage()) navigateTo(page);

    // Always load leaderboard (needed for sidebar + overview + members pages)
    const jobs = [
      api
        .leaderboard()
        .then((payload) => setLeaderboard(payload))
        .catch(() => setLeaderboard(null)),
    ];

    if (!appPayload.user || !caps.views?.myLedger) setMyEntries([]);
    if (!appPayload.user || !caps.views?.statistics) setStatistics(false);

    await Promise.all(jobs);
  }

  // Lazy load myLedger when user visits that page
  useEffect(() => {
    if (activePage === 'myLedger' && myEntries === null && user && capabilities.views?.myLedger) {
      api.myLedger().then(p => setMyEntries(p.entries || [])).catch(() => setMyEntries([]));
    }
  }, [activePage, myEntries, user, capabilities]);

  // Lazy load statistics when user visits that page
  useEffect(() => {
    if (activePage === 'statistics' && statistics === null && user && capabilities.views?.statistics) {
      api.statistics().then(p => setStatistics(p.statistics)).catch(() => setStatistics(null));
    }
  }, [activePage, statistics, user, capabilities]);

  useEffect(() => {
    return onApiLoadingChange(setApiLoading);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      try {
        await loadData();
      } catch (error) {
        if (getToken()) setToken("");
        if (mounted) setNotice({ severity: "error", message: error.message });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleAuthed(payload) {
    setToken(payload.token);
    await loadData("overview");
    setNotice({ severity: "success", message: "登录成功。" });
  }

  async function handleLogout() {
    setToken("");
    await loadData("overview");
    setNotice({ severity: "info", message: "已退出登录。" });
  }

  async function handleChanged(message) {
    try {
      const appPayload = await api.app();
      setAppState(appPayload);
    } catch { /* keep existing app state */ }
    setNotice({ severity: "success", message });
  }

  function handleError(message) {
    setNotice({ severity: "error", message });
  }

  const personalStats = useMemo(() => {
    if (!user) return null;
    const memberRecord = leaderboard?.members?.find(
      (member) => member.id === user.id,
    );
    const groupName =
      memberRecord?.groupName ||
      groups.find((group) => group.id === user.groupId)?.name ||
      "-";
    const total =
      memberRecord?.total ??
      myEntries?.reduce((sum, entry) => sum + Number(entry.delta || 0), 0) ?? 0;
    return {
      groupName,
      total,
      lastEntry: myEntries?.[0] || null,
      ledgerCount: myEntries?.length || 0,
    };
  }, [groups, leaderboard, myEntries, user]);

  const pageContent = useMemo(() => {
    if (loading) {
      return (
        <Box className="center-panel">
          <CircularProgress />
        </Box>
      );
    }
    if (activePage === "auth")
      return (
        <AuthPanel
          onAuthed={handleAuthed}
          emergency={appState?.emergency || false}
        />
      );
    if (activePage === "overview")
      return <DashboardPage leaderboard={leaderboard} />;
    if (activePage === "members")
      return (
        <MembersPage groups={groups} members={leaderboard?.members || []} />
      );
    if (activePage === "myLedger")
      return <MyLedgerPage entries={myEntries || []} user={user} />;
    if (activePage === "statistics")
      return statistics ? <StatisticsPage statistics={statistics} /> : <Box className="center-panel"><CircularProgress /></Box>;
    if (activePage === "admin") {
      return (
        <AdminPage
          groups={groups}
          appState={appState}
          onChanged={handleChanged}
          onError={handleError}
        />
      );
    }
    return <DashboardPage leaderboard={leaderboard} />;
  }, [
    activePage,
    appState,
    groups,
    leaderboard,
    loading,
    myEntries,
    statistics,
    user,
  ]);

  return (
    <ThemeProvider theme={theme}>
      <Fade in={apiLoading} timeout={400}>
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            bgcolor: "rgba(30, 135, 216, 0.32)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(2px)",
            pointerEvents: apiLoading ? 'auto' : 'none',
          }}
        >
          <StopIcon sx={{ fontSize: 56, color: '#fff', mb: 1, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }} />
          <Typography
            variant="h4"
            fontWeight={900}
            color="#fff"
            letterSpacing={4}
            sx={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
          >
            PLEASE STANDBY
          </Typography>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            color="rgba(255,255,255,0.85)"
            letterSpacing={2}
            sx={{ mt: 0.5 }}
          >
            ASJYT PHYSICS CLUB
          </Typography>
          <CircularProgress sx={{ mt: 3, color: "#fff" }} />
        </Box>
      </Fade>
      <AppShell
        activePage={activePage}
        capabilities={capabilities}
        user={user}
        personalStats={personalStats}
        activeSessions={appState?.activeSessions}
        settings={appState?.settings}
        emergency={appState?.emergency || false}
        themeMode={themeMode}
        onToggleTheme={setTheme}
        onProfileChanged={handleChanged}
        onError={handleError}
        onNavigate={navigateTo}
        onLogin={() => navigateTo("auth")}
        onLogout={handleLogout}
        title={title}
        subtitle={subtitle}
      >
        <ErrorBoundary>{pageContent}</ErrorBoundary>
      </AppShell>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3600}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {notice ? (
          <Alert severity={notice.severity}>{notice.message}</Alert>
        ) : null}
      </Snackbar>
    </ThemeProvider>
  );
}
