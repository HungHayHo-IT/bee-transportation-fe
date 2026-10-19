import type { Components, Theme } from '@mui/material/styles';
import { brandColors, shadows } from './palette';

/**
 * Component defaults carry most of the visual identity, so a screen never has to
 * restyle a card, a table or an input to look like the rest of the application.
 *
 * Two rules run through all of them: numbers are set in tabular figures so a
 * column of money lines up digit for digit, and surfaces lift with a very soft
 * shadow instead of a hard border wherever both would compete.
 */
export const components: Components<Omit<Theme, 'components'>> = {
  MuiCssBaseline: {
    styleOverrides: {
      body: { backgroundColor: brandColors.paper },
      // The scrollbar is part of a dense admin screen; make it quiet.
      '*::-webkit-scrollbar': { width: 10, height: 10 },
      '*::-webkit-scrollbar-thumb': {
        backgroundColor: '#D3D6DB',
        borderRadius: 8,
        border: '2px solid transparent',
        backgroundClip: 'content-box',
      },
      '*::-webkit-scrollbar-thumb:hover': { backgroundColor: '#BFC3C9' },
    },
  },
  MuiCard: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        border: `1px solid ${brandColors.line}`,
        borderRadius: 14,
        boxShadow: shadows.card,
      },
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: { padding: 20, '&:last-child': { paddingBottom: 20 } },
    },
  },
  MuiPaper: {
    styleOverrides: {
      elevation8: { borderRadius: 12, boxShadow: shadows.popover },
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      // A button label that wraps turns a toolbar into two rows of ragged text.
      root: { borderRadius: 9, paddingInline: 16, whiteSpace: 'nowrap' },
      sizeSmall: { paddingInline: 12 },
      containedPrimary: {
        boxShadow: '0 1px 2px rgba(214, 74, 0, 0.24)',
        '&:hover': { backgroundColor: brandColors.orangeStrong },
      },
      outlined: { borderColor: brandColors.line },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: { borderRadius: 9 },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 7, fontWeight: 600 },
      sizeSmall: { height: 23, fontSize: '0.75rem' },
      label: { paddingInline: 9 },
    },
  },
  MuiTable: {
    styleOverrides: {
      root: { fontVariantNumeric: 'tabular-nums' },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:last-of-type td': { borderBottom: 'none' },
      },
      hover: {
        '&:hover': { backgroundColor: brandColors.lineSoft },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${brandColors.lineSoft}`,
        paddingBlock: 11,
      },
      head: {
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: brandColors.muted,
        whiteSpace: 'nowrap',
        backgroundColor: brandColors.card,
        borderBottom: `1px solid ${brandColors.line}`,
        paddingBlock: 12,
      },
    },
  },
  MuiTextField: {
    defaultProps: { size: 'small' },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 9,
        backgroundColor: brandColors.card,
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C9CCD2' },
      },
      notchedOutline: { borderColor: brandColors.line },
    },
  },
  MuiSelect: {
    defaultProps: { size: 'small' },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: { borderRadius: 999, backgroundColor: brandColors.lineSoft },
      bar: { borderRadius: 999 },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: { borderRadius: 16 },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: { fontSize: '1.125rem', paddingBottom: 8 },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: { borderRadius: 10 },
    },
  },
  MuiTooltip: {
    defaultProps: { arrow: true },
    styleOverrides: {
      tooltip: { fontSize: '0.75rem', borderRadius: 8, paddingBlock: 6 },
    },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: { height: 3, borderRadius: '3px 3px 0 0' },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: { textTransform: 'none', fontWeight: 600, minHeight: 46 },
    },
  },
};
