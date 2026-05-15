const BASE_LABELS = { public: "公开", member: "社员", admin: "管理员" };

export function roleLabel(role, customRoles = []) {
  if (BASE_LABELS[role]) return BASE_LABELS[role];
  const cr = customRoles.find((r) => r.id === role);
  return cr?.name || role;
}

// Legacy: used by older components; prefer roleLabel(role, customRoles)
export const roleLabels = { ...BASE_LABELS };

export function roleAvatarSx(role, size = 40, rank = 0) {
  let border, bgcolor, color;
  if (rank >= 99) {
    border = "3px solid #0d47a1";
    bgcolor = "#1565c0";
    color = "#ffffff";
  } else if (rank >= 2) {
    border = "3px solid #90caf9";
    bgcolor = "#e3f2fd";
    color = "#1565c0";
  } else {
    border = "2px solid transparent";
    bgcolor = "#00897b";
    color = "#ffffff";
  }
  return { width: size, height: size, bgcolor, color, border, fontWeight: 800 };
}

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatTime(value) {
  if (!value) return "未更新";
  return dateTimeFormatter.format(new Date(value));
}

export function signedNumber(value) {
  const number = Number(value || 0);
  return number > 0 ? `+${number}` : String(number);
}

export function accountTypeLabel(type) {
  if (type === "member") return "社员账户";
  if (type === "pool") return "共享资金池";
  if (type === "external") return "外部校准";
  return type || "-";
}
