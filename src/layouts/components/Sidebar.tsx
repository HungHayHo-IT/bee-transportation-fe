import type { ReactNode } from 'react';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { railColors } from '@/theme';
import { SidebarItems } from './SidebarItems';

const EXPANDED_WIDTH = 270;
const COLLAPSED_WIDTH = 80;

export interface SidebarProps {
  isSidebarOpen: boolean;
  isSidebarHovered: boolean;
  onSidebarHoverChange: (isHovered: boolean) => void;
  isMobileSidebarOpen: boolean;
  onMobileSidebarClose: () => void;
}

export function Sidebar({
  isSidebarOpen,
  isSidebarHovered,
  onSidebarHoverChange,
  isMobileSidebarOpen,
  onMobileSidebarClose,
}: SidebarProps): ReactNode {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const isExpanded = isSidebarOpen || isSidebarHovered;
  const drawerWidth = isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
  const layoutWidth = isSidebarOpen ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  if (!isDesktop) {
    return (
      <Drawer
        anchor="left"
        open={isMobileSidebarOpen}
        onClose={onMobileSidebarClose}
        variant="temporary"
        slotProps={{
          paper: { sx: { width: EXPANDED_WIDTH, backgroundColor: railColors.background } },
        }}
      >
        <SidebarItems isExpanded />
      </Drawer>
    );
  }

  return (
    <Box
      sx={{
        width: layoutWidth,
        flexShrink: 0,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }}
      onMouseEnter={() => !isSidebarOpen && onSidebarHoverChange(true)}
      onMouseLeave={() => !isSidebarOpen && onSidebarHoverChange(false)}
    >
      <Drawer
        anchor="left"
        open
        variant="permanent"
        slotProps={{
          paper: {
            sx: {
              width: drawerWidth,
              boxSizing: 'border-box',
              overflowX: 'hidden',
              border: 'none',
              backgroundColor: railColors.background,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              zIndex: theme.zIndex.appBar - 1,
            },
          },
        }}
      >
        <SidebarItems isExpanded={isExpanded} />
      </Drawer>
    </Box>
  );
}
