import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

const HEADER_HEIGHT = 64;
/** A load faster than this never shows the overlay, so quick calls do not flash. */
const SHOW_DELAY_MS = 300;
/** Once shown, long enough for the truck to drive in and settle (it lands at 1.0s). */
const MIN_VISIBLE_MS = 1000;

/** `isActive` filtered through the show delay and the minimum visible time. */
function useDelayedVisibility(isActive: boolean): boolean {
  const [isVisible, setIsVisible] = useState(false);
  const shownAtRef = useRef(0);

  useEffect(() => {
    if (isActive && !isVisible) {
      const timer = setTimeout(() => {
        shownAtRef.current = Date.now();
        setIsVisible(true);
      }, SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    }
    if (!isActive && isVisible) {
      const remaining = MIN_VISIBLE_MS - (Date.now() - shownAtRef.current);
      const timer = setTimeout(() => setIsVisible(false), Math.max(0, remaining));
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isActive, isVisible]);

  return isVisible;
}

/** Set inside the dashboard shell: loaders report there instead of drawing their own overlay. */
const LoaderHostContext = createContext<((delta: number) => void) | null>(null);

function BeeOverlay({ isContained }: { isContained: boolean }): ReactNode {
  const { t } = useTranslation();

  // Freeze the page behind the overlay; the click blocking comes from the overlay itself.
  useEffect(() => {
    // Cleared rather than restored: two overlapping overlays would otherwise
    // restore each other's 'hidden' and leave the page stuck.
    const root = document.documentElement;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = '';
    };
  }, []);

  return (
    <Box
      role="progressbar"
      aria-label={t('common.states.loading')}
      sx={{
        position: isContained ? 'absolute' : 'fixed',
        inset: 0,
        // Contained: under the sticky header, over the page. Standalone: over everything.
        zIndex: (theme) => (isContained ? theme.zIndex.appBar - 1 : theme.zIndex.modal + 1),
        bgcolor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Sticky so the logo stays centred in the visible part of a page taller than the screen. */}
      <Box
        sx={{
          position: 'sticky',
          top: isContained ? HEADER_HEIGHT : 0,
          height: isContained ? `min(100%, calc(100vh - ${HEADER_HEIGHT}px))` : '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box component="img" src="/bee-loader.svg" alt="" sx={{ width: 260, maxWidth: '70%' }} />
      </Box>
    </Box>
  );
}

/**
 * The animated Bee loader. Inside `BeeLoaderHost` it dims only the content area,
 * leaving sidebar and header usable; anywhere else it covers the whole screen.
 */
export function BeeLoader(): ReactNode {
  const report = useContext(LoaderHostContext);
  // Standalone loaders unmount the moment loading ends, so only the show delay applies to them.
  const isVisible = useDelayedVisibility(true);
  useEffect(() => {
    if (!report) return undefined;
    report(1);
    return () => report(-1);
  }, [report]);
  return report || !isVisible ? null : <BeeOverlay isContained={false} />;
}

/** Wraps the content area; draws one overlay however many loaders are mounted inside. */
export function BeeLoaderHost({ children }: { children: ReactNode }): ReactNode {
  const [count, setCount] = useState(0);
  const report = useCallback((delta: number) => setCount((current) => current + delta), []);
  const isVisible = useDelayedVisibility(count > 0);
  return (
    <LoaderHostContext.Provider value={report}>
      <Box sx={{ position: 'relative', flexGrow: 1 }}>
        {/* inert: no keyboard focus or actions reach the page while it is loading. */}
        <Box inert={count > 0 || isVisible}>{children}</Box>
        {isVisible && <BeeOverlay isContained />}
      </Box>
    </LoaderHostContext.Provider>
  );
}
