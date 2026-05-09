import { Paper } from '@mui/material';

export function Surface({ children, sx, ...props }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid #d7e3f0',
        borderRadius: 1,
        backgroundImage: 'none',
        ...sx
      }}
      {...props}
    >
      {children}
    </Paper>
  );
}
