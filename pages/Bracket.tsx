import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { Trophy, Calendar } from 'lucide-react';

export default function Bracket() {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
        const data = await api.matches.getSchedule();
        setMatches(data);
    }
    load();
  }, []);

  const getMatchByPartial = (dateStr: string, index: number) => {
      const daysMatches = matches.filter(m => m.start_time.includes(dateStr));
      return daysMatches[index] || null;
  };

  return (
    <div className="min-h-screen bg-[#020617] pt-24 pb-24 overflow-x-hidden font-sans">
        
        {/* HERO TITLE */}
        <div className="text-center mb-16 px-4">
             <div className="inline-block bg-hoops-yellow text-black font-black uppercase tracking-widest text-xs px-3 py-1 rounded mb-4 transform -rotate-2">
                 Phase Finale
             </div>
             <h1 className="text-5xl md:text-8xl font-display font-bold italic uppercase text-white tracking-tighter leading-none mb-4">
                 Hoops <span className="text-transparent bg-clip-text bg-gradient-to-r from-hoops-primary to-purple-500">Battle</span>
             </h1>
             <p className="text-gray-400 font-mono text-sm">Road to Glory • Janvier 2026</p>
        </div>

        {/* BRACKET CONTAINER */}
        {/* CORRECTION CRITIQUE: justify-center retiré pour permettre le scroll horizontal complet */}
        <div className="w-full overflow-x-auto pb-12 px-4">
            <div className="min-w-[1000px] max-w-[1400px] mx-auto flex justify-between items-center relative">
                
                {/* --- COLONNE GAUCHE --- */}
                <div className="flex flex-col gap-12 w-80">
                    {/* GROUPE JAUNE (10/01) */}
                    <div className="bg-white/5 rounded-2xl p-4 border-l-4 border-hoops-yellow relative">
                        <div className="absolute -left-3 top-4 w-6 h-6 rounded-full bg-hoops-yellow flex items-center justify-center text-black font-bold text-xs">A</div>
                        <div className="flex items-center gap-2 mb-4 text-hoops-yellow font-bold uppercase text-xs tracking-widest border-b border-white/10 pb-2 pl-4">
                            <Calendar size={12}/> Qualifications 10/01
                        </div>
                        <div className="space-y-4">
                            <MatchCard match={getMatchByPartial('2026-01-10', 0)} />
                            <MatchCard match={getMatchByPartial('2026-01-10', 1)} />
                            <MatchCard match={getMatchByPartial('2026-01-10', 2)} />
                        </div>
                    </div>

                    {/* GROUPE BLEU (17/01) */}
                    <div className="bg-white/5 rounded-2xl p-4 border-l-4 border-blue-500 relative">
                        <div className="absolute -left-3 top-4 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">B</div>
                        <div className="flex items-center gap-2 mb-4 text-blue-500 font-bold uppercase text-xs tracking-widest border-b border-white/10 pb-2 pl-4">
                            <Calendar size={12}/> Qualifications 17/01
                        </div>
                        <div className="space-y-4">
                            <MatchCard match={getMatchByPartial('2026-01-17', 0)} />
                            <MatchCard match={getMatchByPartial('2026-01-17', 1)} />
                            <MatchCard match={getMatchByPartial('2026-01-17', 2)} />
                        </div>
                    </div>
                </div>

                {/* --- CONNECTOR LEFT --- */}
                <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent mx-8 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white/20 rounded-full"></div>
                </div>

                {/* --- COLONNE CENTRALE (FINALE) --- */}
                <div className="w-96 relative z-10 shrink-0">
                    <div className="absolute inset-0 bg-hoops-primary/20 blur-3xl rounded-full"></div>
                    <div className="relative bg-[#020617] border-2 border-hoops-primary rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                        <Trophy size={48} className="mx-auto text-hoops-primary mb-4 drop-shadow-lg" />
                        <h2 className="font-display font-bold uppercase text-4xl italic text-white mb-2">Grande Finale</h2>
                        <div className="text-xs font-bold bg-hoops-primary text-white px-4 py-1.5 rounded-full inline-block mb-8 uppercase tracking-widest">
                            24 Janvier 2026
                        </div>
                        
                        {/* THE FINAL MATCH CARD */}
                        <div className="transform scale-110">
                            <MatchCard match={getMatchByPartial('2026-01-25', 2) || getMatchByPartial('2026-01-24', 0)} isBig />
                        </div>
                    </div>
                </div>

                {/* --- CONNECTOR RIGHT --- */}
                <div className="flex-1 h-px bg-gradient-to-l from-white/20 to-transparent mx-8 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white/20 rounded-full"></div>
                </div>

                {/* --- COLONNE DROITE --- */}
                <div className="flex flex-col gap-12 w-80">
                     {/* GROUPE VERT (11/01) */}
                     <div className="bg-white/5 rounded-2xl p-4 border-r-4 border-green-500 relative">
                        <div className="absolute -right-3 top-4 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs">C</div>
                        <div className="flex items-center justify-end gap-2 mb-4 text-green-500 font-bold uppercase text-xs tracking-widest border-b border-white/10 pb-2 pr-4">
                            Qualifications 11/01 <Calendar size={12}/> 
                        </div>
                        <div className="space-y-4">
                            <MatchCard match={getMatchByPartial('2026-01-11', 0)} />
                            <MatchCard match={getMatchByPartial('2026-01-11', 1)} />
                            <MatchCard match={getMatchByPartial('2026-01-11', 2)} />
                        </div>
                    </div>

                    {/* GROUPE ORANGE (18/01) */}
                    <div className="bg-white/5 rounded-2xl p-4 border-r-4 border-orange-500 relative">
                        <div className="absolute -right-3 top-4 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">D</div>
                        <div className="flex items-center justify-end gap-2 mb-4 text-orange-500 font-bold uppercase text-xs tracking-widest border-b border-white/10 pb-2 pr-4">
                            Qualifications 18/01 <Calendar size={12}/> 
                        </div>
                        <div className="space-y-4">
                            <MatchCard match={getMatchByPartial('2026-01-18', 0)} />
                            <MatchCard match={getMatchByPartial('2026-01-18', 1)} />
                            <MatchCard match={getMatchByPartial('2026-01-18', 2)} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}

