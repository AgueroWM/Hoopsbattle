import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Match, Player } from '../types';
import { Maximize2, Minimize2 } from 'lucide-react';

const LiveHub: React.FC = () => {
  const [match, setMatch] = useState<any>(null); // Use any to allow extra fields like team_fouls
  const [loading, setLoading] = useState(true);
  
  // Video State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Voting State
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [votesStatus, setVotesStatus] = useState({
      defense: false,
      offense: false,
      mvp: false
  });

  // Local stats cache for the modal
  const [playerStats, setPlayerStats] = useState<any>(null);

  useEffect(() => {
    fetchLiveMatch();
    const subscription = supabase
      .channel('public:livehub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchLiveMatch();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, () => {
          fetchLiveMatch();
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription) };
  }, []);

  useEffect(() => {
      if (match) {
        checkVotes();
      }
  }, [match?.id, match?.quarter]);

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          videoContainerRef.current?.requestFullscreen();
          setIsFullscreen(true);
      } else {
          document.exitFullscreen();
          setIsFullscreen(false);
      }
  };

  const checkVotes = () => {
      if (!match) return;
      // CORRECTION: Si on est en Q2 ou plus (OT), c'est la 2ème mi-temps pour les votes
      const currentHalf = match.quarter >= 2 ? 2 : 1;
      
      setVotesStatus({
          defense: !!localStorage.getItem(`vote_${match.id}_defense_h${currentHalf}`),
          offense: !!localStorage.getItem(`vote_${match.id}_offense_h${currentHalf}`),
          mvp: !!localStorage.getItem(`vote_${match.id}_mvp_h${currentHalf}`)
      });
  }

  async function fetchLiveMatch() {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(*, players(*)),
          team_b:teams!team_b_id(*, players(*))
        `)
        .or('status.eq.live,status.eq.scheduled')
        .order('status', { ascending: true }) // prioritize live
        .order('start_time', { ascending: true })
        .limit(1)
        .single();

      if (data) {
        const mapPlayer = (p: any) => ({
            id: p.id.toString(),
            name: p.name,
            number: p.number,
            position: p.position,
            height: p.height,
            stats: { ppg: 0, rpg: 0, apg: 0 },
            imageUrl: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=0D8ABC&color=fff&size=200`,
            is_on_court: p.is_on_court
        });

        const teamARoster = data.team_a?.players?.map(mapPlayer) || [];
        const teamBRoster = data.team_b?.players?.map(mapPlayer) || [];

        const activePlayersA = teamARoster.filter((p: any) => p.is_on_court).map((p: any) => p.id);
        const activePlayersB = teamBRoster.filter((p: any) => p.is_on_court).map((p: any) => p.id);

        const mappedMatch: any = {
            id: data.id.toString(),
            teamA: { 
                ...data.team_a, 
                id: data.team_a?.id.toString(),
                name: data.team_a?.name, 
                city: data.team_a?.short_name || 'City',
                logoUrl: data.team_a?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.team_a?.name)}&background=0f172a&color=F4FF5F&size=200`,
                roster: teamARoster
            },
            teamB: { 
                 ...data.team_b, 
                 id: data.team_b?.id.toString(),
                name: data.team_b?.name, 
                city: data.team_b?.short_name || 'City',
                logoUrl: data.team_b?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.team_b?.name)}&background=0f172a&color=F4FF5F&size=200`,
                roster: teamBRoster
            },
            scoreA: data.score_team_a ?? 0,
            scoreB: data.score_team_b ?? 0,
            quarter: data.quarter || 1,
            timeLeft: data.time_left || 'LIVE',
            isLive: data.status === 'live',
            events: [],
            videoUrl: data.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            youtubeId: data.youtube_id, // YouTube Support
            activePlayersA: activePlayersA,
            activePlayersB: activePlayersB,
            teamAFouls: data.team_a_fouls || 0,
            teamBFouls: data.team_b_fouls || 0,
            teamATimeouts: data.team_a_timeouts || 0,
            teamBTimeouts: data.team_b_timeouts || 0
        };

        setMatch(mappedMatch);
      }
    } catch (error) {
      console.error("Erreur fetch LiveHub:", error);
    } finally {
      setLoading(false);
    }
  }

  const handlePlayerClick = async (p: any) => {
      setSelectedPlayer(p);
      setPlayerStats(null); 
      if(match) {
          const { data } = await supabase.from('player_stats')
            .select('*')
            .eq('match_id', match.id)
            .eq('player_id', p.id)
            .maybeSingle();
          setPlayerStats(data || { points: 0, rebounds_total: 0, assists: 0, fouls: 0 });
      }
  };

  const handleVote = async (category: 'defense' | 'offense' | 'mvp') => {
      if (!selectedPlayer || !match) return;
      // CORRECTION: Si Q >= 2, c'est la 2ème mi-temps
      const currentHalf = match.quarter >= 2 ? 2 : 1;
      
      if (votesStatus[category]) return;

      const { error } = await supabase.from('player_votes').insert({
          match_id: parseInt(match.id),
          player_id: parseInt(selectedPlayer.id),
          category: category,
          half: currentHalf
      });

      if (!error) {
          localStorage.setItem(`vote_${match.id}_${category}_h${currentHalf}`, 'true');
          setVotesStatus(prev => ({ ...prev, [category]: true }));
          if (navigator.vibrate) navigator.vibrate(50);
      } else {
          console.warn("Vote DB error, simulating success", error);
          localStorage.setItem(`vote_${match.id}_${category}_h${currentHalf}`, 'true');
          setVotesStatus(prev => ({ ...prev, [category]: true }));
      }
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.nextElementSibling?.classList.remove('hidden');
  };

  const TeamLogo = ({ url, name, size = "large" }: { url?: string, name: string, size?: "small" | "large" }) => {
      const dim = size === "large" ? "w-16 h-16 md:w-20 md:h-20" : "w-10 h-10";
      return (
        <div className={`${dim} rounded-full border-2 border-white/10 shadow-lg bg-white/5 flex-shrink-0 relative overflow-hidden`}>
            {url ? (
                <img src={url} alt={name} className="w-full h-full object-cover" onError={handleImgError} />
            ) : (
                <div className="w-full h-full bg-black flex items-center justify-center font-bold text-gray-400 uppercase text-xs">
                    {name.substring(0, 2)}
                </div>
            )}
            <div className="hidden w-full h-full bg-black flex items-center justify-center font-bold text-gray-400 uppercase text-xs">
                {name.substring(0, 2)}
            </div>
        </div>
      )
  };

  const VoteButton = ({ type, label, icon, color, voted }: any) => {
      const baseClass = "flex flex-col items-center gap-2 p-3 rounded-xl transition-all group relative overflow-hidden";
      const activeClass = type === 'defense' ? 'bg-blue-900/40 border-blue-500/30 hover:bg-blue-600' : 
                          type === 'offense' ? 'bg-red-900/40 border-red-500/30 hover:bg-red-600' :
                          'bg-yellow-900/40 border-yellow-500/30 hover:bg-yellow-500 hover:text-black text-yellow-200';
      const disabledClass = "bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed grayscale";

      return (
          <button 
            onClick={() => !voted && handleVote(type)} 
            disabled={voted}
            className={`${baseClass} border ${voted ? disabledClass : activeClass}`}
          >
              {voted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                      <span className="text-xs font-bold uppercase text-white transform -rotate-12 border-2 border-white px-2 rounded">Voté</span>
                  </div>
              )}
              <span className={`text-2xl ${!voted && 'group-hover:scale-110 transition-transform'}`}>{icon}</span>
              <span className="text-[10px] font-bold uppercase">{label}</span>
          </button>
      )
  }

  const TeamStatsDisplay = ({ fouls, timeouts, align = "left" }: any) => {
      const isBonus = fouls >= 5;
      return (
          <div className={`flex flex-col gap-1 text-[10px] font-bold uppercase text-gray-400 mt-2 ${align === 'right' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1">
                  <span>Fautes:</span>
                  <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-1.5 h-3 rounded-sm ${i < fouls ? (isBonus ? 'bg-red-500' : 'bg-hoops-yellow') : 'bg-white/10'}`}></div>
                      ))}
                  </div>
                  {isBonus && <span className="text-red-500 animate-pulse ml-1">BONUS</span>}
              </div>
              <div className="flex items-center gap-1">
                  <span>T. Morts:</span>
                  <div className="flex gap-1">
                      {[...Array(2)].map((_, i) => (
                           <div key={i} className={`w-3 h-1 rounded-full ${i < timeouts ? 'bg-white' : 'bg-white/10'}`}></div>
                      ))}
                  </div>
              </div>
          </div>
      )
  }

  const getPeriodDisplay = (q: number) => {
      if (q === 1) return "1ère MT";
      if (q === 2) return "2ème MT";
      if (q >= 3) return `Prolong. ${q-2}`; // Correction: "Prolong. 1" au lieu de "OT 1"
      return `MT ${q}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hoops-yellow"></div></div>;

  if (!match) return <div className="min-h-screen flex items-center justify-center text-gray-400">Aucun match programmé pour l'instant.</div>;

  const isMoneyTime = match.quarter >= 2 && parseInt(match.timeLeft.split(':')[0] || '10') < 2;
  const activeTeamA = match.teamA.roster.filter((p: any) => p.is_on_court);
  const activeTeamB = match.teamB.roster.filter((p: any) => p.is_on_court);

  return (
    <div className="pt-24 px-4 pb-12 max-w-7xl mx-auto flex flex-col gap-6 relative">
      
      {/* SCOREBOARD */}
      <div className={`glass-panel rounded-2xl p-0 overflow-hidden relative border-t-4 ${isMoneyTime ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'border-hoops-yellow'}`}>
         
         {/* SPONSOR BAR */}
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
                        <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Presented by</span>
                        <img src="/partners/logo_omega_sport.jpg" className="h-4 w-auto rounded opacity-80" alt="Omega Sport" />
                    </div>

         {isMoneyTime && <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none"></div>}
         <div className="flex flex-col md:flex-row h-auto md:h-40">
            {/* TEAM A */}
            <div className="flex-1 flex items-center justify-between px-4 md:px-8 py-4 bg-gradient-to-r from-hoops-surface to-transparent">
               <div className="text-right flex-1 pr-4 min-w-0">
                  <h2 className="text-2xl md:text-4xl font-display font-bold italic uppercase leading-none truncate">{match.teamA.name}</h2>
                  <TeamStatsDisplay fouls={match.teamAFouls} timeouts={match.teamATimeouts} align="right" />
               </div>
               <TeamLogo url={match.teamA.logoUrl} name={match.teamA.name} />
            </div>
            
            {/* SCORE CENTER */}
            <div className="w-full md:w-64 bg-black/40 backdrop-blur-xl border-y md:border-x md:border-y-0 border-white/10 flex flex-col items-center justify-center py-4 relative z-10">
               <div className="flex items-center gap-4 text-5xl md:text-6xl font-display font-bold text-white tracking-widest">
                   <span>{match.scoreA}</span><span className="text-gray-600 text-3xl md:text-4xl">-</span><span>{match.scoreB}</span>
               </div>
               <div className={`mt-2 px-3 py-0.5 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isMoneyTime ? 'bg-red-600 text-white animate-pulse' : 'bg-hoops-primary/20 text-hoops-primary'}`}>
                   {isMoneyTime && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                   {match.isLive ? getPeriodDisplay(match.quarter) : 'PRÉVU'}
               </div>
            </div>
            
            {/* TEAM B */}
            <div className="flex-1 flex items-center justify-between px-4 md:px-8 py-4 bg-gradient-to-l from-hoops-surface to-transparent">
               <TeamLogo url={match.teamB.logoUrl} name={match.teamB.name} />
               <div className="text-left flex-1 pl-4 min-w-0">
                  <h2 className="text-2xl md:text-4xl font-display font-bold italic uppercase leading-none truncate">{match.teamB.name}</h2>
                  <TeamStatsDisplay fouls={match.teamBFouls} timeouts={match.teamBTimeouts} align="left" />
               </div>
            </div>
         </div>
      </div>

      <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6">
              {/* VIDEO CONTAINER */}
              <div 
                  ref={videoContainerRef} 
                  className={`aspect-video w-full bg-black rounded-2xl overflow-hidden relative shadow-2xl border border-white/10 group min-h-[200px] ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : ''}`}
              >
                  {match.youtubeId ? (
                      match.youtubeId.startsWith('twitch:') ? (
                         // LECTEUR TWITCH
                         <iframe
                            src={`https://player.twitch.tv/?channel=${match.youtubeId.replace('twitch:', '')}&parent=localhost&parent=hoops-game.vercel.app&parent=${window.location.hostname}`}
                            height="100%"
                            width="100%"
                            allowFullScreen
                            title="Live Twitch"
                            className="w-full h-full"
                          ></iframe>
                      ) : (
                         // LECTEUR YOUTUBE
                         <iframe 
                            width="100%" height="100%" 
                            src={`https://www.youtube.com/embed/${match.youtubeId}?autoplay=1&origin=${window.location.origin}&modestbranding=1&rel=0&playsinline=1&mute=1`} 
                            title="Live Match"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="w-full h-full"
                            referrerPolicy="strict-origin-when-cross-origin"
                         ></iframe>
                      )
                  ) : (
                      <video src={match.videoUrl} className="w-full h-full object-cover opacity-90" autoPlay muted loop playsInline />
                  )}

                  {/* Overlay Controls (Generic Video Only) */}
                  {!match.youtubeId && (
                      <div className="absolute bottom-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={toggleFullscreen} className="bg-black/50 text-white p-2 rounded hover:bg-black/80">
                             {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                         </button>
                      </div>
                  )}

                  <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
                     {match.isLive && <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg"><span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>LIVE</div>}
                  </div>
              </div>

              {/* COURT VISUALIZATION - ACTIVE PLAYERS */}
              <div className="glass-panel p-6 rounded-2xl">
                 <h3 className="text-sm font-bold uppercase text-gray-400 mb-6 flex items-center gap-2">
                    <div className="w-2 h-2 bg-hoops-yellow rounded-full animate-pulse"></div>
                    Sur le parquet (Cliquez pour voter)
                 </h3>
                 <div className="flex justify-between items-center gap-8 overflow-x-auto pb-4">
                     <div className="flex gap-4 min-w-max">
                        {activeTeamA.length > 0 ? activeTeamA.map((p: Player) => (
                            <div key={p.id} onClick={() => handlePlayerClick(p)} className="text-center group cursor-pointer flex flex-col items-center">
                                <div className="w-14 h-14 rounded-full border-2 border-hoops-primary p-0.5 transition-all group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] bg-black">
                                    <img src={p.imageUrl} className="w-full h-full rounded-full object-cover" />
                                </div>
                                <div className="text-[10px] font-bold mt-2 uppercase text-gray-300 group-hover:text-white transition-colors bg-hoops-surface px-2 py-0.5 rounded">#{p.number}</div>
                            </div>
                        )) : <div className="text-sm text-gray-500 italic p-4 border border-dashed border-gray-700 rounded-lg">Aucun joueur Team A</div>}
                     </div>
                     <div className="h-10 w-px bg-white/10 mx-2"></div>
                     <div className="flex gap-4 min-w-max" dir="rtl">
                        {activeTeamB.length > 0 ? activeTeamB.map((p: Player) => (
                            <div key={p.id} onClick={() => handlePlayerClick(p)} className="text-center group cursor-pointer flex flex-col items-center">
                                <div className="w-14 h-14 rounded-full border-2 border-hoops-yellow p-0.5 transition-all group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(250,204,21,0.5)] bg-black">
                                    <img src={p.imageUrl} className="w-full h-full rounded-full object-cover" />
                                </div>
                                <div className="text-[10px] font-bold mt-2 uppercase text-gray-300 group-hover:text-white transition-colors bg-hoops-surface px-2 py-0.5 rounded">#{p.number}</div>
                            </div>
                        )) : <div className="text-sm text-gray-500 italic p-4 border border-dashed border-gray-700 rounded-lg">Aucun joueur Team B</div>}
                     </div>
                 </div>
              </div>
          </div>
      </div>

      {/* --- PLAYER VOTING MODAL + STATS --- */}
      {selectedPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedPlayer(null)}>
              <div className="bg-hoops-card border border-white/20 p-6 rounded-2xl w-full max-w-sm relative transform transition-all scale-100" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setSelectedPlayer(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
                  
                  <div className="text-center mb-4">
                      <div className="w-20 h-20 rounded-full border-4 border-hoops-yellow mx-auto mb-2 overflow-hidden shadow-[0_0_30px_rgba(250,204,21,0.3)] bg-black">
                          <img src={selectedPlayer.imageUrl} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-xl font-display font-bold italic uppercase">{selectedPlayer.name}</h2>
                      <p className="text-gray-400 font-mono text-xs">#{selectedPlayer.number} - {selectedPlayer.position}</p>
                  </div>

                  {/* MINI STATS */}
                  <div className="grid grid-cols-4 gap-2 mb-6 bg-black/40 p-3 rounded-lg border border-white/5 text-center">
                      <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold">PTS</span>
                          <div className="text-lg font-mono font-bold text-white">{playerStats?.points || 0}</div>
                      </div>
                      <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold">REB</span>
                          <div className="text-lg font-mono font-bold text-white">{playerStats?.rebounds_total || 0}</div>
                      </div>
                      <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold">AST</span>
                          <div className="text-lg font-mono font-bold text-white">{playerStats?.assists || 0}</div>
                      </div>
                      <div>
                          <span className="text-[10px] text-red-400 uppercase font-bold">FLT</span>
                          <div className="text-lg font-mono font-bold text-red-500">{playerStats?.fouls || 0}</div>
                      </div>
                  </div>

                  <p className="text-center text-xs font-bold text-white mb-4 uppercase tracking-widest border-t border-white/10 pt-4">
                      {/* CORRECTION LABEL MI-TEMPS */}
                      Vote {match.quarter >= 2 ? '2ème Mi-temps' : '1ère Mi-temps'}
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                      <VoteButton type="defense" label="Défense" icon="🛡️" voted={votesStatus.defense} />
                      <VoteButton type="offense" label="Attaque" icon="⚡" voted={votesStatus.offense} />
                      <VoteButton type="mvp" label="MVP" icon="👑" voted={votesStatus.mvp} />
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default LiveHub;