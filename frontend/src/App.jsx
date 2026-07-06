import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/index.js';
import MainLayout from './components/layout/MainLayout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import LoadingScreen from './components/ui/LoadingScreen.jsx';
import AuthInitializer from './components/auth/AuthInitializer.jsx';
import { SocketProvider } from './context/SocketContext.jsx';

// Lazy loaded pages
const Home = lazy(() => import('./pages/Home.jsx'));
const MovieDetail = lazy(() => import('./pages/MovieDetail.jsx'));
const Theatres = lazy(() => import('./pages/Theatres.jsx'));
const SeatSelection = lazy(() => import('./pages/SeatSelection.jsx'));
const BookingSummary = lazy(() => import('./pages/BookingSummary.jsx'));
const Payment = lazy(() => import('./pages/Payment.jsx'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess.jsx'));
const PaymentFailed = lazy(() => import('./pages/PaymentFailed.jsx'));
const BookingHistory = lazy(() => import('./pages/BookingHistory.jsx'));
const TicketPage = lazy(() => import('./pages/TicketPage.jsx'));
const UserProfile = lazy(() => import('./pages/UserProfile.jsx'));
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail.jsx'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminMovies = lazy(() => import('./pages/admin/Movies.jsx'));
const AdminTheatres = lazy(() => import('./pages/admin/Theatres.jsx'));
const AdminShows = lazy(() => import('./pages/admin/Shows.jsx'));
const AdminBookings = lazy(() => import('./pages/admin/Bookings.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/Users.jsx'));
const AdminCoupons = lazy(() => import('./pages/admin/Coupons.jsx'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics.jsx'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      cacheTime: 1000 * 60 * 10, // 10 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

// Auth Route (redirect if logged in)
const AuthRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer>
          <SocketProvider>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
              <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />

              {/* Main App Routes */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Home />} />
                <Route path="movies/:slug" element={<MovieDetail />} />
                <Route path="theatres" element={<Theatres />} />
                <Route path="shows/:showId/seats" element={
                  <ProtectedRoute><SeatSelection /></ProtectedRoute>
                } />
                <Route path="booking/summary" element={
                  <ProtectedRoute><BookingSummary /></ProtectedRoute>
                } />
                <Route path="booking/payment" element={
                  <ProtectedRoute><Payment /></ProtectedRoute>
                } />
                <Route path="booking/success" element={
                  <ProtectedRoute><PaymentSuccess /></ProtectedRoute>
                } />
                <Route path="booking/failed" element={
                  <ProtectedRoute><PaymentFailed /></ProtectedRoute>
                } />
                <Route path="bookings" element={
                  <ProtectedRoute><BookingHistory /></ProtectedRoute>
                } />
                <Route path="bookings/:id/ticket" element={
                  <ProtectedRoute><TicketPage /></ProtectedRoute>
                } />
                <Route path="profile" element={
                  <ProtectedRoute><UserProfile /></ProtectedRoute>
                } />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="movies" element={<AdminMovies />} />
                <Route path="theatres" element={<AdminTheatres />} />
                <Route path="shows" element={<AdminShows />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="analytics" element={<AdminAnalytics />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </SocketProvider>
        </AuthInitializer>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1a2e',
              color: '#f0f0f8',
              border: '1px solid #2d2d4a',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#f0f0f8' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#f0f0f8' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
