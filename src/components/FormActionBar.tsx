import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';

export interface FormActionBarProps {
  /** The page's actions, primary last so it lands on the far right. */
  children: ReactNode;
  /** Optional one-line status on the left — why the primary action is disabled. */
  start?: ReactNode;
}

const BAR_HEIGHT = 52;

interface ColumnBounds {
  left: number;
  width: number;
}

/**
 * The footer of every full-page form, pinned to the bottom edge of the screen
 * whether the form is two fields or two screens long.
 *
 * It is `fixed` rather than `sticky`: a sticky bar rests right under a short form
 * and floats mid-page. Being fixed, it has to match the content column itself —
 * the sidebar beside it is 270px, 80px or absent — so it measures the page's
 * Container and follows it through the sidebar's width transition. A spacer of
 * the same height stays in the flow, so scrolling to the end never leaves the
 * last field hidden under the bar.
 *
 * Its z-index stays under the app bar so menus, poppers, drawers and dialogs —
 * all above the app bar in MUI's scale — still open over it.
 */
export function FormActionBar({ children, start }: FormActionBarProps): ReactNode {
  const spacerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<ColumnBounds | null>(null);

  useLayoutEffect(() => {
    const column = spacerRef.current?.closest<HTMLElement>('.MuiContainer-root');
    if (column === null || column === undefined) return undefined;
    const measure = (): void => {
      const rect = column.getBoundingClientRect();
      setBounds({ left: rect.left, width: rect.width });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(column);
    // A left edge can move without the width changing, which the observer misses.
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <>
      <Box ref={spacerRef} aria-hidden sx={{ height: BAR_HEIGHT, mt: 2 }} />
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: bounds?.left ?? 0,
          width: bounds?.width ?? '100%',
          height: BAR_HEIGHT,
          zIndex: (theme) => theme.zIndex.appBar - 1,
          display: 'flex',
          alignItems: 'center',
          px: { xs: 2, sm: 3 },
          backgroundColor: 'background.paper',
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          boxShadow: '0 -4px 12px rgba(24, 28, 36, 0.06)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>{start}</Box>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {children}
          </Stack>
        </Stack>
      </Box>
    </>
  );
}
