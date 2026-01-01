import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';
import { useThemeStore } from './stores';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize theme
function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const initTheme = useThemeStore((state) => state.initTheme);
  
  React.useEffect(() => {
    initTheme();
  }, [initTheme]);
  
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer>
        <App />
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          toastOptions={{
            duration: 4000,
            classNames: {
              toast: 'font-sans',
            },
          }}
        />
      </ThemeInitializer>
    </QueryClientProvider>
  </React.StrictMode>
);
