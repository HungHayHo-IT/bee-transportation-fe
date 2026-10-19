import type { TypographyVariantsOptions } from '@mui/material/styles';

/**
 * Quicksand is the corporate face used on beetransportation.vn and carries the
 * brand voice in headings. Body and table text stay on Be Vietnam Pro, which is
 * built for dense Vietnamese text at small sizes.
 */
const headingFont = ['Quicksand', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'].join(', ');
const bodyFont = ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'].join(', ');

export const typography: TypographyVariantsOptions = {
  fontFamily: bodyFont,
  fontSize: 14,
  // Headings step down in clear jumps: a page title must not look like a card
  // title, and a figure set in h2 must read as the largest thing on screen.
  h1: { fontFamily: headingFont, fontWeight: 700, fontSize: '2.125rem', lineHeight: 1.15, letterSpacing: '-0.02em' },
  h2: { fontFamily: headingFont, fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
  h3: { fontFamily: headingFont, fontWeight: 700, fontSize: '1.4375rem', lineHeight: 1.28, letterSpacing: '-0.01em' },
  h4: { fontFamily: headingFont, fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.32, letterSpacing: '-0.01em' },
  h5: { fontFamily: headingFont, fontWeight: 700, fontSize: '1.0625rem', lineHeight: 1.4 },
  h6: { fontFamily: headingFont, fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.45 },
  subtitle1: { fontWeight: 500, fontSize: '0.9375rem' },
  subtitle2: { fontWeight: 500, fontSize: '0.875rem' },
  body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
  body2: { fontSize: '0.875rem', lineHeight: 1.6 },
  button: { fontFamily: headingFont, textTransform: 'none', fontWeight: 700 },
  caption: { fontSize: '0.75rem', lineHeight: 1.5 },
  overline: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    lineHeight: 1.6,
  },
};
