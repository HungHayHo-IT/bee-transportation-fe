import type { PaletteOptions } from '@mui/material/styles';

/**
 * Brand tokens sampled from beetransportation.vn: the corporate orange, the
 * slate used for headings, the muted body grey, the bee yellow and the green
 * the site uses for positive states.
 */
export const brandColors = {
  paper: '#FFFFFF',
  card: '#FFFFFF',
  /** Headings sit a shade darker than body text so a page has a clear top line. */
  inkStrong: '#2B2F38',
  ink: '#41454F',
  muted: '#8D8D8D',
  line: '#E7E8EA',
  lineSoft: '#F1F2F4',
  orange: '#FF5A00',
  orangeStrong: '#D64A00',
  orangeWash: '#FFF1E8',
  beeYellow: '#FFDA44',
  success: '#00803C',
  successWash: '#E4F1EA',
  warning: '#C77F06',
  warningWash: '#FDF3E0',
  danger: '#DC3545',
  dangerWash: '#FCEBEC',
  slate: '#75777B',
  slateWash: '#EFF0F2',
} as const;

/**
 * Elevation is carried by two very soft shadows rather than one dark one: a card
 * has to lift off the page without drawing a grey box around itself.
 */
export const shadows = {
  // Stronger since the page background went white: the card has to stand out
  // from a surface of the same colour, not just from grey.
  card: '0 1px 3px rgba(24, 28, 36, 0.06), 0 6px 16px rgba(24, 28, 36, 0.07)',
  raised: '0 4px 12px rgba(24, 28, 36, 0.08), 0 1px 3px rgba(24, 28, 36, 0.04)',
  popover: '0 8px 28px rgba(24, 28, 36, 0.12)',
} as const;

/** The sidebar rail follows the dark slate of the logo, with orange as the accent. */
export const railColors = {
  background: '#1E232B',
  backgroundHover: 'rgba(255, 255, 255, 0.06)',
  // The site marks its section labels with a solid orange block; the active
  // menu row borrows that treatment rather than tinting orange over slate,
  // which muddies into brown.
  backgroundActive: '#FF5A00',
  backgroundActiveHover: '#D64A00',
  text: '#C4C7CD',
  textMuted: '#7C8089',
  textActive: '#FFFFFF',
  border: 'rgba(255, 255, 255, 0.08)',
} as const;

export const palette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: brandColors.orange,
    dark: brandColors.orangeStrong,
    light: brandColors.orangeWash,
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: brandColors.slate,
    contrastText: '#FFFFFF',
  },
  success: { main: brandColors.success, light: brandColors.successWash },
  warning: { main: brandColors.warning },
  error: { main: brandColors.danger },
  info: { main: brandColors.ink },
  background: {
    default: brandColors.paper,
    paper: brandColors.card,
  },
  text: {
    primary: brandColors.ink,
    secondary: brandColors.muted,
  },
  action: {
    hover: 'rgba(24, 28, 36, 0.03)',
    selected: brandColors.orangeWash,
  },
  divider: brandColors.line,
};
