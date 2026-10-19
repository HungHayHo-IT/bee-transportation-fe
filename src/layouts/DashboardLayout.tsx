import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Container } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { BeeLoaderHost } from '@/components/BeeLoader';
import { NotificationProvider } from '@/store/NotificationProvider';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

export function DashboardLayout(): ReactNode {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <NotificationProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          isSidebarHovered={isSidebarHovered}
          onSidebarHoverChange={setIsSidebarHovered}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onMobileSidebarClose={() => setIsMobileSidebarOpen(false)}
        />

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            // Flex children default to min-width auto, which lets a wide table push
            // the wrapper past the viewport and drag the sticky header with it.
            minWidth: 0,
          }}
        >
          <Header
            onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          />
          <BeeLoaderHost>
            <Container maxWidth={false} sx={{ pt: 3, pb: 6 }}>
              <Box sx={{ minHeight: 'calc(100vh - 170px)' }}>
                <Outlet />
              </Box>
            </Container>
          </BeeLoaderHost>
        </Box>
      </Box>
    </NotificationProvider>
  );
}
