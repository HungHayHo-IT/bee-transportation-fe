import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { IconInbox } from '@tabler/icons-react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps): ReactNode {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 6, px: 3 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>
        <IconInbox size={40} stroke={1.4} />
      </Box>
      <Typography variant="subtitle1">{title}</Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {description}
        </Typography>
      ) : null}
      {action}
    </Stack>
  );
}
