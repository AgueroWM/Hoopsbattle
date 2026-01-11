import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Match, Player } from '../types';
import { Maximize2, Minimize2, ExternalLink, Signal, ArrowRight, Smartphone, PlayCircle } from 'lucide-react';
import PlayerModal from '../components/PlayerModal';

const LiveHub: React.FC = () => {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Video State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Player Card & Voting
  const [viewingPlayer, setViewingPlayer] = useState<any>(null);

  useEffect(() => {
    fetchLiveMatch();
    
    // Polling de sécurité toutes les 5s pour le statut
    const interval = setInterval(fetchLiveMatch, 5000);

    const subscription = supabase
      .channel('public:livehub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => { fetchLiveMatch(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, () => { fetchLiveMatch(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_stats' }, () => { fetchLiveMatch(); })
      .subscribe();

    return () => { 
        supabase.removeChannel(subscription);
        clearInterval(interval);
    };
  }, []);

  async function fetchLiveMatch() {
    try {
      // Priorité 1: Chercher un match explicitement "live"
      let { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(*, players(*)),
          team_b:teams!team_b_id(*, players(*))
        `)
        .eq('status', 'live')
        .maybeSingle();

      // Priorité 2: Si aucun live, chercher le prochain "scheduled"
      if (!data) {
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
          data = scheduled;
      }

      if (data) {
        // Fetch Live Stats for players
        const { data: liveStats } = await supabase
            .from('player_stats')
            .select('*')
            .eq('match_id', data.id);

        const mapPlayer = (p: any) => {
            const s = liveStats?.find((ls: any) => ls.player_id === p.id) || {};
            return {
                id: p.id.toString(),
                name: p.name,
                number: p.number,
                position: p.position,
                height: p.height,
                points: s.points || 0,
                rebounds: s.rebounds_total || 0,
                assists: s.assists || 0,
                points_1_made: s.points_1_made || 0,
                points_2_made: s.points_2_made || 0,
                points_3_made: s.points_3_made || 0,
                imageUrl: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=0D8ABC&color=fff&size=200`,
                is_on_court: p.is_on_court
            };
        };

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
            quarter: data.quarter || 1, // Si null, par défaut 1
            timeLeft: data.time_left || 'LIVE',
            isLive: data.status === 'live', // Source de vérité pour l'état Live
            status: data.status,
            events: [],
            videoUrl: data.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            youtubeId: data.youtube_id,
            socialLink: data.social_link,
            socialLinkText: data.social_link_text,
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
      const fullPlayer = {
          ...p,
          team: match.teamA.roster.find((pl:any) => pl.id === p.id) ? match.teamA : match.teamB
      }
      setViewingPlayer(fullPlayer);
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.nextElementSibling?.classList.remove('hidden');
  };

  const TeamLogo = ({ url, name, size="md" }: any) => {
      const sizeClasses = size === "lg" ? "w-20 h-20 md:w-32 md:h-32" : "w-14 h-14 md:w-20 md:h-20";
      return (
        <div className={`${sizeClasses} rounded-full border-4 border-white/10 shadow-2xl bg-black flex-shrink-0 relative overflow-hidden group`}>
            {url ? (
                <img src={url} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={handleImgError} />
            ) : (
                <div className="w-full h-full bg-black flex items-center justify-center font-bold text-gray-400 uppercase text-xs">{name.substring(0, 2)}</div>
            )}
            <div className="hidden w-full h-full bg-black flex items-center justify-center font-bold text-gray-400 uppercase text-xs">{name.substring(0, 2)}</div>
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
  
  // LOGIQUE QUARTER / STATUS CORRIGEE
  // Si le match est marqué comme "live" en DB, on force l'affichage LIVE.
  let quarterLabel = "À VENIR";
  let statusBadge = "À VENIR";
  let statusColor = "bg-blue-900/30 text-blue-300";

  if (match.status === 'live') {
      statusBadge = "LIVE";
      statusColor = "bg-red-600 text-white animate-pulse";
      
      if (match.quarter === 1) quarterLabel = "1ère Mi-temps";
      else if (match.quarter === 2) quarterLabel = "2ème Mi-temps";
      else if (match.quarter > 2) quarterLabel = `Prolongation ${match.quarter - 2}`;
      else quarterLabel = "En Direct";
      
  } else if (match.status === 'finished') {
      quarterLabel = "TERMINÉ";
      statusBadge = "FINI";
      statusColor = "bg-gray-700 text-gray-400";
  } else {
      // Scheduled
      quarterLabel = new Date(match.start_time || Date.now()).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
  }

  // --- LOGIQUE AFFICHAGE VIDEO VS LIEN EXTERNE ---
  // Si YoutubeID existe -> Iframe
  // Si Pas YoutubeID MAIS SocialLink -> Gros Bouton
  // Sinon -> Placeholder
  const hasVideo = !!match.youtubeId;
  const hasSocial = !!match.socialLink && !match.youtubeId;

  return (
    <div className="pt-20 px-2 pb-24 md:max-w-7xl mx-auto flex flex-col gap-6 relative">
      
      {/* --- MAJESTIC SCOREBOARD (TOP) --- */}
      <div className="w-full relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[#0a0a0a]">
          {/* Background blurred logos */}
          <img src={match.teamA.logoUrl} className="absolute -left-20 top-0 w-96 h-96 opacity-10 blur-3xl pointer-events-none" />
          <img src={match.teamB.logoUrl} className="absolute -right-20 top-0 w-96 h-96 opacity-10 blur-3xl pointer-events-none" />
          
          {/* "Presented By" Strip */}
          <div className="bg-black/40 text-center py-2 border-b border-white/5 flex items-center justify-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Presented by</span>
              <div className="flex gap-4 opacity-70 grayscale">
                  <img src="/partners/logo_hoops_game.jpg" className="h-4 w-auto" alt="Hoops Game" />
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

      {/* --- VIDEO CONTAINER / SOCIAL LINK BANNER --- */}
      <div 
          ref={videoContainerRef} 
          className={`aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border border-white/10 group ${isFullscreen ? 'fixed inset-0 z-[50] rounded-none' : 'w-full max-w-5xl mx-auto'}`}
      >
          {hasVideo ? (
              // CAS 1: YOUTUBE/TWITCH
              match.youtubeId.startsWith('twitch:') ? (
                  <iframe src={`https://player.twitch.tv/?channel=${match.youtubeId.replace('twitch:', '')}&parent=localhost&parent=hoops-game.vercel.app&parent=${window.location.hostname}`} height="100%" width="100%" allowFullScreen title="Live Twitch" className="w-full h-full"></iframe>
              ) : (
                  <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${match.youtubeId}?autoplay=1&origin=${window.location.origin}&modestbranding=1&rel=0`} title="Live Match" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="w-full h-full" referrerPolicy="strict-origin-when-cross-origin"></iframe>
              )
          ) : hasSocial ? (
              // CAS 2: LIEN SOCIAL (Pas de player vidéo)
              <div className="w-full h-full relative">
                  {/* Background image fallback */}
                   <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm" style={{backgroundImage: "url('https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2090&auto=format&fit=crop')"}}></div>
                   <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/60">
                       <Smartphone size={48} className="text-hoops-yellow mb-4 animate-bounce" />
                       <h3 className="text-3xl font-display font-bold uppercase italic text-white mb-2">Live sur nos réseaux</h3>
                       <p className="text-gray-300 mb-6 max-w-md">{match.socialLinkText || "Ce match est diffusé exclusivement sur nos réseaux sociaux. Cliquez ci-dessous pour y accéder."}</p>
                       <a 
                           href={match.socialLink} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="bg-hoops-primary hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center gap-3 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                       >
                           <ExternalLink size={20} /> Accéder au Live
                       </a>
                   </div>
              </div>
          ) : (
              // CAS 3: RIEN (Placeholder)
              <video src={match.videoUrl} className="w-full h-full object-cover opacity-90" autoPlay muted loop playsInline />
          )}

          <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
             {match.status === 'live' && <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg"><span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>LIVE</div>}
          </div>
      </div>

      {/* ACTIVE PLAYERS HORIZONTAL SCROLL */}
      <div className="glass-panel p-4 rounded-xl">
          <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-hoops-yellow rounded-full animate-pulse"></div>
            Sur le terrain
          </h3>
          
          <div className="flex flex-col gap-4">
              {/* Team A Line */}
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

              {/* Team B Line */}
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

      {/* --- PLAYER MODAL (TRADING CARD WITH VOTING) --- */}
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