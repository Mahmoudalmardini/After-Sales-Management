import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastContainer } from 'react-toastify';

// Debug logging (can be removed in production)
console.log('React app starting...');

// Debug function to clear localStorage (for development)
(window as any).clearAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  console.log('Authentication storage cleared. Reload the page to see login.');
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found!');
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <I18nProvider>
            <SocketProvider>
              <App />
              <ToastContainer />
            </SocketProvider>
          </I18nProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
