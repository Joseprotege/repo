import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Home } from './pages/Home';
import { Browse } from './pages/Browse';
import { ListingPage } from './pages/ListingPage';
import { ProfilePage } from './pages/ProfilePage';
import { CreateListing } from './pages/CreateListing';
import { Dashboard } from './pages/Dashboard';
import { PulsePage } from './pages/PulsePage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { TermsPage } from './pages/legal/TermsPage';
import { PrivacyPage } from './pages/legal/PrivacyPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <div className="min-h-screen flex flex-col bg-slate-100">
            <Navbar />
            <main className="flex-1">
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

                {/* Protected routes — redirect to /login when Supabase is active */}
                <Route path="/create" element={
                  <ProtectedRoute><CreateListing /></ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute><Dashboard /></ProtectedRoute>
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
            </main>
            <Footer />
          </div>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
