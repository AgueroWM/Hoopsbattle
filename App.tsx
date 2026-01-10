import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import MobileDock from './components/MobileDock';
import Footer from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
import Home from './pages/Home';
import LiveHub from './pages/LiveHub';
import Bracket from './pages/Bracket';
import Highlights from './pages/Highlights';
import StatsCMS from './pages/StatsCMS';
import AdminDashboard from './pages/AdminDashboard';
import AdminMatch from './pages/AdminMatch';
import AdminModeration from './pages/AdminModeration';
import Schedule from './pages/Schedule';
import MatchDetails from './pages/MatchDetails';
import Rules from './pages/Rules';

const LayoutContent = () => {
  const location = useLocation();
  const isFeed = location.pathname === '/highlights';

  return (
    <div className="min-h-screen bg-hoops-bg text-white font-sans selection:bg-hoops-yellow selection:text-black flex flex-col">
      <Navbar />
      
      <main className="flex-grow relative z-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/live" element={<LiveHub />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/match/:id" element={<MatchDetails />} />
          <Route path="/bracket" element={<Bracket />} />
          <Route path="/highlights" element={<Highlights />} />
          <Route path="/teams" element={<StatsCMS />} />
          <Route path="/rules" element={<Rules />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/match/:id" element={<AdminMatch />} />
          <Route path="/admin/moderation" element={<AdminModeration />} />
          
          {/* Fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      {!isFeed && <Footer />}
      <MobileDock />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <LayoutContent />
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
