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
import { DashboardLayout } from './layouts/DashboardLayout';
import { LandingLayout } from './layouts/LandingLayout';
import { AdminLayout } from './layouts/AdminLayout';



// Public Pages
import { HomePage } from './pages/HomePage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { AboutPage } from './pages/AboutPage';
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
import { NewSessionPage } from './pages/dashboard/NewSessionPage';

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminAdminsPage } from './pages/admin/AdminAdminsPage';
import { AdminPlansPage } from './pages/admin/AdminPlansPage';
import { AdminPlanEditorPage } from './pages/admin/AdminPlanEditorPage';
import { AdminProvidersPage } from './pages/admin/AdminProvidersPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminCreditPage } from './pages/admin/AdminCreditPage';

// Route Guards
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminProtectedRoute } from './components/auth/AdminProtectedRoute';

function App() {
  return (
    <GlobalErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* ============================================ */}
              {/* Public Routes with Light Theme */}
              {/* ============================================ */}
              <Route element={<LandingLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/about" element={<AboutPage />} />
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
              {/* Protected User Dashboard Routes */}
              {/* ============================================ */}
              <Route element={<ProtectedRoute />}>
                {/* Full Page Console (No Sidebar) */}
                <Route path="/dashboard/console" element={<LiveConsolePage />} />

                <Route element={<DashboardLayout />}>
                  {/* Main Dashboard */}
                  <Route path="/dashboard" element={<DashboardPage />} />

                  {/* New Session */}
                  <Route path="/dashboard/new" element={<NewSessionPage />} />



                  {/* History */}
                  <Route path="/dashboard/history" element={<InterviewHistoryPage />} />
                  <Route path="/dashboard/history/:sessionId" element={<SessionDetailsPage />} />

                  {/* Credits */}
                  <Route path="/dashboard/credits" element={<CreditsPage />} />

                  {/* Settings */}
                  <Route path="/dashboard/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              {/* ============================================ */}
              {/* Admin Portal (Separate from User Dashboard) */}
              {/* ============================================ */}
              {/* Admin Login - Public */}
              <Route path="/admin" element={<AdminLoginPage />} />

              {/* Admin Protected Routes */}
              <Route element={<AdminProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/admins" element={<AdminAdminsPage />} />
                  <Route path="/admin/plans" element={<AdminPlansPage />} />
                  <Route path="/admin/plans/new" element={<AdminPlanEditorPage />} />
                  <Route path="/admin/plans/:id" element={<AdminPlanEditorPage />} />
                  <Route path="/admin/providers" element={<AdminProvidersPage />} />
                  <Route path="/admin/payments" element={<AdminPaymentsPage />} />
                  <Route path="/admin/credit" element={<AdminCreditPage />} />
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

