import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  // Placeholder logos - À remplacer par les vrais URLs
  const sponsors = [
    { name: 'Hoops Game', url: '/partners/logo_hoops_game.jpg' },
    { name: 'Omega Sport', url: '/partners/logo_omega_sport.jpg' }
  ];

  return (
    <footer className="bg-black/80 backdrop-blur-xl border-t border-white/5 pt-12 pb-32 md:pb-12 mt-12">
      <div className="max-w-7xl mx-auto px-4">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            {/* Event Logo Area */}
            <div className="flex flex-col items-center md:items-start gap-4">
                <div className="flex items-center gap-2">
                     {/* Logo Evenement - Placeholder texte stylisé si pas d'image */}
                     <span className="text-4xl font-display font-bold italic tracking-wide text-white">
                        HOOPS <span className="text-hoops-yellow">BATTLE</span>
                     </span>
                </div>
                <p className="text-gray-500 text-sm max-w-xs text-center md:text-left">
                    L'événement streetball de référence. 
                    20 Équipes, 1 Trophée, la Gloire Éternelle.
                </p>
            </div>

            {/* Links */}
            <div className="flex gap-8 text-sm font-bold uppercase tracking-wider text-gray-400">
                <Link to="/rules" className="hover:text-white transition-colors">Règlement</Link>
                <Link to="/schedule" className="hover:text-white transition-colors">Planning</Link>
                <Link to="/teams" className="hover:text-white transition-colors">Équipes</Link>
            </div>
        </div>

        {/* SPONSORS GRID */}
        <div className="border-t border-white/10 pt-8">
            <p className="text-center text-[10px] font-bold uppercase text-gray-600 mb-6 tracking-[0.2em]">
                Partenaires Officiels
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 hover:opacity-100 transition-opacity duration-500 grayscale hover:grayscale-0">
                {sponsors.map((s, i) => (
                    <div key={i} className="h-8 md:h-12 w-auto flex items-center justify-center">
                        {/* On utilise des filtres CSS pour rendre les logos blancs par défaut */}
                        <img 
                            src={s.url} 
                            alt={s.name} 
                            className="h-full w-auto object-contain" 
                        />
                    </div>
                ))}
            </div>
        </div>

        <div className="text-center mt-12 text-[10px] text-gray-700 font-mono">
            &copy; 2026 HOOPS BATTLE ORGANIZATION. ALL RIGHTS RESERVED.
        </div>
      </div>
    </footer>
  );
};

export default Footer;