// Developed by KBP (King of Best Practice) - 2026
import React, { ErrorInfo, ReactNode, useEffect } from 'react';
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

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Composant de gestion d'erreur global pour éviter l'écran blanc
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Helper pour afficher l'erreur proprement même si c'est un objet bizarre
      const errorMsg = this.state.error instanceof Error 
          ? this.state.error.toString() 
          : JSON.stringify(this.state.error, null, 2);

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white p-8 text-center font-sans">
            <div className="max-w-lg">
                <div className="text-6xl mb-4">🤕</div>
                <h1 className="text-3xl font-bold text-red-500 mb-4 font-display uppercase italic">Faute technique !</h1>
                <p className="text-gray-400 mb-6">Une erreur est survenue lors du chargement de l'application.</p>
                
                <div className="bg-black/50 p-4 rounded text-left font-mono text-xs mb-6 overflow-auto border border-white/10 text-red-300 whitespace-pre-wrap">
                    {errorMsg}
                </div>
                
                <button 
                    onClick={() => window.location.reload()} 
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider transition-all"
                >
                    Recharger la page
                </button>
            </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

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
    <ErrorBoundary>
      {/* Utilisation de HashRouter pour éviter les erreurs de navigation sur les environnements statiques */}
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