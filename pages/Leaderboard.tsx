import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { Trophy, Crown, Star, ShieldCheck, Activity } from 'lucide-react';
import PlayerModal from '../components/PlayerModal';

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'players' | 'teams'>('players');
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [qualifiedTeams, setQualifiedTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
        // 1. Récupération des données référentielles et des MATCHS TERMINÉS (Source de vérité)
        const [playersRefRes, teamsRefRes, matchesRes, leaderboardRes] = await Promise.all([
            supabase.from('players').select('id, avatar_url, team_id, position, number'),
            api.teams.getAll(),
            supabase.from('matches').select('*').eq('status', 'finished'),
            supabase.from('player_leaderboard').select('*').order('ppg', { ascending: false }).limit(50)
        ]);

        const playersData = playersRefRes.data || [];
        const finishedMatches = matchesRes.data || [];
        const teamsList = teamsRefRes || [];
        const leaderboardData = leaderboardRes.data || [];

        const playersMap = new Map<number, any>(playersData.map((p: any) => [p.id, p]));
        const teamsMap = new Map<string, any>(teamsList.map((t: any) => [t.id, t]));

        // --- CALCUL MANUEL DES VICTOIRES (Plus fiable que la vue standings pour l'instant T) ---
        const teamStats = new Map<string, { wins: number, losses: number }>();

        // Init stats
        teamsList.forEach((t: any) => {
            teamStats.set(t.id, { wins: 0, losses: 0 });
        });

        // Process matches
        finishedMatches.forEach((m: any) => {
            const teamAId = m.team_a_id.toString();
            const teamBId = m.team_b_id.toString();
            
            const statsA = teamStats.get(teamAId) || { wins: 0, losses: 0 };
            const statsB = teamStats.get(teamBId) || { wins: 0, losses: 0 };

            if (m.score_team_a > m.score_team_b) {
                statsA.wins++;
                statsB.losses++;
            } else if (m.score_team_b > m.score_team_a) {
                statsB.wins++;
                statsA.losses++;
            }

            teamStats.set(teamAId, statsA);
            teamStats.set(teamBId, statsB);
        });

        // --- TRAITEMENT EQUIPES ---
        const mergedTeams = teamsList.map((t: any) => {
            const stats = teamStats.get(t.id) || { wins: 0, losses: 0 };
            return {
                ...t,
                wins: stats.wins,
                losses: stats.losses,
            };
        });

        // Filtrer pour les Qualifiés
        // LOGIQUE : On privilégie ceux qui ont gagné leur journée (donc souvent 2 victoires : Demi + Finale)
        // Si personne n'a 2 victoires, on prend ceux qui ont 1 victoire.
        let qualified = mergedTeams.filter((t: any) => t.wins >= 2);
        
        // Fallback : Si on est au début du tournoi et que personne n'a 2 victoires (ex: format poule unique), on prend ceux > 0
        if (qualified.length === 0) {
            qualified = mergedTeams.filter((t: any) => t.wins > 0);
        }

        // Tri par victoires
        qualified.sort((a: any, b: any) => b.wins - a.wins);
        setQualifiedTeams(qualified);


        // --- TRAITEMENT JOUEURS ---
        const mergedPlayers = (leaderboardData || []).map((p: any) => {
            const playerRef: any = playersMap.get(p.player_id) || {};
            const teamRef: any = teamsMap.get(p.team_id?.toString()) || {};
            
            return {
                id: p.player_id,
                name: p.player_name,
                team: { name: p.team_name, logoUrl: teamRef.logoUrl },
                avatar_url: playerRef.avatar_url, 
                number: playerRef.number,
                position: playerRef.position,
                
                stats: {
                    ppg: parseFloat(p.ppg).toFixed(1),
                    total_points: p.total_points,
                    games_played: p.games_played,
                    rebounds: p.total_rebounds || 0,
                    assists: p.total_assists || 0,
                    blocks: p.total_blocks || 0,
                    steals: p.total_steals || 0
                }
            };
        });

        setTopPlayers(mergedPlayers);

    } catch (e) {
        console.error("Error fetching leaderboard", e);
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-hoops-bg flex items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hoops-yellow"></div></div>;

  const slots = [0, 1, 2, 3];

  return (
    <div className="min-h-screen bg-hoops-bg text-white pt-24 pb-32 px-4 max-w-4xl mx-auto font-sans">
      
      {selectedPlayer && <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}

      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase italic text-white mb-2">
           Hall of <span className="text-hoops-yellow">Fame</span>
        </h1>
      </div>

      {/* Tabs */}
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
                    <p className="text-xs text-gray-400">Classement par moyenne de points (PPG)</p>
                  </div>
              </div>

              {topPlayers.map((p, i) => (
                  <div key={p.id} onClick={() => setSelectedPlayer(p)} className="bg-hoops-card border border-white/5 p-3 rounded-xl flex items-center gap-4 hover:border-hoops-primary/50 transition-all group cursor-pointer">
                      <div className={`font-mono text-xl font-bold w-8 text-center ${i < 3 ? 'text-hoops-yellow scale-125' : 'text-gray-600'}`}>
                          #{i + 1}
                      </div>
                      
                      <div className="relative w-12 h-12 flex-shrink-0">
                          <img 
                            src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.name}`} 
                            className="w-full h-full rounded-full object-cover border border-white/10"
                          />
                          {i === 0 && <div className="absolute -top-2 -right-2 text-xl">👑</div>}
                      </div>

                      <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white truncate group-hover:text-hoops-primary transition-colors">{p.name}</h3>
                          <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                              {p.team?.name} • <span className="text-gray-400">{p.stats.games_played} Matchs</span>
                          </p>
                      </div>

                      <div className="text-right pl-4">
                          <div className="text-2xl font-display font-bold text-hoops-primary">{p.stats.ppg}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase">PPG</div>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'teams' && (
          <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Trophy className="text-hoops-primary" size={28} />
                  <div>
                    <h2 className="text-2xl font-bold uppercase italic">Le Final 4</h2>
                    <p className="text-xs text-gray-400">Les vainqueurs des journées de qualification.</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slots.map((idx) => {
                      const team = qualifiedTeams[idx];
                      
                      if (team) {
                          return (
                              <div key={team.id} className="relative h-48 bg-gradient-to-br from-green-900/40 to-black border border-green-500/50 rounded-2xl overflow-hidden shadow-lg group">
                                  {/* Background Logo */}
                                  <img src={team.logoUrl} className="absolute right-[-20px] top-[-20px] w-40 h-40 opacity-20 blur-xl rounded-full" />
                                  
                                  <div className="absolute top-3 right-3 bg-green-500 text-black text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                      <ShieldCheck size={12}/> Qualifié
                                  </div>

                                  <div className="p-6 h-full flex flex-col justify-end relative z-10">
                                      <div className="w-16 h-16 rounded-full border-2 border-green-400 p-1 mb-3 bg-black">
                                          <img src={team.logoUrl} className="w-full h-full object-cover rounded-full" />
                                      </div>
                                      <h3 className="text-3xl font-display font-bold italic uppercase leading-none mb-1 text-white">{team.name}</h3>
                                      <div className="flex justify-between items-end">
                                          <p className="text-xs text-green-300 font-bold uppercase tracking-widest">{team.city || 'City'}</p>
                                          <div className="text-right">
                                              <span className="block text-2xl font-display font-bold text-white leading-none">{team.wins}</span>
                                              <span className="text-[9px] text-gray-400 font-bold uppercase">Victoires</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          );
                      } else {
                          return (
                              <div key={idx} className="h-48 bg-white/5 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-600 gap-2">
                                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                      <Trophy size={24} className="opacity-20" />
                                  </div>
                                  <span className="font-bold uppercase text-sm tracking-widest">Place à prendre</span>
                                  <span className="text-xs opacity-50">Match Jour {idx + 1}</span>
                              </div>
                          );
                      }
                  })}
              </div>
          </div>
      )}
    </div>
  );
}