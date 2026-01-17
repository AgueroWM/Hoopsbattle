import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { Trophy, Crown, Activity, ShieldCheck, ArrowRight } from 'lucide-react';
import PlayerModal from '../components/PlayerModal';
import SmoothImage from '../components/SmoothImage';

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'players' | 'teams'>('players');
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
        const [rawPlayersRes, rawStatsRes, matchesRes] = await Promise.all([
            supabase.from('players').select('*, team:teams(*)'),
            supabase.from('player_stats').select('*'),
            supabase.from('matches').select('*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*)').eq('status', 'finished').order('start_time', { ascending: true })
        ]);

        const rawPlayers = rawPlayersRes.data || [];
        const rawStats = rawStatsRes.data || [];
        const matches = matchesRes.data || [];
        
        setFinishedMatches(matches);

        // --- COMPTAGE DES VICTOIRES PAR ÉQUIPE ---
        const teamWins = new Map<number, number>();
        matches.forEach((m: any) => {
            if (m.score_team_a > m.score_team_b) {
                teamWins.set(m.team_a_id, (teamWins.get(m.team_a_id) || 0) + 1);
            } else if (m.score_team_b > m.score_team_a) {
                teamWins.set(m.team_b_id, (teamWins.get(m.team_b_id) || 0) + 1);
            }
        });

        // --- TRAITEMENT JOUEURS ---
        const statsMap = new Map<number, any>();

        rawStats.forEach((stat: any) => {
            const pid = stat.player_id;
            if (!statsMap.has(pid)) {
                statsMap.set(pid, {
                    total_points: 0, total_rebounds: 0, total_assists: 0,
                    games_played: 0
                });
            }
            const current = statsMap.get(pid);
            current.total_points += (stat.points || 0);
            current.total_rebounds += (stat.rebounds_total || 0);
            current.total_assists += (stat.assists || 0);
            current.games_played += 1;
        });

        let mergedPlayers = rawPlayers.map((p: any) => {
            const stats = statsMap.get(p.id) || { total_points: 0, total_rebounds: 0, total_assists: 0, games_played: 0 };
            const ppg = stats.games_played > 0 ? (stats.total_points / stats.games_played).toFixed(1) : "0.0";
            let imageUrl = p.avatar_url;
            if (!imageUrl) imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&color=fff`;

            return {
                id: p.id,
                name: p.name,
                team: { 
                    name: p.team?.name || 'Sans Équipe', 
                    logoUrl: p.team?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.team?.name || '?')}&background=0f172a&color=F4FF5F`,
                    id: p.team?.id
                },
                imageUrl: imageUrl,
                number: p.number,
                position: p.position || '?',
                stats: {
                    ppg: ppg,
                    points: stats.total_points,
                    rebounds: stats.total_rebounds,
                    assists: stats.total_assists,
                    games_played: stats.games_played,
                }
            };
        });

        // FILTRAGE STRICT : On ne garde que les joueurs des équipes ayant gagné au moins 2 matchs
        // (Vainqueurs de leur bracket qualificatif)
        if (matches.length > 0) {
            mergedPlayers = mergedPlayers.filter((p: any) => (teamWins.get(p.team.id) || 0) >= 2);
        }

        const activePlayers = mergedPlayers.filter((p: any) => p.stats.games_played > 0);
        activePlayers.sort((a: any, b: any) => parseFloat(b.stats.ppg) - parseFloat(a.stats.ppg));
        setTopPlayers(activePlayers);

    } catch (e) {
        console.error("Error fetching leaderboard", e);
    } finally {
        setLoading(false);
    }
  };

  // Helper pour trouver les vainqueurs par date
  const getWinnerOfMatchOnDate = (dateStr: string, matchIndex: number) => {
      // Filtrer les matchs finis par date
      const daysMatches = finishedMatches.filter(m => m.start_time.includes(dateStr));
      const match = daysMatches[matchIndex];
      if (!match) return null;

      if (match.score_team_a > match.score_team_b) return match.team_a;
      if (match.score_team_b > match.score_team_a) return match.team_b;
      return null;
  };

  if (loading) return <div className="min-h-screen bg-hoops-bg flex items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hoops-yellow"></div></div>;

  return (
    <div className="min-h-screen bg-hoops-bg text-white pt-24 pb-32 px-4 max-w-4xl mx-auto font-sans">
      
      {selectedPlayer && <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}

      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase italic text-white mb-2">
           Hall of <span className="text-hoops-yellow">Fame</span>
        </h1>
        <p className="text-gray-400 text-sm">Statistiques officielles cumulées de la compétition</p>
      </div>

      <div className="flex justify-center mb-8 bg-white/5 p-1 rounded-full w-fit mx-auto">
          <button 
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold uppercase text-sm transition-all ${activeTab === 'players' ? 'bg-hoops-yellow text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
              <Crown size={16}/> Top Joueurs
          </button>
          <button 
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold uppercase text-sm transition-all ${activeTab === 'teams' ? 'bg-hoops-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
              <Trophy size={16}/> Les Qualifiés
          </button>
      </div>

      {activeTab === 'players' && (
          <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Activity className="text-hoops-yellow" size={28} />
                  <div>
                    <h2 className="text-2xl font-bold uppercase italic">Meilleurs Scoreurs</h2>
                    <p className="text-xs text-gray-400">Classement par moyenne de points (PTS/M)</p>
                    {finishedMatches.length > 0 && <span className="text-[10px] text-hoops-primary font-bold uppercase bg-hoops-primary/10 px-2 py-0.5 rounded mt-1 inline-block">Équipes Qualifiées (2+ Victoires)</span>}
                  </div>
              </div>

              {topPlayers.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                      Aucune statistique disponible pour le moment (ou aucun joueur qualifié à 2 victoires).
                  </div>
              ) : (
                topPlayers.map((p, i) => (
                    <div key={p.id} onClick={() => setSelectedPlayer(p)} className="bg-hoops-card border border-white/5 p-4 rounded-xl flex items-center gap-4 hover:border-hoops-primary/50 transition-all group cursor-pointer shadow-sm relative overflow-hidden">
                        <div className={`font-mono text-xl font-bold w-8 text-center flex-shrink-0 ${i < 3 ? 'text-hoops-yellow scale-125' : 'text-gray-600'}`}>
                            #{i + 1}
                        </div>
                        
                        <div className="relative w-14 h-14 flex-shrink-0">
                            {/* JOUEUR AVATAR: object-cover pour les visages */}
                            <div className="w-full h-full rounded-full border border-white/10 bg-black overflow-hidden">
                                    <SmoothImage 
                                        src={p.imageUrl} 
                                        className="w-full h-full"
                                        objectFit="cover" 
                                        alt={p.name}
                                    />
                            </div>
                            {i === 0 && <div className="absolute -top-1 -right-1 text-lg drop-shadow-md">👑</div>}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-hoops-primary uppercase mb-0.5">{p.position}</div>
                            <h3 className="font-bold text-white text-lg leading-tight truncate group-hover:text-hoops-primary transition-colors">{p.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                {/* LOGO EQUIPE: object-cover pour éviter l'effet 'petit carré dans rond' */}
                                {p.team?.logoUrl && (
                                    <div className="w-4 h-4 rounded-full bg-black overflow-hidden flex items-center justify-center">
                                        <img src={p.team.logoUrl} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <span className="text-xs text-gray-500 font-mono uppercase">
                                    {p.team?.name} • #{p.number}
                                </span>
                            </div>
                        </div>

                        <div className="text-right pl-4 border-l border-white/10">
                            <div className="text-2xl font-display font-bold text-hoops-primary">{p.stats.ppg}</div>
                            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">PTS/M</div>
                        </div>
                    </div>
                ))
              )}
          </div>
      )}

      {activeTab === 'teams' && (
          <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Trophy className="text-hoops-primary" size={28} />
                  <div>
                    <h2 className="text-2xl font-bold uppercase italic">Phase Finale</h2>
                    <p className="text-xs text-gray-400">Les vainqueurs des samedis et dimanches s'affrontent.</p>
                  </div>
              </div>

              <div className="space-y-8">
                  {/* BRACKET SEMI 1: SAMEDI vs SAMEDI */}
                  <BracketMatchup 
                      title="Demi-Finale 1"
                      sub="Vainqueurs des Samedis"
                      team1={getWinnerOfMatchOnDate('2026-01-10', 2)} // Winner of Match 3 on 10th
                      team2={getWinnerOfMatchOnDate('2026-01-17', 2)} // Winner of Match 3 on 17th
                      label1="Qualifié Samedi 1"
                      label2="Qualifié Samedi 2"
                  />

                  {/* BRACKET SEMI 2: DIMANCHE vs DIMANCHE */}
                  <BracketMatchup 
                      title="Demi-Finale 2"
                      sub="Vainqueurs des Dimanches"
                      team1={getWinnerOfMatchOnDate('2026-01-11', 2)} 
                      team2={getWinnerOfMatchOnDate('2026-01-18', 2)} 
                      label1="Qualifié Dimanche 1"
                      label2="Qualifié Dimanche 2"
                  />

                  <div className="flex items-center justify-center py-4">
                      <div className="h-16 w-1 bg-gradient-to-b from-white/10 to-hoops-yellow"></div>
                  </div>

                  {/* GRANDE FINALE */}
                  <div className="bg-gradient-to-b from-hoops-card to-black border border-hoops-yellow rounded-2xl p-6 text-center relative overflow-hidden">
                       <div className="absolute inset-0 bg-hoops-yellow/5 z-0"></div>
                       <div className="relative z-10">
                           <Trophy className="mx-auto text-hoops-yellow mb-2 h-12 w-12 drop-shadow-[0_0_15px_rgba(244,255,95,0.5)]" />
                           <h3 className="text-3xl font-display font-bold uppercase italic text-white mb-1">Grande Finale</h3>
                           <p className="text-xs text-gray-400 uppercase tracking-widest mb-6">25 Janvier 2026</p>
                           
                           <div className="flex items-center justify-center gap-4 text-xl font-bold text-gray-500">
                               <span>Vainqueur Demi 1</span>
                               <span className="text-hoops-primary">VS</span>
                               <span>Vainqueur Demi 2</span>
                           </div>
                       </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

// Composant sécurisé qui ne crashe pas si team1/team2 est undefined
function BracketMatchup({ title, sub, team1, team2, label1, label2 }: any) {
    return (
        <div className="bg-hoops-card border border-white/10 rounded-xl overflow-hidden shadow-lg">
            <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                <span className="font-bold uppercase text-sm text-hoops-primary">{title}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">{sub}</span>
            </div>
            <div className="p-4 flex flex-col gap-4">
                {/* Team 1 Slot */}
                <div className={`flex items-center justify-between p-3 rounded-lg border ${team1 ? 'bg-black/40 border-green-500/30' : 'bg-black/20 border-dashed border-white/10'}`}>
                    {team1 && team1.name ? (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-black border border-white/10 p-0.5">
                                    {team1.logo_url && <img src={team1.logo_url} className="w-full h-full object-cover" />}
                                </div>
                                <span className="font-bold uppercase">{team1.name}</span>
                            </div>
                            <ShieldCheck size={16} className="text-green-500" />
                        </>
                    ) : (
                        <div className="flex items-center gap-3 text-gray-500 w-full">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10"></div>
                            <span className="text-xs italic">{label1 || "À DÉTERMINER"}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                    <span className="bg-hoops-card px-2 text-xs font-bold text-gray-600">VS</span>
                </div>

                {/* Team 2 Slot */}
                <div className={`flex items-center justify-between p-3 rounded-lg border ${team2 ? 'bg-black/40 border-green-500/30' : 'bg-black/20 border-dashed border-white/10'}`}>
                    {team2 && team2.name ? (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-black border border-white/10 p-0.5">
                                    {team2.logo_url && <img src={team2.logo_url} className="w-full h-full object-cover" />}
                                </div>
                                <span className="font-bold uppercase">{team2.name}</span>
                            </div>
                            <ShieldCheck size={16} className="text-green-500" />
                        </>
                    ) : (
                        <div className="flex items-center gap-3 text-gray-500 w-full">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10"></div>
                            <span className="text-xs italic">{label2 || "À DÉTERMINER"}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}