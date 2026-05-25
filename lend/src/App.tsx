import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { Browse } from './pages/Browse';
import { ListingPage } from './pages/ListingPage';
import { ProfilePage } from './pages/ProfilePage';
import { CreateListing } from './pages/CreateListing';
import { Dashboard } from './pages/Dashboard';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="min-h-screen flex flex-col bg-slate-100">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/"              element={<Home />} />
              <Route path="/browse"        element={<Browse />} />
              <Route path="/listing/:id"   element={<ListingPage />} />
              <Route path="/profile/:id"   element={<ProfilePage />} />
              <Route path="/create"        element={<CreateListing />} />
              <Route path="/dashboard"     element={<Dashboard />} />
              <Route path="*"              element={
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
    </BrowserRouter>
  );
}
