import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Star as StarIcon,
  MilitaryTech as RankIcon,
  Groups as GroupIcon,
  CalendarToday as DateIcon,
  Fingerprint as IdIcon,
} from "@mui/icons-material";
import { Surface } from "../../components/Surface.jsx";
import { roleAvatarSx, roleLabel, formatTime } from "../../utils/format.js";

/* ------------------------------------------------------------------ */
/*  Feature highlight row                                             */
/* ------------------------------------------------------------------ */
function HighlightRow({ icon, label, value, accent }) {
  const theme = useTheme();
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{
        py: 1,
        px: 1.5,
        borderLeft: `3px solid ${accent || theme.palette.primary.main}`,
        bgcolor: theme.palette.mode === "dark"
          ? "rgba(255,255,255,0.04)"
          : "rgba(0,0,0,0.02)",
        borderRadius: "0 4px 4px 0",
      }}
    >
      <Box sx={{ color: accent || "primary.main", display: "flex" }}>{icon}</Box>
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          textTransform="uppercase"
          letterSpacing={0.8}
        >
          {label}
        </Typography>
        <Typography fontWeight={700} variant="body2">
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/*  Spec row for the technical table                                  */
/* ------------------------------------------------------------------ */
function SpecRow({ label, value, last }) {
  return (
    <>
      <TableRow sx={{ "& td": { borderBottom: "none", py: 1.25 } }}>
        <TableCell
          sx={{
            fontWeight: 800,
            width: "35%",
            letterSpacing: 0.3,
            textTransform: "uppercase",
            pl: 0,
          }}
        >
          {label}
        </TableCell>
        <TableCell sx={{ fontSize: 13, pr: 0 }}>{value}</TableCell>
      </TableRow>
      {!last && (
        <TableRow>
          <TableCell colSpan={2} sx={{ p: 0 }}>
            <Divider />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */
export function MemberDetailPage({
  member,
  groups,
  customRoles,
  rank,
  onBack,
}) {
  const theme = useTheme();

  if (!member) {
    return (
      <Stack spacing={3} sx={{ py: 2 }}>
        <Button startIcon={<BackIcon />} onClick={onBack} sx={{ alignSelf: "flex-start" }}>
          返回成员列表
        </Button>
        <Surface sx={{ p: 6, textAlign: "center" }}>
          <Typography color="text.secondary">未找到该成员。</Typography>
        </Surface>
      </Stack>
    );
  }

  const group = groups.find((g) => g.id === member.groupId);
  const groupColor = group?.color || theme.palette.text.secondary;
  const isActive = member.active !== false;
  const role = roleLabel(member.role, customRoles);
  const subtitle = [role, member.positionTitle].filter(Boolean).join(" · ");

  return (
    <Stack spacing={3} sx={{ py: { xs: 1, md: 2 } }}>
      {/* ---- Back button ---- */}
      <Button
        startIcon={<BackIcon />}
        onClick={onBack}
        sx={{ alignSelf: "flex-start" }}
      >
        成员目录
      </Button>

      {/* ---- Hero header ---- */}
      <Box>
        <Typography variant="h4" color="primary.main" fontWeight={800}>
          {member.displayName}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary">{subtitle}</Typography>
        )}
      </Box>

      {/* ---- Avatar + stats block ---- */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          alignItems: { xs: "stretch", md: "center" },
        }}
      >
        {/* Avatar */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <Avatar
            sx={{
              ...roleAvatarSx(member.role, 88),
              fontSize: 36,
              border: `4px solid ${groupColor}`,
            }}
          >
            {member.displayName.slice(0, 1)}
          </Avatar>
          <Stack spacing={0.25} sx={{ display: { md: "none" } }}>
            <Typography fontWeight={800} variant="h6">
              {member.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{member.username}
            </Typography>
          </Stack>
        </Box>

        {/* Stats panel */}
        <Surface
          sx={{
            flex: 1,
            bgcolor: "background.default",
            p: 3,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 3,
            alignItems: { sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              variant="caption"
              fontWeight={700}
              textTransform="uppercase"
              letterSpacing={1.5}
              color="text.secondary"
            >
              功勋总值
            </Typography>
            <Stack direction="row" spacing={1} alignItems="baseline">
              <Typography
                variant="h3"
                fontWeight={900}
                sx={{ color: groupColor, lineHeight: 1 }}
              >
                {member.total ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                功勋
              </Typography>
            </Stack>
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: "none", sm: "block" } }}
          />

          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <RankIcon sx={{ fontSize: 18 }} color="action" />
              <Typography variant="body2" color="text.secondary">
                排名{" "}
                <Box component="span" fontWeight={800}>
                  #{rank || "-"}
                </Box>
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {isActive ? (
                <ActiveIcon sx={{ fontSize: 18 }} color="success" />
              ) : (
                <InactiveIcon sx={{ fontSize: 18 }} color="error" />
              )}
              <Typography variant="body2" color="text.secondary">
                状态{" "}
                <Box
                  component="span"
                  fontWeight={800}
                  color={isActive ? "success.main" : "error.main"}
                >
                  {isActive ? "活跃" : "已停用"}
                </Box>
              </Typography>
            </Stack>
          </Stack>
        </Surface>
      </Box>

      {/* ---- Feature highlights ---- */}
      <Surface sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
          成员亮点
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <HighlightRow
            icon={<GroupIcon />}
            label="所属组别"
            value={member.groupName || "未分组"}
            accent={groupColor}
          />
          <HighlightRow
            icon={<StarIcon />}
            label="角色"
            value={role}
          />
          {member.positionTitle && (
            <HighlightRow
              icon={<RankIcon />}
              label="职务"
              value={member.positionTitle}
            />
          )}
          <HighlightRow
            icon={<StarIcon />}
            label="功勋点数"
            value={`${member.total ?? 0} 功勋`}
            accent={groupColor}
          />
        </Box>
      </Surface>

      {/* ---- Technical specs ---- */}
      <Surface sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
          技术规格
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableBody>
              <SpecRow label="用户名" value={`@${member.username}`} />
              <SpecRow label="显示名称" value={member.displayName} />
              <SpecRow label="所属组别" value={member.groupName || "未分组"} />
              <SpecRow label="角色" value={role} />
              {member.positionTitle && (
                <SpecRow label="职务" value={member.positionTitle} />
              )}
              <SpecRow label="功勋总值" value={`${member.total ?? 0} 功勋`} />
              <SpecRow label="账户状态" value={isActive ? "活跃" : "已停用"} />
              <SpecRow label="注册时间" value={formatTime(member.createdAt)} />
              <SpecRow
                label="最后更新"
                value={formatTime(member.updatedAt)}
                last
              />
            </TableBody>
          </Table>
        </TableContainer>
      </Surface>

      {/* ---- Identifier footer ---- */}
      <Surface
        sx={{
          p: 2,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 1.5, sm: 3 },
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <IdIcon sx={{ fontSize: 16 }} color="action" />
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            letterSpacing={0.5}
          >
            USER ID
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontFamily: "monospace", fontSize: 11 }}
            color="text.secondary"
          >
            {member.id}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <DateIcon sx={{ fontSize: 16 }} color="action" />
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            letterSpacing={0.5}
          >
            SINCE
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatTime(member.createdAt)}
          </Typography>
        </Stack>

        <Chip
          size="small"
          label={member.groupName || "未分组"}
          sx={{
            bgcolor: `${groupColor}14`,
            color: groupColor,
            fontWeight: 700,
            ml: { sm: "auto" },
          }}
        />
      </Surface>
    </Stack>
  );
}
