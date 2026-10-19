import { createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { palette } from './palette';
import { typography } from './typography';
import { components } from './components';

export const beeOpsTheme: Theme = createTheme({
  palette,
  typography,
  components,
  shape: { borderRadius: 8 },
});

export { brandColors, railColors, shadows } from './palette';
