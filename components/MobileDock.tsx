import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Trophy, Shield, Gamepad2, FileText } from 'lucide-react';

const MobileDock: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => 
    location.pathname === path 
      ? 'text-hoops-yellow translate-y-[-5px]' 
      : 'text-gray-400 hover:text-white';

  const navItems = [
    { path: '/', label: 'Live', icon: <Home size={22} /> },
    { path: '/schedule', label: 'Matchs', icon: <Trophy size={22} /> },
    { path: '/highlights', label: 'Feed', icon: <Gamepad2 size={22} /> },
    { path: '/teams', label: 'Équipes', icon: <Users size={22} /> },
    { path: '/rules', label: 'Règles', icon: <FileText size={22} /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      <div className="bg-[#0f172a]/95 backdrop-blur-xl border-t border-white/10 px-6 py-3 flex justify-between items-end shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive(item.path)}`}
          >
            {item.icon}
            <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MobileDock;