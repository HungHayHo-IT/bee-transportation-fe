import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/vi';
import App from './App';
import { beeOpsTheme } from '@/theme';
import '@/locales';
import '@/styles/tailwind.css';
import '@/styles/globals.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element #root is missing from index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme={beeOpsTheme}>
      <CssBaseline />
      {/* Every date control reads DD/MM/YYYY and a Vietnamese calendar from here. */}
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
        <App />
      </LocalizationProvider>
    </ThemeProvider>
  </StrictMode>,
);