function MatchCard({ match, isBig }: { match?: any, isBig?: boolean }) {
    if (!match) {
        return (
            <div className={`border-2 border-dashed border-white/10 rounded-xl bg-black/20 flex items-center justify-center text-gray-600 font-bold uppercase text-xs ${isBig ? 'h-32' : 'h-16'}`}>
                À déterminer
            </div>
        )
    }

    const teamA = match.team_a || match.teamA;
    const teamB = match.team_b || match.teamB;

    return (
        <Link to={`/match/${match.id}`} className={`block bg-hoops-card border border-white/10 rounded-xl overflow-hidden hover:border-white/40 transition-all group ${isBig ? 'transform hover:scale-105 shadow-2xl' : 'hover:translate-x-1'}`}>
             <div className={`flex justify-between items-center ${isBig ? 'p-4' : 'p-2 px-3'} border-b border-white/5 bg-white/5 group-hover:bg-white/10 transition-colors`}>
                 <span className={`font-bold uppercase truncate ${isBig ? 'text-lg' : 'text-xs'}`}>{teamA?.name}</span>
                 <span className={`font-mono font-bold ${isBig ? 'text-2xl' : 'text-sm'} ${match.score_team_a > match.score_team_b ? 'text-hoops-yellow' : 'text-gray-500'}`}>{match.score_team_a ?? '-'}</span>
             </div>
             <div className={`flex justify-between items-center ${isBig ? 'p-4' : 'p-2 px-3'} group-hover:bg-white/5 transition-colors`}>
                 <span className={`font-bold uppercase truncate ${isBig ? 'text-lg' : 'text-xs'}`}>{teamB?.name}</span>
                 <span className={`font-mono font-bold ${isBig ? 'text-2xl' : 'text-sm'} ${match.score_team_b > match.score_team_a ? 'text-hoops-yellow' : 'text-gray-500'}`}>{match.score_team_b ?? '-'}</span>
             </div>
        </Link>
    )
}