import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Player } from '../types';
import { ExternalLink, Smartphone } from 'lucide-react';
import PlayerModal from '../components/PlayerModal';

const LiveHub: React.FC = () => {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Player Card & Voting
  const [viewingPlayer, setViewingPlayer] = useState<any>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLiveMatch();
    
    // Heartbeat for live status
    const heartbeat = setInterval(fetchLiveMatch, 8000);

    const subscription = supabase
      .channel('live_hub_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => { fetchLiveMatch(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, () => { fetchLiveMatch(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_stats' }, () => { fetchLiveMatch(); })
      .subscribe();

    return () => { 
        supabase.removeChannel(subscription);
        clearInterval(heartbeat);
    };
  }, []);

  async function fetchLiveMatch() {
    try {
      // Priority: Live > Scheduled
      let { data: liveData } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(*, players(*)),
          team_b:teams!team_b_id(*, players(*))
        `)
        .eq('status', 'live')
        .maybeSingle();

      if (!liveData) {
          const { data: scheduled } = await supabase
            .from('matches')
            .select(`
              *,
              team_a:teams!team_a_id(*, players(*)),
              team_b:teams!team_b_id(*, players(*))
            `)
            .eq('status', 'scheduled')
            .order('start_time', { ascending: true })
            .limit(1)
            .maybeSingle();
          liveData = scheduled;
      }

      if (liveData) {
        // Fetch Live Stats
        const { data: statsData } = await supabase
            .from('player_stats')
            .select('*')
            .eq('match_id', liveData.id);

        const mapPlayer = (p: any) => {
            const s = statsData?.find((ls: any) => ls.player_id === p.id) || {};
            return {
                id: p.id.toString(),
                name: p.name,
                number: p.number,
                position: p.position,
                height: p.height,
                points: s.points || 0,
                rebounds: s.rebounds_total || 0,
                assists: s.assists || 0,
                imageUrl: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=0D8ABC&color=fff&size=200`,
                is_on_court: p.is_on_court
            };
        };

        const activePlayersA = liveData.team_a?.players?.map(mapPlayer).filter((p:any) => p.is_on_court).map((p:any) => p.id) || [];
        const activePlayersB = liveData.team_b?.players?.map(mapPlayer).filter((p:any) => p.is_on_court).map((p:any) => p.id) || [];

        const mappedMatch: any = {
            id: liveData.id.toString(),
            teamA: { 
                ...liveData.team_a, 
                logoUrl: liveData.team_a?.logo_url,
                roster: liveData.team_a?.players?.map(mapPlayer) || []
            },
            teamB: { 
                 ...liveData.team_b, 
                 logoUrl: liveData.team_b?.logo_url,
                 roster: liveData.team_b?.players?.map(mapPlayer) || []
            },
            scoreA: liveData.score_team_a ?? 0,
            scoreB: liveData.score_team_b ?? 0,
            quarter: liveData.quarter || 1,
            status: liveData.status,
            videoUrl: liveData.video_url,
            youtubeId: liveData.youtube_id,
            socialLink: liveData.social_link,
            socialLinkText: liveData.social_link_text,
            activePlayersA,
            activePlayersB,
            teamAFouls: liveData.team_a_fouls || 0,
            teamBFouls: liveData.team_b_fouls || 0,
            teamATimeouts: liveData.team_a_timeouts || 0,
            teamBTimeouts: liveData.team_b_timeouts || 0
        };

        setMatch(mappedMatch);
      }
    } catch (error) {
      console.error("LiveHub sync error", error);
    } finally {
      setLoading(false);
    }
  }

  const handlePlayerClick = (p: any) => {
      const fullPlayer = {
          ...p,
          team: match.teamA.roster.find((pl:any) => pl.id === p.id) ? match.teamA : match.teamB
      }
      setViewingPlayer(fullPlayer);
  };

  const TeamLogo = ({ url, name, size="md" }: any) => {
      const sizeClasses = size === "lg" ? "w-20 h-20 md:w-32 md:h-32" : "w-14 h-14 md:w-20 md:h-20";
      // FIX: Police plus grande pour les initiales (text-3xl pour lg, text-xl pour md)
      const fontSize = size === "lg" ? "text-4xl" : "text-xl";
      
      return (
        <div className={`${sizeClasses} rounded-full border-4 border-white/10 shadow-2xl bg-black flex-shrink-0 relative overflow-hidden group`}>
            {url ? (
                <img src={url} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            ) : (
                <div className={`w-full h-full bg-gray-900 flex items-center justify-center font-bold text-gray-500 uppercase ${fontSize}`}>
                    {name?.substring(0, 2)}
                </div>
            )}
        </div>
      )
  };

  const TeamStatsDisplay = ({ fouls, timeouts, align = "left" }: any) => {
      const isBonus = fouls >= 5;
      return (
          <div className={`flex flex-col gap-1 text-[10px] font-bold uppercase text-gray-400 mt-2 ${align === 'right' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1">
                  <span>Fautes:</span>
                  <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => ( <div key={i} className={`w-1.5 h-3 rounded-sm ${i < fouls ? (isBonus ? 'bg-red-500' : 'bg-hoops-yellow') : 'bg-white/10'}`}></div> ))}
                  </div>
                  {isBonus && <span className="text-red-500 animate-pulse ml-1">BONUS</span>}
              </div>
          </div>
      )
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hoops-yellow"></div></div>;

  if (!match) return <div className="min-h-screen flex items-center justify-center text-gray-400">Aucun match programmé pour l'instant.</div>;

  const activeTeamA = match.teamA.roster.filter((p: any) => p.is_on_court);
  const activeTeamB = match.teamB.roster.filter((p: any) => p.is_on_court);
  
  let quarterLabel = "À VENIR";
  let statusColor = "bg-blue-900/30 text-blue-300";

  if (match.status === 'live') {
      statusColor = "bg-red-600 text-white animate-pulse";
      if (match.quarter === 1) quarterLabel = "1ère Mi-temps";
      else if (match.quarter === 2) quarterLabel = "2ème Mi-temps";
      else if (match.quarter > 2) quarterLabel = `Prolongation ${match.quarter - 2}`;
      else quarterLabel = "En Direct";
  } else if (match.status === 'finished') {
      quarterLabel = "TERMINÉ";
      statusColor = "bg-gray-700 text-gray-400";
  } else {
      quarterLabel = new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
  }

  const hasVideo = !!match.youtubeId;
  const hasSocial = !!match.socialLink && !match.youtubeId;

  return (
    <div className="pt-20 px-2 pb-24 md:max-w-7xl mx-auto flex flex-col gap-6 relative">
      
      {/* SCOREBOARD */}
      <div className="w-full relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[#0a0a0a]">
          {/* Background Blurred Assets */}
          {match.teamA.logoUrl && <img src={match.teamA.logoUrl} className="absolute -left-20 top-0 w-96 h-96 opacity-10 blur-3xl pointer-events-none" />}
          {match.teamB.logoUrl && <img src={match.teamB.logoUrl} className="absolute -right-20 top-0 w-96 h-96 opacity-10 blur-3xl pointer-events-none" />}
          
          <div className="bg-black/40 text-center py-2 border-b border-white/5 flex items-center justify-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Presented by</span>
              <div className="flex gap-4 opacity-70 grayscale">
                  <img src="/partners/logo_hoops_game.jpg" className="h-3 w-auto rounded-sm" />
                  <img src="/partners/logo_omega_sport.jpg" className="h-3 w-auto rounded-sm" />
              </div>
          </div>

          <div className="p-6 md:p-10 relative z-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  {/* Team A */}
                  <div className="flex flex-col items-center gap-4 flex-1">
                      <TeamLogo url={match.teamA.logoUrl} name={match.teamA.name} size="lg" />
                      <div className="text-center">
                          <h2 className="text-3xl md:text-5xl font-display font-bold italic uppercase leading-none mb-2">{match.teamA.name}</h2>
                          <div className="flex justify-center">
                             <TeamStatsDisplay fouls={match.teamAFouls} timeouts={match.teamATimeouts} align="center" />
                          </div>
                      </div>
                  </div>

                  {/* Score Center */}
                  <div className="flex flex-col items-center mx-4">
                      <div className="bg-white/5 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                          <div className="font-display font-bold text-6xl md:text-8xl text-white tracking-widest leading-none flex items-center gap-4">
                              <span className="text-hoops-primary drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">{match.scoreA}</span>
                              <span className="text-gray-600 text-4xl">:</span>
                              <span className="text-hoops-yellow drop-shadow-[0_0_15px_rgba(244,255,95,0.5)]">{match.scoreB}</span>
                          </div>
                      </div>
                      <div className={`mt-4 ${statusColor === 'bg-red-600 text-white animate-pulse' ? 'bg-red-600/20 text-red-500 border-red-500/50' : 'bg-white/10 text-gray-400 border-white/20'} border px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest`}>
                          {quarterLabel}
                      </div>
                  </div>

                  {/* Team B */}
                  <div className="flex flex-col items-center gap-4 flex-1">
                      <TeamLogo url={match.teamB.logoUrl} name={match.teamB.name} size="lg" />
                      <div className="text-center">
                          <h2 className="text-3xl md:text-5xl font-display font-bold italic uppercase leading-none mb-2">{match.teamB.name}</h2>
                          <div className="flex justify-center">
                             <TeamStatsDisplay fouls={match.teamBFouls} timeouts={match.teamBTimeouts} align="center" />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* VIDEO PLAYER */}
      <div 
          ref={videoContainerRef} 
          className={`aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border border-white/10 group w-full max-w-5xl mx-auto`}
      >
          {hasVideo ? (
              match.youtubeId.startsWith('twitch:') ? (
                  <iframe src={`https://player.twitch.tv/?channel=${match.youtubeId.replace('twitch:', '')}&parent=localhost&parent=${window.location.hostname}`} height="100%" width="100%" allowFullScreen title="Live Twitch" className="w-full h-full"></iframe>
              ) : (
                  <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${match.youtubeId}?autoplay=1&origin=${window.location.origin}&modestbranding=1&rel=0`} title="Live Match" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="w-full h-full" referrerPolicy="strict-origin-when-cross-origin"></iframe>
              )
          ) : hasSocial ? (
              <div className="w-full h-full relative">
                   <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm" style={{backgroundImage: "url('https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2090&auto=format&fit=crop')"}}></div>
                   <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/60">
                       <Smartphone size={48} className="text-hoops-yellow mb-4 animate-bounce" />
                       <h3 className="text-3xl font-display font-bold uppercase italic text-white mb-2">Live sur nos réseaux</h3>
                       <p className="text-gray-300 mb-6 max-w-md">{match.socialLinkText || "Diffusion exclusive sur mobile. Cliquez pour accéder."}</p>
                       <a 
                           href={match.socialLink} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="bg-hoops-primary hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center gap-3 transition-all transform hover:scale-105 shadow-lg"
                       >
                           <ExternalLink size={20} /> Ouvrir le Live
                       </a>
                   </div>
              </div>
          ) : (
              <video src={match.videoUrl} className="w-full h-full object-cover opacity-90" autoPlay muted loop playsInline />
          )}

          <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
             {match.status === 'live' && <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg"><span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>LIVE</div>}
          </div>
      </div>

      {/* COURT STATUS */}
      <div className="glass-panel p-4 rounded-xl">
          <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-hoops-yellow rounded-full animate-pulse"></div>
            Sur le terrain
          </h3>
          
          <div className="flex flex-col gap-4">
              {/* Team A */}
              <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
                  <div className="w-1 bg-hoops-primary h-8 rounded-full shrink-0"></div>
                  {activeTeamA.map((p: Player) => (
                    <div key={p.id} onClick={() => handlePlayerClick(p)} className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer group">
                        <div className="w-10 h-10 rounded-full border border-hoops-primary p-0.5 relative">
                            <img src={p.imageUrl} className="w-full h-full rounded-full object-cover" />
                        </div>
                        <span className="text-[9px] font-bold bg-gray-800 px-1.5 rounded text-gray-300">#{p.number}</span>
                    </div>
                  ))}
                  {activeTeamA.length === 0 && <span className="text-xs text-gray-500 italic">Aucun joueur</span>}
              </div>

              {/* Team B */}
              <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
                  <div className="w-1 bg-hoops-yellow h-8 rounded-full shrink-0"></div>
                  {activeTeamB.map((p: Player) => (
                    <div key={p.id} onClick={() => handlePlayerClick(p)} className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer group">
                        <div className="w-10 h-10 rounded-full border border-hoops-yellow p-0.5 relative">
                            <img src={p.imageUrl} className="w-full h-full rounded-full object-cover" />
                        </div>
                        <span className="text-[9px] font-bold bg-gray-800 px-1.5 rounded text-gray-300">#{p.number}</span>
                    </div>
                  ))}
                   {activeTeamB.length === 0 && <span className="text-xs text-gray-500 italic">Aucun joueur</span>}
              </div>
          </div>
      </div>

      {viewingPlayer && (
          <PlayerModal 
            player={viewingPlayer} 
            matchId={match.id} 
            onClose={() => setViewingPlayer(null)} 
          />
      )}

    </div>
  );
};

export default LiveHub;