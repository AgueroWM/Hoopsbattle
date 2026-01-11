import React, { ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import LiveHub from './pages/LiveHub';
import Schedule from './pages/Schedule';
import MatchDetails from './pages/MatchDetails';
import Bracket from './pages/Bracket';
import Highlights from './pages/Highlights';
import StatsCMS from './pages/StatsCMS';
import Rules from './pages/Rules';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminMatch from './pages/AdminMatch';
import AdminModeration from './pages/AdminModeration';
import Footer from './components/Footer';
import MobileDock from './components/MobileDock';

class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-center text-red-500">Something went wrong. Please refresh.</div>;
    }

    return this.props.children;
  }
}

const ConditionalFooter = () => {
  const location = useLocation();
  const hideFooter = location.pathname.startsWith('/admin') || location.pathname === '/live';
  return hideFooter ? null : <Footer />;
};

const ConditionalMobileDock = () => {
  const location = useLocation();
  const hideDock = location.pathname.startsWith('/admin');
  return hideDock ? null : <MobileDock />;
};

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