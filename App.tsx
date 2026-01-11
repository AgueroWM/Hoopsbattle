import React, { ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
...
function App() {
  // Easter egg pour les curieux
  React.useEffect(() => {
    console.log("%c🏀 HOOPS BATTLE HUB %c\nDeveloped with ❤️ and caffeine by Doc.\nDon't break my code.", "font-size: 20px; font-weight: bold; color: #F4FF5F;", "font-size: 12px; color: #aaa;");
  }, []);

  return (
    <ErrorBoundary>
      <Analytics />
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
    </ErrorBoundary>
  );
}

export default App;