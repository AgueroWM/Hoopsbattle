import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { api } from '../services/api'
import { Video, BarChart3, ArrowLeft, Image as ImageIcon, Calendar, MapPin, MessageCircle, Mic2, Star, Edit, Save, Zap, Shield } from 'lucide-react'

export default function MatchDetails() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('stats')
  const [match, setMatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State pour stocker les votes globaux
  const [voteStats, setVoteStats] = useState<any>({})
  
  // Auth & Editing
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editReviewText, setEditReviewText] = useState('');
  const [editInterviewUrl, setEditInterviewUrl] = useState('');
  
  // Stats
  const [statsA, setStatsA] = useState<any[]>([])
  const [statsB, setStatsB] = useState<any[]>([])

  // Fonction de chargement stable mémorisée
  const loadMatch = useCallback(async () => {
        if (!id) return;
        
        // 1. Fetch Match Data (Clean Source)
        const matchData = await api.matches.getById(id);
        
        if (!matchData) {
            setError("Match introuvable ou supprimé.");
            setLoading(false);
            return;
        }

        setMatch(matchData);
        // Sync editing state
        if (!isEditingReview) {
            setEditReviewText(matchData.reviewText || '');
            setEditInterviewUrl(matchData.interviewVideoUrl || '');
        }

        // 2. Fetch Stats si le match existe
        if (matchData) {
            const { data: rawStats } = await supabase
                .from('player_stats')
                .select('*')
                .eq('match_id', id);
            
            // --- RECUPERATION DES VOTES GLOBAUX ---
            const { data: votes } = await supabase
                .from('vote_counts')
                .select('*')
                .eq('match_id', id);

            const vStats: any = {};
            votes?.forEach((v: any) => {
                if (!vStats[v.player_id]) vStats[v.player_id] = { mvp: 0, offense: 0, defense: 0 };
                vStats[v.player_id][v.category] = v.total_votes;
            });
            setVoteStats(vStats);
            // --------------------------------------

            const merge = (roster: any[]) => {
                if (!roster) return [];
                return roster.map(player => {
                    const s = rawStats?.find(rs => rs.player_id.toString() === player.id) || {};
                    return {
                        ...player,
                        points: s.points || 0,
                        rebounds: s.rebounds_total || 0,
                        assists: s.assists || 0,
                        fouls: s.fouls || 0,
                    };
                }).sort((a, b) => b.points - a.points);
            };

            setStatsA(merge(matchData.team_a.roster));
            setStatsB(merge(matchData.team_b.roster));
        }
        setLoading(false);
  }, [id, isEditingReview]);

  useEffect(() => {
    loadMatch();
    const auth = sessionStorage.getItem('hoops_admin_auth');
    setIsAdmin(auth === 'true');

    const subscription = supabase
      .channel('public-match-details')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, () => {
        loadMatch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_stats', filter: `match_id=eq.${id}` }, () => {
        loadMatch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_votes', filter: `match_id=eq.${id}` }, () => {
         loadMatch();
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription) };
  }, [id, loadMatch]);

  const saveReviewChanges = async () => {
      if(!id) return;
      try {
          const { error } = await supabase.from('matches').update({
              review_text: editReviewText,
              interview_video_url: editInterviewUrl
          }).eq('id', id);

          if (error) throw error;
          
          setIsEditingReview(false);
          setMatch((prev: any) => ({ ...prev, reviewText: editReviewText, interviewVideoUrl: editInterviewUrl }));
          alert("Contenu mis à jour !");
      } catch (e: any) {
          alert("Erreur de sauvegarde: " + e.message);
      }
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-hoops-bg flex flex-col items-center justify-center text-white gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hoops-yellow"></div>
              <p className="animate-pulse">Chargement du match...</p>
          </div>
      )
  }

  if (error || !match) {
      return (
          <div className="min-h-screen bg-hoops-bg flex flex-col items-center justify-center text-white p-4 text-center">
              <div className="text-6xl mb-4">🏀</div>
              <h1 className="text-2xl font-bold mb-2">Oups !</h1>
              <p className="text-gray-400 mb-6">{error || "Une erreur inconnue est survenue."}</p>
              <Link to="/schedule" className="bg-hoops-primary px-6 py-3 rounded-xl font-bold uppercase hover:bg-white hover:text-black transition-all">
                  Retour au Calendrier
              </Link>
          </div>
      )
  }

  const allPlayersWithStats = [...statsA, ...statsB].sort((a, b) => b.points - a.points);

  const isYoutube = (url: string) => url && (url.includes('youtube') || url.includes('youtu.be'));
  const getYoutubeId = (url: string) => url.replace('https://youtu.be/','').replace('https://www.youtube.com/watch?v=','').split('?')[0];

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24 font-sans">
      
      {/* HEADER */}
      <div className="relative pt-24 pb-12 overflow-hidden bg-gradient-to-b from-slate-900 to-[#020617]">
        {/* Background logos faded */}
        <img src={match.team_a.logoUrl} className="absolute -left-20 top-20 w-96 h-96 opacity-5 blur-3xl pointer-events-none" />
        <img src={match.team_b.logoUrl} className="absolute -right-20 top-20 w-96 h-96 opacity-5 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4">
            <Link to="/schedule" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-xs font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
                <ArrowLeft size={14} /> Retour Planning
            </Link>

            {/* LOGIQUE D'AFFICHAGE VIDÉO HYBRIDE (YouTube + Twitch) */}
            {match.youtube_id && (
              <div className="w-full aspect-video mb-4 rounded-xl overflow-hidden shadow-lg bg-black border border-gray-800">
                
                {/* CAS 1 : C'EST DU TWITCH */}
                {match.youtube_id.startsWith('twitch:') ? (
                  <iframe
                    src={`https://player.twitch.tv/?channel=${match.youtube_id.replace('twitch:', '')}&parent=localhost&parent=hoops-game.vercel.app&parent=${window.location.hostname}`}
                    height="100%"
                    width="100%"
                    allowFullScreen
                    title="Live Twitch"
                    className="w-full h-full"
                  ></iframe>
                ) : (
                  
                /* CAS 2 : C'EST DU YOUTUBE (Par défaut) */
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${match.youtube_id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`} 
                    title="Live YouTube"
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  ></iframe>
                )}
              </div>
            )}

            {/* SCOREBOARD CARD */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-4 py-1 rounded-b-xl border-x border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {new Date(match.start_time).toLocaleDateString()} • {match.status === 'live' ? 'EN DIRECT' : match.status === 'finished' ? 'TERMINÉ' : 'À VENIR'}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 mt-4">
                    {/* Team A */}
                    <div className="flex flex-col items-center gap-4 flex-1">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-hoops-primary/20 bg-black p-1 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                            <img src={match.team_a.logoUrl} className="w-full h-full object-cover rounded-full" onError={(e) => e.currentTarget.style.display='none'}/>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl md:text-4xl font-black italic uppercase leading-none mb-1">{match.team_a.name}</h2>
                            <span className="text-hoops-primary font-bold text-sm uppercase">{match.team_a.city}</span>
                        </div>
                    </div>

                    {/* Score */}
                    <div className="flex flex-col items-center">
                        <div className="text-6xl md:text-8xl font-display font-bold tracking-widest tabular-nums leading-none">
                            {match.status === 'scheduled' ? 'VS' : (
                                <>
                                    <span className="text-white">{match.score_team_a}</span>
                                    <span className="text-gray-600 mx-2">:</span>
                                    <span className="text-white">{match.score_team_b}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Team B */}
                    <div className="flex flex-col items-center gap-4 flex-1">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-hoops-yellow/20 bg-black p-1 shadow-[0_0_30px_rgba(244,255,95,0.2)]">
                            <img src={match.team_b.logoUrl} className="w-full h-full object-cover rounded-full" onError={(e) => e.currentTarget.style.display='none'}/>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl md:text-4xl font-black italic uppercase leading-none mb-1">{match.team_b.name}</h2>
                            <span className="text-hoops-yellow font-bold text-sm uppercase">{match.team_b.city}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* TABS */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex border-b border-white/10 mb-6 overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setActiveTab('stats')} 
                className={`px-6 py-4 font-bold uppercase tracking-wider text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'stats' ? 'border-hoops-primary text-white' : 'border-transparent text-gray-500 hover:text-white'}`}
            >
                Statistiques
            </button>
            <button 
                onClick={() => setActiveTab('ranking')} 
                className={`px-6 py-4 font-bold uppercase tracking-wider text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ranking' ? 'border-hoops-primary text-white' : 'border-transparent text-gray-500 hover:text-white'}`}
            >
                Classement
            </button>
            <button 
                onClick={() => setActiveTab('rosters')} 
                className={`px-6 py-4 font-bold uppercase tracking-wider text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'rosters' ? 'border-hoops-primary text-white' : 'border-transparent text-gray-500 hover:text-white'}`}
            >
                Effectifs
            </button>
            {/* NEW TAB: INTERVIEW / REVIEW */}
            <button 
                onClick={() => setActiveTab('review')} 
                className={`px-6 py-4 font-bold uppercase tracking-wider text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'review' ? 'border-hoops-primary text-white' : 'border-transparent text-gray-500 hover:text-white'}`}
            >
                <Mic2 size={16}/> Interview / Review
            </button>
        </div>

        {activeTab === 'stats' && (
            <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
                <TeamStatsCard team={match.team_a} stats={statsA} color="blue" />
                <TeamStatsCard team={match.team_b} stats={statsB} color="yellow" />
            </div>
        )}

        {activeTab === 'ranking' && (
            <div className="bg-hoops-card border border-white/5 rounded-xl overflow-hidden animate-fade-in">
                <div className="p-4 bg-black/20 font-bold uppercase tracking-widest text-xs text-gray-400 border-b border-white/5 grid grid-cols-12 gap-2">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-5">Joueur</div>
                    <div className="col-span-1 text-right">PTS</div>
                    <div className="col-span-5 grid grid-cols-3 gap-1 text-center">
                        <span>OFF</span>
                        <span>DEF</span>
                        <span>MVP</span>
                    </div>
                </div>
                <div className="divide-y divide-white/5">
                    {allPlayersWithStats.length > 0 ? allPlayersWithStats.slice(0, 10).map((player: any, idx) => (
                        <div key={player.id} className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-white/5 transition-colors">
                            <div className={`col-span-1 font-mono text-lg font-bold text-center ${idx < 3 ? 'text-hoops-yellow' : 'text-gray-600'}`}>
                                {idx + 1}
                            </div>
                            
                            <div className="col-span-5 flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-full bg-black overflow-hidden border border-white/10 flex-shrink-0">
                                    <img src={player.imageUrl} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-sm leading-none truncate">{player.name}</span>
                                    <span className="text-[10px] text-gray-500 mt-1 uppercase truncate">
                                        {/* Show Team Name */}
                                        {match.team_a.roster.find((p:any) => p.id === player.id) ? match.team_a.name : match.team_b.name}
                                    </span>
                                </div>
                            </div>

                            <div className="col-span-1 text-right">
                                <div className="font-mono font-bold text-lg text-white">{player.points}</div>
                            </div>
                            
                            <div className="col-span-5 grid grid-cols-3 gap-1.5">
                                {/* OFFENSE VOTES */}
                                <div className="text-center bg-blue-500/5 py-0.5 rounded border border-blue-500/10" title="Votes Offense">
                                    <div className="font-mono font-bold text-[10px] text-blue-400 flex items-center justify-center gap-1">
                                        <Zap size={8} fill="currentColor" className="opacity-70"/> 
                                        {voteStats[player.id]?.offense || 0}
                                    </div>
                                </div>

                                {/* DEFENSE VOTES */}
                                <div className="text-center bg-red-500/5 py-0.5 rounded border border-red-500/10" title="Votes Defense">
                                    <div className="font-mono font-bold text-[10px] text-red-400 flex items-center justify-center gap-1">
                                        <Shield size={8} fill="currentColor" className="opacity-70"/>
                                        {voteStats[player.id]?.defense || 0}
                                    </div>
                                </div>

                                {/* MVP VOTES */}
                                <div className="text-center bg-yellow-500/5 py-0.5 rounded border border-yellow-500/10" title="Votes MVP">
                                    <div className="font-mono font-bold text-[10px] text-yellow-400 flex items-center justify-center gap-1">
                                        <Star size={8} fill="currentColor" className="opacity-70"/>
                                        {voteStats[player.id]?.mvp || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-6 text-center text-gray-500 text-sm italic">Aucune donnée disponible</div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'rosters' && (
             <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
                {/* Roster lists simple */}
                <div className="bg-white/5 rounded-xl p-6">
                    <h3 className="font-bold text-hoops-primary mb-4 uppercase">{match.team_a.name}</h3>
                    <ul className="space-y-2">
                        {match.team_a.roster.map((p: any) => (
                            <li key={p.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded">
                                <span className="font-mono text-gray-400">#{p.number}</span>
                                <span className="font-bold">{p.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-white/5 rounded-xl p-6">
                    <h3 className="font-bold text-hoops-yellow mb-4 uppercase">{match.team_b.name}</h3>
                     <ul className="space-y-2">
                        {match.team_b.roster.map((p: any) => (
                            <li key={p.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded">
                                <span className="font-mono text-gray-400">#{p.number}</span>
                                <span className="font-bold">{p.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
             </div>
        )}

        {activeTab === 'review' && (
             <div className="animate-fade-in space-y-6">
                 
                 {isAdmin && (
                    <div className="flex justify-end mb-4">
                        <button 
                            onClick={() => {
                                if (isEditingReview) saveReviewChanges();
                                else setIsEditingReview(true);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase text-xs transition-all ${isEditingReview ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                        >
                            {isEditingReview ? <Save size={16}/> : <Edit size={16}/>}
                            {isEditingReview ? 'Enregistrer les modifications' : 'Éditer le contenu (Admin)'}
                        </button>
                    </div>
                 )}

                 {/* Video Interview */}
                 <div className="bg-hoops-card border border-white/10 rounded-xl overflow-hidden shadow-2xl p-1 bg-black">
                     {isEditingReview ? (
                         <div className="p-4 space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-400">Lien Vidéo (Youtube ou Fichier Uploadé)</label>
                            <input 
                                type="text"
                                className="w-full bg-black/50 border border-white/20 rounded p-2 text-white"
                                value={editInterviewUrl}
                                onChange={(e) => setEditInterviewUrl(e.target.value)}
                                placeholder="https://..."
                            />
                            <p className="text-[10px] text-gray-500 italic">Utilisez le bouton d'upload dans le dashboard admin pour mettre un fichier vidéo.</p>
                         </div>
                     ) : (
                        match.interviewVideoUrl ? (
                            isYoutube(match.interviewVideoUrl) ? (
                                 <iframe 
                                    width="100%" 
                                    height="400" 
                                    className="w-full aspect-video"
                                    src={`https://www.youtube.com/embed/${getYoutubeId(match.interviewVideoUrl)}?origin=${window.location.origin}&modestbranding=1&rel=0`} 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                    referrerPolicy="strict-origin-when-cross-origin"
                                ></iframe>
                            ) : (
                                 <video 
                                    src={match.interviewVideoUrl} 
                                    controls 
                                    className="w-full aspect-video bg-black object-contain" 
                                    preload="metadata"
                                 />
                            )
                        ) : (
                            <div className="bg-white/5 rounded-xl p-8 text-center text-gray-500 border border-dashed border-white/10">
                                <Video size={32} className="mx-auto mb-2 opacity-50"/>
                                Pas d'interview vidéo disponible.
                            </div>
                        )
                     )}
                 </div>

                 {/* Dynamic Text Review */}
                 <div className="bg-white/5 rounded-xl p-6 md:p-8 min-h-[200px]">
                     <h3 className="text-xl font-bold uppercase italic text-hoops-yellow mb-4 flex items-center gap-2">
                         <MessageCircle size={20}/> Le Debrief
                     </h3>
                     
                     {isEditingReview ? (
                         <textarea 
                            className="w-full h-40 bg-black/50 border border-white/20 rounded p-2 text-white text-sm"
                            value={editReviewText}
                            onChange={(e) => setEditReviewText(e.target.value)}
                            placeholder="Rédigez le résumé du match ici..."
                         />
                     ) : (
                         match.reviewText ? (
                             <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap">
                                 {match.reviewText}
                             </div>
                         ) : (
                             <p className="text-gray-500 italic">L'article de résumé n'a pas encore été rédigé par le staff.</p>
                         )
                     )}
                 </div>
             </div>
        )}

      </div>
    </div>
  )
}

function TeamStatsCard({ team, stats, color }: any) {
    const textColor = color === 'blue' ? 'text-hoops-primary' : 'text-hoops-yellow';
    
    return (
        <div className="bg-hoops-card border border-white/5 rounded-xl overflow-hidden">
            <div className="p-4 bg-black/20 font-bold uppercase tracking-widest text-xs text-gray-400 border-b border-white/5 flex justify-between">
                <span>{team.name}</span>
                <span>PTS</span>
            </div>
            <div className="divide-y divide-white/5">
                {stats.length > 0 ? stats.map((player: any) => (
                    <div key={player.id} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className={`font-mono text-xs ${textColor}`}>#{player.number}</span>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm leading-none">{player.name}</span>
                                <span className="text-[10px] text-gray-500 mt-1">{player.rebounds} REB • {player.assists} AST • {player.fouls} FLT</span>
                            </div>
                        </div>
                        <span className="font-mono font-bold text-lg">{player.points}</span>
                    </div>
                )) : (
                    <div className="p-6 text-center text-gray-500 text-sm italic">Aucune stat disponible</div>
                )}
            </div>
        </div>
    )
}