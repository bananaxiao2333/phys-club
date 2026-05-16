import { Box } from '@mui/material';

const shimmer = {
  '@keyframes shimmer': {
    '0%': { backgroundPosition: '-400px 0' },
    '100%': { backgroundPosition: '400px 0' },
  },
  background: (t) => t.palette.mode === 'dark'
    ? 'linear-gradient(90deg, #1e1e1e 25%, #2a2a2a 50%, #1e1e1e 75%)'
    : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
  backgroundSize: '800px 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

export function PageSkeleton({ lines = 4, title = false }) {
  return (
    <Box sx={{ py: 2 }}>
      {title && (
        <Box sx={{ ...shimmer, height: 36, borderRadius: 1, mb: 3, width: '40%' }} />
      )}
      <Box sx={{ ...shimmer, height: 72, borderRadius: 2, mb: 2 }} />
      {Array.from({ length: lines }, (_, i) => (
        <Box key={i} sx={{ ...shimmer, height: 48, borderRadius: 1, mb: 1, width: `${85 - i * 10}%` }} />
      ))}
    </Box>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ ...shimmer, height: 40, borderRadius: 1, mb: 1 }} />
      {Array.from({ length: rows }, (_, i) => (
        <Box key={i} sx={{ ...shimmer, height: 36, borderRadius: 1, mb: 0.75, width: `${95 - i * 3}%` }} />
      ))}
    </Box>
  );
}
