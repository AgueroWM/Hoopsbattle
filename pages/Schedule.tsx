import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Schedule() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     async function load() {
         const data = await api.matches.getSchedule();
         setMatches(data);
         setLoading(false);
     }
     load();
  }, []);

  // Group by Date
  const grouped = matches.reduce((acc: any, match) => {
      const date = new Date(match.start_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!acc[date]) acc[date] = [];
      acc[date].push(match);
      return acc;
  }, {});

  return (
    <div className="min-h-screen bg-hoops-bg text-white pb-32 pt-24 px-4 max-w-5xl mx-auto font-sans">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
         <div>
             <h1 className="text-4xl md:text-6xl font-display font-bold uppercase italic text-white mb-2">
                 Game <span className="text-hoops-yellow">Center</span>
             </h1>
             <p className="text-gray-400 border-l-2 border-hoops-primary pl-3">
                 Toutes les rencontres, résultats et statistiques.
             </p>
         </div>
         
         <Link to="/bracket" className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all">
             <Trophy size={18} className="text-hoops-yellow"/> Voir le Tableau Final
         </Link>
      </div>

      {loading ? (
          <div className="py-20 text-center text-gray-500">Chargement du planning...</div>
      ) : Object.keys(grouped).length === 0 ? (
          <div className="py-20 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
              Aucun match trouvé.
          </div>
      ) : (
          <div className="space-y-12">
              {Object.entries(grouped).map(([date, dayMatches]: any) => (
                  <div key={date}>
                      <div className="flex items-center gap-4 mb-6 sticky top-20 z-10 py-4 bg-hoops-bg/95 backdrop-blur border-b border-white/10">
                          <div className="bg-hoops-primary text-white p-2 rounded-lg">
                              <Calendar size={20} />
                          </div>
                          <h2 className="text-xl font-bold uppercase tracking-widest first-letter:uppercase">{date}</h2>
                      </div>

                      <div className="grid gap-4">
                          {dayMatches.map((m: any) => (
                              <MatchRow key={m.id} match={m} />
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}

function MatchRow({ match }: any) {
    const isLive = match.status === 'live';
    const isFinished = match.status === 'finished';

    // CORRECTION CRITIQUE: Support des deux formats (DB vs Mock)
    const teamA = match.team_a || match.teamA;
    const teamB = match.team_b || match.teamB;

    if (!teamA || !teamB) return null;

    return (
        <Link to={`/match/${match.id}`} className="group relative overflow-hidden bg-hoops-card border border-white/5 rounded-2xl hover:border-hoops-primary/50 transition-all hover:transform hover:scale-[1.01] hover:shadow-xl">
            {isLive && <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse"></div>}
            
            <div className="flex flex-col md:flex-row items-stretch">
                {/* Time Column */}
                <div className="bg-black/20 p-4 md:w-32 flex flex-row md:flex-col items-center justify-between md:justify-center border-b md:border-b-0 md:border-r border-white/5">
                    <span className="font-mono font-bold text-lg text-white">
                        {new Date(match.start_time).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${isLive ? 'bg-red-600 text-white' : isFinished ? 'bg-gray-700 text-gray-400' : 'bg-blue-900/30 text-blue-300'}`}>
                        {isLive ? 'EN DIRECT' : isFinished ? 'TERMINÉ' : 'À VENIR'}
                    </span>
                </div>

                {/* Matchup */}
                <div className="flex-1 p-4 md:p-6 flex items-center justify-between gap-4">
                    {/* Team A */}
                    <div className="flex-1 flex items-center justify-end gap-3 md:gap-6 text-right">
                        <span className="font-black italic uppercase text-sm md:text-xl leading-none">{teamA.name}</span>
                        <img src={teamA.logoUrl} className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-black object-cover border border-white/10" onError={(e) => e.currentTarget.style.display='none'}/>
                    </div>

                    {/* Score Center */}
                    <div className="w-20 md:w-32 flex flex-col items-center justify-center shrink-0">
                        {isFinished || isLive ? (
                            <div className="font-mono text-2xl md:text-4xl font-bold tracking-widest bg-black/40 px-3 py-1 rounded-lg border border-white/10">
                                {match.score_team_a}-{match.score_team_b}
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-gray-500">VS</div>
                        )}
                    </div>

                    {/* Team B */}
                    <div className="flex-1 flex items-center justify-start gap-3 md:gap-6 text-left">
                        <img src={teamB.logoUrl} className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-black object-cover border border-white/10" onError={(e) => e.currentTarget.style.display='none'}/>
                        <span className="font-black italic uppercase text-sm md:text-xl leading-none">{teamB.name}</span>
                    </div>
                </div>
                
                {/* Arrow Action */}
                <div className="hidden md:flex w-16 items-center justify-center bg-white/5 group-hover:bg-hoops-primary group-hover:text-white transition-colors text-gray-600">
                    <ArrowRight size={20} />
                </div>
            </div>
        </Link>
    )
}