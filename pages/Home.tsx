import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Camera, Plus, ArrowRight, Trophy } from 'lucide-react';
import { api } from '../services/api'; 
import { Team, Player } from '../types';
import { UploadModal } from '../components/UploadModal';

const Home: React.FC = () => {
  const [highlights, setHighlights] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  const [brokenMediaIds, setBrokenMediaIds] = useState<Set<number>>(new Set());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    fetchHighlights();
    fetchTeamsAndPlayers();
    fetchMatches();

    const mediaSub = supabase
      .channel('public:highlights')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'highlights' }, () => {
        fetchHighlights();
      })
      .subscribe();

    return () => { supabase.removeChannel(mediaSub) };
  }, []);

  async function fetchHighlights() {
    const { data } = await supabase
      .from('highlights')
      .select(`
        *,
        player:players(name, number),
        match:matches(team_a:teams!team_a_id(name), team_b:teams!team_b_id(name))
      `)
      .neq('status', 'pending')
      .neq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (data) setHighlights(data);
  }

  async function fetchTeamsAndPlayers() {
      const data = await api.teams.getAll();
      setTeams(data);
      const players = data.flatMap(t => t.roster);
      setAllPlayers(players);
  }

  async function fetchMatches() {
      const { data } = await supabase
        .from('matches')
        .select('id, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name), start_time')
        .order('start_time', { ascending: false });
      if (data) setMatches(data);
  }

  const handleMediaError = (id: number) => {
      setBrokenMediaIds(prev => new Set(prev).add(id));
  };

  const isVideo = (url: string) => url && (url.includes('.mp4') || url.includes('.mov') || url.includes('.webm'));
  const visibleHighlights = highlights.filter(media => !brokenMediaIds.has(media.id));

  return (
    <div className="flex flex-col gap-12 pb-12 pt-24 px-4 max-w-7xl mx-auto font-sans relative">
      
      <section className="relative rounded-3xl overflow-hidden min-h-[500px] flex items-end shadow-2xl group">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519861531473-9200262188bf?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-hoops-bg via-hoops-bg/80 to-transparent"></div>
         
         <div className="relative z-10 p-6 md:p-12 w-full flex flex-col md:flex-row items-end justify-between gap-6">
            <div className="max-w-2xl w-full">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-hoops-yellow text-black text-xs font-black uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(244,255,95,0.5)]">
                    <Trophy size={12} /> Saison 2026
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-bold italic uppercase leading-none mb-4 text-white drop-shadow-2xl break-words w-full">
                    Le Week-end des <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-hoops-yellow to-white">Champions</span>
                </h1>
                <p className="text-gray-300 text-sm md:text-lg max-w-md font-sans leading-relaxed mb-6 border-l-4 border-hoops-primary pl-4">
                    20 Équipes. 3 Semaines. Un seul trophée. Vivez l'intensité du tournoi le plus attendu de l'année.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                     <Link to="/live" className="bg-hoops-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2">
                        Accéder au Live
                     </Link>
                     <Link to="/schedule" className="bg-white/10 hover:bg-white/20 backdrop-blur text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-white/20">
                        Calendrier <ArrowRight size={16} />
                     </Link>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-xl text-center min-w-[120px] hidden md:block">
                <span className="block text-3xl font-bold text-white">10</span>
                <span className="block text-xs font-bold text-hoops-yellow uppercase tracking-widest border-b border-white/10 pb-1 mb-1">Janvier</span>
                <span className="block text-xs text-gray-400">Kickoff</span>
            </div>
         </div>
      </section>

      <section className="border-y border-white/5 py-6 overflow-hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-center md:justify-between gap-8 flex-wrap opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hidden md:block">Partenaires Officiels</span>
             <div className="flex items-center gap-8 md:gap-16">
                 <img src="/partners/logo_hoops_game.jpg" className="h-8 md:h-12 w-auto object-contain rounded opacity-80 hover:opacity-100 transition-opacity" alt="Hoops Game" />
                 <img src="/partners/logo_omega_sport.jpg" className="h-8 md:h-12 w-auto object-contain rounded opacity-80 hover:opacity-100 transition-opacity" alt="Omega Sport" />
             </div>
          </div>
      </section>

      <section>
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-3xl font-display font-bold uppercase italic text-white flex items-center gap-3">
                 <Camera className="w-6 h-6 text-hoops-yellow" />
                 Le Feed
             </h2>
             <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase tracking-wider text-xs cursor-pointer transition-all bg-hoops-primary text-white hover:bg-blue-600 shadow-lg"
             >
                <Plus size={14}/> Poster une Action
             </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleHighlights.map((media) => (
                <div key={media.id} className="relative aspect-[9/16] bg-hoops-card rounded-xl overflow-hidden border border-white/10 group hover:border-hoops-yellow transition-colors">
                    {isVideo(media.video_url || media.media_url || '') ? (
                        <video 
                            src={media.video_url || media.media_url} 
                            className="w-full h-full object-cover" 
                            loop muted autoPlay playsInline
                            onError={() => handleMediaError(media.id)}
                        />
                    ) : (
                        <img 
                            src={media.video_url || media.media_url} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                            alt="Highlight"
                            onError={() => handleMediaError(media.id)}
                        />
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-100 flex flex-col justify-end p-4">
                        <div className="flex items-center gap-2 mb-1">
                             <span className="text-[10px] font-bold text-hoops-yellow uppercase bg-black/40 px-2 rounded">
                                 {media.user_name || 'Fan'}
                             </span>
                        </div>
                        <h3 className="text-sm font-bold text-white leading-tight mb-1">{media.title || 'Action du match'}</h3>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                             {media.player?.name && (
                                 <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white backdrop-blur-sm">
                                     @{media.player.name}
                                 </span>
                             )}
                             {media.match && (
                                 <span className="text-[10px] font-bold bg-hoops-primary/80 px-2 py-0.5 rounded text-white backdrop-blur-sm truncate max-w-[150px]">
                                     {media.match.team_a?.name} vs {media.match.team_b?.name}
                                 </span>
                             )}
                        </div>
                    </div>
                </div>
            ))}
            
            {visibleHighlights.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p className="text-gray-500 text-sm">Le feed est calme... Soyez le premier à poster !</p>
                </div>
            )}
          </div>
      </section>

      <section className="w-full">
         <div className="flex justify-between items-end mb-6 px-2">
            <h2 className="text-3xl font-display font-bold uppercase italic text-white">Équipes en lice</h2>
            <Link to="/teams" className="text-xs font-bold text-hoops-yellow hover:text-white transition-colors uppercase border border-hoops-yellow/30 px-3 py-1 rounded-full">
                Voir tout
            </Link>
         </div>
         <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {teams.length > 0 ? teams.slice(0, 8).map(team => (
                <Link key={team.id} to="/teams" className="glass-panel p-4 rounded-xl hover:bg-white/5 transition-colors group flex flex-col items-center justify-center gap-3 text-center border border-white/5 hover:border-hoops-primary/50 aspect-square">
                    <img 
                        src={team.logoUrl} 
                        className="w-12 h-12 rounded-full object-cover bg-white/5 border border-white/10" 
                        alt={team.name}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=random&color=fff`;
                        }}
                    />
                    <div className="w-full overflow-hidden">
                        <div className="font-display font-bold text-lg uppercase italic text-white leading-none truncate w-full">{team.name}</div>
                    </div>
                </Link>
            )) : (
              <div className="col-span-full text-center text-gray-500 py-4">Chargement...</div>
            )}
         </div>
      </section>

      <UploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        players={allPlayers}
        matches={matches}
        onUploadSuccess={() => fetchHighlights()}
      />

    </div>
  );
};

export default Home;