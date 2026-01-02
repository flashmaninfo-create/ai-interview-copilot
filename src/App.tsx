/**
 * Main Application Component
 *
 * Sets up routing, authentication context, and layouts.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { GlobalErrorBoundary } from './components/common/GlobalErrorBoundary';

// Layouts
import { MainLayout } from './layouts/MainLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Public Pages
import { HomePage } from './pages/HomePage';
import { ContactPage } from './pages/ContactPage';
import { PricingPage } from './pages/PricingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Dashboard Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';

import { LiveConsolePage } from './pages/dashboard/LiveConsolePage';
import { InterviewHistoryPage } from './pages/dashboard/InterviewHistoryPage';
import { SessionDetailsPage } from './pages/dashboard/SessionDetailsPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { CreditsPage } from './pages/dashboard/CreditsPage';
import { AdminPage } from './pages/dashboard/AdminPage';
import { NewSessionPage } from './pages/dashboard/NewSessionPage';
import { AdminPlansPage } from './pages/admin/AdminPlansPage';
import { AdminPlanEditorPage } from './pages/admin/AdminPlanEditorPage';
import { AdminProvidersPage } from './pages/admin/AdminProvidersPage';
import { AdminProviderEditorPage } from './pages/admin/AdminProviderEditorPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';

// Route Guards
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';

function App() {
  return (
    <GlobalErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* ============================================ */}
              {/* Public Routes */}
              {/* ============================================ */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Route>

              {/* ============================================ */}
              {/* Auth Routes (Public, but redirect if logged in) */}
              {/* ============================================ */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* ============================================ */}
              {/* Error Pages */}
              {/* ============================================ */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* ============================================ */}
              {/* Protected Dashboard Routes */}
              {/* ============================================ */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  {/* Main Dashboard */}
                  <Route path="/dashboard" element={<DashboardPage />} />

                  {/* New Session */}
                  <Route path="/dashboard/new" element={<NewSessionPage />} />

                  {/* Interview Session */}
                  <Route path="/dashboard/console" element={<LiveConsolePage />} />


                  {/* History */}
                  <Route path="/dashboard/history" element={<InterviewHistoryPage />} />
                  <Route path="/dashboard/history/:sessionId" element={<SessionDetailsPage />} />

                  {/* Credits */}
                  <Route path="/dashboard/credits" element={<CreditsPage />} />

                  {/* Settings */}
                  <Route path="/dashboard/settings" element={<SettingsPage />} />

                  {/* ======================================== */}
                  {/* Admin Routes (Nested under Protected) */}
                  {/* ======================================== */}
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/admin/users" element={<AdminUsersPage />} />
                    <Route path="/admin/plans" element={<AdminPlansPage />} />
                    <Route path="/admin/plans/new" element={<AdminPlanEditorPage />} />
                    <Route path="/admin/plans/:id" element={<AdminPlanEditorPage />} />

                    {/* Providers */}
                    <Route path="/admin/providers" element={<AdminProvidersPage />} />
                    <Route path="/admin/providers/new" element={<AdminProviderEditorPage />} />
                    <Route path="/admin/providers/:id" element={<AdminProviderEditorPage />} />
                  </Route>
                </Route>
              </Route>

              {/* ============================================ */}
              {/* 404 Not Found - Catch All */}
              {/* ============================================ */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </NotificationProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
