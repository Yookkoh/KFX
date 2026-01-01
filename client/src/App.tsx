import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores';

// Layout
import { Layout } from './components/layout/Layout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { CardsPage } from './pages/CardsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PartnersPage } from './pages/PartnersPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';

// Loading spinner component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirects to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && !needsOnboarding) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Onboarding route wrapper
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!needsOnboarding) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        
        {/* Onboarding route */}
        <Route
          path="/onboarding"
          element={
            <OnboardingRoute>
              <OnboardingPage />
            </OnboardingRoute>
          }
        />
        
        {/* Accept invitation (can be accessed by anyone) */}
        <Route path="/invite/:token" element={<AcceptInvitePage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
