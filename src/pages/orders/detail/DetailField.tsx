import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export interface DetailFieldProps {
  label: string;
  value: ReactNode;
}

/**
 * One labelled value on the order detail. Shared so the customer block, the route
 * and the cargo figures all sit on the same grid — a contact detail must not look
 * like a different kind of thing from the rest of the order.
 */
export function DetailField({ label, value }: DetailFieldProps): ReactNode {
  return (
    <Box sx={{ minWidth: 200, flex: '1 1 200px' }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {value}
      </Typography>
    </Box>
  );
}
