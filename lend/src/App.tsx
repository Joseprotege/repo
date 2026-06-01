import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Toaster } from './components/common/Toaster';
import { GlobalVoiceListener } from './components/app/GlobalVoiceListener';
import './index.css';

// Eager: the landing page (first paint). Everything else is lazy so the initial
// bundle stays small and each route's code loads on demand.
import { Home } from './pages/Home';

const Browse       = lazy(() => import('./pages/Browse').then(m => ({ default: m.Browse })));
const ListingPage  = lazy(() => import('./pages/ListingPage').then(m => ({ default: m.ListingPage })));
const ProfilePage  = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CreateListing = lazy(() => import('./pages/CreateListing').then(m => ({ default: m.CreateListing })));
const Dashboard    = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const PulsePage    = lazy(() => import('./pages/PulsePage').then(m => ({ default: m.PulsePage })));
const LoginPage    = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage   = lazy(() => import('./pages/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const TermsPage    = lazy(() => import('./pages/legal/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage  = lazy(() => import('./pages/legal/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const ChatPage     = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })));
const FeePage      = lazy(() => import('./pages/FeePage').then(m => ({ default: m.FeePage })));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="animate-spin text-teal-500" size={28} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          {/* Global voice-call notifier — shows incoming call banner + fires
              browser Notification when a voice_request arrives for this user */}
          <GlobalVoiceListener />
          <div className="min-h-screen flex flex-col bg-slate-100">
            <Navbar />
            <main className="flex-1">
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* Public routes */}
                <Route path="/"            element={<Home />} />
                <Route path="/browse"      element={<Browse />} />
                <Route path="/listing/:id" element={<ListingPage />} />
                <Route path="/profile/:id" element={<ProfilePage />} />
                <Route path="/pulse"       element={<PulsePage />} />
                <Route path="/login"       element={<LoginPage />} />
                <Route path="/signup"      element={<SignupPage />} />
                <Route path="/legal/terms"   element={<TermsPage />} />
                <Route path="/legal/privacy" element={<PrivacyPage />} />
                <Route path="/fees"          element={<FeePage />} />

                {/* Protected routes — redirect to /login when Supabase is active */}
                <Route path="/create" element={
                  <ProtectedRoute><CreateListing /></ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute><Dashboard /></ProtectedRoute>
                } />
                <Route path="/chat/:offerId" element={
                  <ProtectedRoute><ChatPage /></ProtectedRoute>
                } />

                {/* 404 */}
                <Route path="*" element={
                  <div className="flex flex-col items-center justify-center py-32">
                    <div className="text-7xl mb-4">🗺️</div>
                    <h2 className="text-2xl font-bold text-slate-700 mb-2">Page not found</h2>
                    <a href="/" className="text-teal-600 font-semibold">← Go home</a>
                  </div>
                } />
              </Routes>
              </Suspense>
            </main>
            <Footer />
            <Toaster />
          </div>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
