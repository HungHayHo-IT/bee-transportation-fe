import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { SessionProvider } from '@/store/SessionProvider';
import { AppRoutes } from '@/routes/AppRoutes';

export default function App(): ReactNode {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      autoHideDuration={3500}
    >
      <BrowserRouter>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </BrowserRouter>
    </SnackbarProvider>
  );
}
