export const roleLabels = {
  public: '公开',
  member: '社员',
  planner: '社团策划层',
  admin: '管理员'
};

export function roleAvatarSx(role, size = 40) {
  const border =
    role === 'admin'
      ? '3px solid #0d47a1'
      : role === 'planner'
        ? '3px solid #90caf9'
        : '2px solid transparent';
  return {
    width: size,
    height: size,
    bgcolor: role === 'admin' ? '#1565c0' : role === 'planner' ? '#e3f2fd' : '#00897b',
    color: role === 'planner' ? '#1565c0' : '#ffffff',
    border,
    fontWeight: 800
  };
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

export function formatTime(value) {
  if (!value) return '未更新';
  return dateTimeFormatter.format(new Date(value));
}

export function signedNumber(value) {
  const number = Number(value || 0);
  return number > 0 ? `+${number}` : String(number);
}

export function accountTypeLabel(type) {
  if (type === 'member') return '社员账户';
  if (type === 'pool') return '共享资金池';
  if (type === 'external') return '外部校准';
  return type || '-';
}
