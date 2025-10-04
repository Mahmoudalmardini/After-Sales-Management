import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { UserRole } from './types';

// Layout components
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';

// Dashboard pages
import Dashboard from './pages/Dashboard';
import RequestsPage from './pages/requests/RequestsPage';
import RequestDetailsPage from './pages/requests/RequestDetailsPage';
import CreateRequestPage from './pages/requests/CreateRequestPage';
import CustomersPage from './pages/customers/CustomersPage';
import ProductsPage from './pages/products/ProductsPage';
import UsersPage from './pages/users/UsersPage';
import CreateUserPage from './pages/users/CreateUserPage';
import AccountsPage from './pages/accounts/AccountsPage';
import CreateAccountPage from './pages/accounts/CreateAccountPage';
import EditAccountPage from './pages/accounts/EditAccountPage';
import ProfilePage from './pages/ProfilePage';
import ReportsPage from './pages/reports/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import StoragePage from './pages/storage/StoragePage';
import StatusManagementPage from './pages/StatusManagementPage';
import SparePartRequestsPage from './pages/admin/SparePartRequestsPage';

// Clear Storage Page component
const ClearStoragePage: React.FC = () => {
  const { clearStorage } = useAuth();
  
  const handleClearStorage = () => {
    if (clearStorage) {
      clearStorage();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    window.location.href = '/login';
  };

  return (
    <div className="simple-test-container">
      <h1>Clear Storage</h1>
      <p>This will clear all stored authentication data and redirect you to the login page.</p>
      <button onClick={handleClearStorage} className="btn-primary">Clear Storage & Go to Login</button>
    </div>
  );
};

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Role-based redirect component
const RoleBasedRedirect: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === UserRole.WAREHOUSE_KEEPER) {
    return <Navigate to="/storage" replace />;
  }
  
  return <Navigate to="/dashboard" replace />;
};

// Role-based dashboard component (restricts warehouse keepers)
const RoleBasedDashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === UserRole.WAREHOUSE_KEEPER) {
    return <Navigate to="/storage" replace />;
  }
  
  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
};

// Public Route component (only accessible when not authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
};

function App() {
  // Simple test to see if basic rendering works
  if (window.location.search.includes('simple=true')) {
    return (
      <div className="simple-test-container">
        <h1>Simple Test - React is working!</h1>
        <p>If you can see this, React is rendering correctly.</p>
        <button onClick={() => window.location.href = '/'} className="btn-primary">Go to main app</button>
      </div>
    );
  }
  return (
    <div className="App">
      <Routes>
        {/* Debug routes */}
        <Route path="/debug" element={
          <div className="simple-test-container">
            <h1>Debug Page</h1>
            <p>Debug mode activated. If you can see this, the app is working correctly.</p>
            <button onClick={() => window.location.href = '/'} className="btn-primary">Go to main app</button>
          </div>
        } />
        
        {/* Clear storage route for debugging */}
        <Route path="/clear-storage" element={
          <ClearStoragePage />
        } />
        <Route path="/simple" element={
          <div className="simple-test-container">
            <h1>Simple Test - React is working!</h1>
            <p>If you can see this, React is rendering correctly.</p>
            <button onClick={() => window.location.href = '/'} className="btn-primary">Go to main app</button>
          </div>
        } />

        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleBasedRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleBasedDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RequestsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/requests/new"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CreateRequestPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/requests/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RequestDetailsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CustomersPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProductsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <UsersPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users/new"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CreateUserPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AccountsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/accounts/new"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CreateAccountPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/accounts/:id/edit"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <EditAccountPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProfilePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ReportsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/storage"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <StoragePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <NotificationsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/status-management"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <StatusManagementPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/spare-part-requests"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SparePartRequestsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
