import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, FileText, Activity, Crown } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => 
    location.pathname === path 
      ? 'text-hoops-yellow font-bold border-b-2 border-hoops-yellow' 
      : 'text-gray-400 hover:text-white transition-colors';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-7xl mx-auto glass-panel rounded-2xl px-6 h-16 flex items-center justify-between shadow-2xl shadow-black/50">
          
          <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-start">
            <Link to="/" className="flex-shrink-0 group flex items-center gap-3">
              {/* REMPLACEMENT PAR LE LOGO IMAGE */}
              <img 
                src="/logo.png" 
                alt="HOOPS BATTLE" 
                className="h-10 w-auto object-contain"
                onError={(e) => {
                    // Fallback texte si l'image n'existe pas encore
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden flex items-center gap-1">
                  <span className="text-3xl font-display font-bold italic tracking-wide text-white group-hover:text-hoops-yellow transition-colors">
                    HOOPS
                  </span>
                  <div className="h-6 w-0.5 bg-white/20 rotate-12"></div>
                  <span className="text-xl font-display text-hoops-yellow tracking-widest uppercase">
                    BATTLE
                  </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center space-x-6 text-sm uppercase tracking-wide font-medium">
              <Link to="/" className={isActive('/')}>Accueil</Link>
              <Link to="/live" className={`${isActive('/live')} flex items-center gap-2`}>
                <Activity size={16} className={location.pathname === '/live' ? 'text-red-500' : ''} />
                Live
              </Link>
              <Link to="/schedule" className={`${isActive('/schedule')} flex items-center gap-2`}>
                 <Trophy size={16} className="mb-0.5"/> Game Center
              </Link>
              <Link to="/leaderboard" className={`${isActive('/leaderboard')} flex items-center gap-2`}>
                 <Crown size={16} className="mb-0.5 text-hoops-yellow"/> Leaderboard
              </Link>
              <Link to="/teams" className={isActive('/teams')}>Teams</Link>
              <Link to="/rules" className={`${isActive('/rules')} flex items-center gap-2`}>
                 <FileText size={16} className="mb-0.5"/> Règlement
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
             <Link to="/admin" className="text-gray-600 hover:text-hoops-primary transition-colors p-2" title="Admin Area">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
               </svg>
             </Link>
          </div>
      </div>
    </nav>
  );
};

export default Navbar;