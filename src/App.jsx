import { Alert, Box, CircularProgress, Snackbar, ThemeProvider, createTheme } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import { AppShell } from './layout/AppShell.jsx';
import { AuthPanel } from './features/auth/AuthPanel.jsx';
import { DashboardPage } from './features/dashboard/DashboardPage.jsx';
import { MembersPage } from './features/dashboard/MembersPage.jsx';
import { StatisticsPage } from './features/dashboard/StatisticsPage.jsx';
import { MyLedgerPage } from './features/logs/PublicPoolPage.jsx';
import { AdminPage } from './features/admin/AdminPage.jsx';

const theme = createTheme({
  palette: {
    primary: { main: '#1e88d8' },
    secondary: { main: '#00897b' },
    background: { default: '#f7f9fc', paper: '#ffffff' },
    error: { main: '#c62828' }
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: 'Roboto, "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 700 }
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 800, color: '#263238', background: '#f6f9fc' }
      }
    }
  }
});

const titles = {
  overview: ['总览', '小组和社员积分概览'],
  members: ['成员', '成员目录和积分排序'],
  myLedger: ['我的明细', '只展示当前登录社员自己的积分分录'],
  statistics: ['统计台', '最近一次手动统计快照'],
  admin: ['管理员权限台', '权限、流水、统计和成员管理'],
  auth: ['登录', '登录后查看授权内容']
};

function getHashPage() {
  const hash = window.location.hash;
  return hash ? hash.replace('#/', '') : 'overview';
}

function firstAllowedPage(capabilities, sidebarOrder) {
  const order = sidebarOrder || ['overview', 'members', 'myLedger', 'statistics', 'admin'];
  for (const page of order) {
    if (page === 'auth' || page === 'admin') continue;
    if (capabilities?.views?.[page]) return page;
  }
  return 'overview';
}

export default function App() {
  const [appState, setAppState] = useState(null);
  const [activePage, setActivePage] = useState(getHashPage);
  const [myEntries, setMyEntries] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  const capabilities = appState?.capabilities || { views: { overview: true }, admin: false };
  const user = appState?.user || null;
  const groups = appState?.groups || [];
  const [title, subtitle] = titles[activePage] || titles.overview;

  const navigateTo = useCallback((page) => {
    window.location.hash = `#/${page}`;
  }, []);

  useEffect(() => {
    const handler = () => setActivePage(getHashPage());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  async function loadData(nextPage = activePage) {
    const appPayload = await api.app();
    setAppState(appPayload);
    const caps = appPayload.capabilities;
    const currentPageAllowed = nextPage === 'auth' || nextPage === 'admin'
      ? nextPage === 'auth' || caps.admin
      : caps.views?.[nextPage];
    const page = currentPageAllowed ? nextPage : firstAllowedPage(caps, appPayload.settings?.sidebarOrder);
    if (page !== getHashPage()) navigateTo(page);

    const jobs = [api.leaderboard().then((payload) => setLeaderboard(payload)).catch(() => setLeaderboard(null))];

    if (appPayload.user && caps.views?.myLedger) {
      jobs.push(api.myLedger().then((payload) => setMyEntries(payload.entries || [])).catch(() => setMyEntries([])));
    } else {
      setMyEntries([]);
    }

    if (appPayload.user && caps.views?.statistics) {
      jobs.push(api.statistics().then((payload) => setStatistics(payload.statistics)).catch(() => setStatistics(null)));
    } else {
      setStatistics(null);
    }

    await Promise.all(jobs);
  }

  useEffect(() => {
    let mounted = true;
    async function boot() {
      try {
        await loadData();
      } catch (error) {
        if (getToken()) setToken('');
        if (mounted) setNotice({ severity: 'error', message: error.message });
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
    await loadData('overview');
    setNotice({ severity: 'success', message: '登录成功。' });
  }

  async function handleLogout() {
    setToken('');
    await loadData('overview');
    setNotice({ severity: 'info', message: '已退出登录。' });
  }

  async function handleChanged(message) {
    await loadData(activePage);
    setNotice({ severity: 'success', message });
  }

  function handleError(message) {
    setNotice({ severity: 'error', message });
  }

  const personalStats = useMemo(() => {
    if (!user) return null;
    const memberRecord = leaderboard?.members?.find((member) => member.id === user.id);
    const groupName = memberRecord?.groupName || groups.find((group) => group.id === user.groupId)?.name || '-';
    const total = memberRecord?.total ?? myEntries.reduce((sum, entry) => sum + Number(entry.delta || 0), 0);
    return {
      groupName,
      total,
      lastEntry: myEntries[0] || null,
      ledgerCount: myEntries.length
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
    if (activePage === 'auth') return <AuthPanel onAuthed={handleAuthed} emergency={appState?.emergency || false} />;
    if (activePage === 'overview') return <DashboardPage leaderboard={leaderboard} />;
    if (activePage === 'members') return <MembersPage groups={groups} members={leaderboard?.members || []} />;
    if (activePage === 'myLedger') return <MyLedgerPage entries={myEntries} user={user} />;
    if (activePage === 'statistics') return <StatisticsPage statistics={statistics} />;
    if (activePage === 'admin') {
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
  }, [activePage, appState, groups, leaderboard, loading, myEntries, statistics, user]);

  return (
    <ThemeProvider theme={theme}>
      <AppShell
        activePage={activePage}
        capabilities={capabilities}
        user={user}
        personalStats={personalStats}
        activeSessions={appState?.activeSessions}
        settings={appState?.settings}
        emergency={appState?.emergency || false}
        onProfileChanged={handleChanged}
        onError={handleError}
        onNavigate={navigateTo}
        onLogin={() => navigateTo('auth')}
        onLogout={handleLogout}
        title={title}
        subtitle={subtitle}
      >
        {pageContent}
      </AppShell>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3600}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notice ? <Alert severity={notice.severity}>{notice.message}</Alert> : null}
      </Snackbar>
    </ThemeProvider>
  );
}
