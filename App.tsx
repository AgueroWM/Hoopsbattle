// Developed by KBP (King of Best Practice) - 2026
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import MobileDock from './components/MobileDock';
import Footer from './components/Footer'; // Import du Footer
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
import Leaderboard from './pages/Leaderboard';

// Composant pour masquer le footer sur le feed (highlights)
const ConditionalFooter = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/highlights')) return null;
  return <Footer />;
};

const ConditionalMobileDock = () => {
  // Le dock est maintenant affiché partout pour faciliter la navigation
  return <MobileDock />;
};

function App() {
  // Initialisation du module (KBP)
  useEffect(() => {
    console.log("Hoops Game Hub - KBP Edition 2026");
    console.log("Initialisation des services terminée.");
  }, []);

  return (
      /* Utilisation de HashRouter pour éviter les erreurs de navigation sur les environnements statiques */
      <HashRouter>
        <div className="min-h-screen bg-hoops-bg text-white font-sans selection:bg-hoops-yellow selection:text-black flex flex-col">
          <Navbar />
          <div className="flex-grow relative z-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/live" element={<LiveHub />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/match/:id" element={<MatchDetails />} />
              <Route path="/bracket" element={<Bracket />} />
              <Route path="/highlights" element={<Highlights />} />
              <Route path="/teams" element={<StatsCMS />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/match/:id" element={<AdminMatch />} />
              <Route path="/admin/moderation" element={<AdminModeration />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </div>
          <ConditionalFooter />
          <ConditionalMobileDock />
        </div>
      </HashRouter>
  );
}

export default App;