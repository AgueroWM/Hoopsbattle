import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Camera, Upload, Plus, ArrowRight, Trophy, X, User, Calendar, Smile } from 'lucide-react';
import { api } from '../services/api'; 
import { Team, Player } from '../types';
import SmoothImage from '../components/SmoothImage';

const Home: React.FC = () => {
  const [highlights, setHighlights] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<any[]>([]); 

  // Dynamic Date State
  const [nextMatchDay, setNextMatchDay] = useState<string>('--');
  const [nextMatchLabel, setNextMatchLabel] = useState<string>('À venir');
  const [nextMatchSub, setNextMatchSub] = useState<string>('Janvier');

  const [brokenMediaIds, setBrokenMediaIds] = useState<Set<number>>(new Set());

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState<'select' | 'details'>('select');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Upload Meta Data
  const [videoTitle, setVideoTitle] = useState('');
  const [userName, setUserName] = useState(''); 
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  
  // Search Filters for Upload Modal
  const [playerSearch, setPlayerSearch] = useState('');
  const [matchSearch, setMatchSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Flatten players for dropdown
      const players = data.flatMap(t => t.roster);
      setAllPlayers(players);
  }

  async function fetchMatches() {
      const { data } = await supabase
        .from('matches')
        .select('id, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name), start_time, status')
        .order('start_time', { ascending: false }); 
      
      if (data) {
          setMatches(data);
          determineNextKickoff(data);
      }
  }

  // --- LOGIQUE DATE AUTOMATIQUE ---
  const determineNextKickoff = (allMatches: any[]) => {
      // Filtrer les matchs non terminés (scheduled ou live) et les trier par date croissante
      const upcoming = allMatches
        .filter(m => m.status !== 'finished')
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      // Prendre le tout premier match à venir
      const nextMatch = upcoming[0];

      if (nextMatch) {
          const date = new Date(nextMatch.start_time);
          setNextMatchDay(date.getDate().toString());
          
          // Mois en toutes lettres
          const month = date.toLocaleString('fr-FR', { month: 'long' });
          setNextMatchSub(month.charAt(0).toUpperCase() + month.slice(1));

          // Logique spécifique pour les labels de jours
          const day = date.getDate();
          const monthIdx = date.getMonth(); // 0 = Janvier

          if (monthIdx === 0) { // Janvier
             if (day === 10) setNextMatchLabel('Kickoff J1');
             else if (day === 11) setNextMatchLabel('Kickoff J2');
             else if (day === 17) setNextMatchLabel('Kickoff J3');
             else if (day === 18) setNextMatchLabel('Kickoff J4');
             else if (day === 25) setNextMatchLabel('Finales');
             else setNextMatchLabel('Kickoff Day');
          } else {
             setNextMatchLabel('Prochain Match');
          }
      } else {
          // Fallback si tout est fini ou pas de match
          setNextMatchDay('--');
          setNextMatchLabel('Saison Terminée');
          setNextMatchSub('Hoops');
      }
  };

  const handleMediaError = (id: number) => {
      setBrokenMediaIds(prev => new Set(prev).add(id));
  };

  // --- UPLOAD FLOW ---

  const openUploadModal = () => {
      setShowUploadModal(true);
      setUploadStep('select');
      setUploadFile(null);
      setVideoTitle('');
      setUserName('');
      setSelectedPlayerId('');
      setSelectedMatchId('');
      setPlayerSearch('');
      setMatchSearch('');
  };

  const handleFileSelect = (event: any) => {
      const file = event.target.files[0];
      if (file) {
          setUploadFile(file);
          setUploadStep('details');
      }
  };

  const handleFinalUpload = async () => {
    try {
      if (!isSupabaseConfigured()) {
          alert("Mode hors ligne : Upload impossible.");
          return;
      }
      if (!uploadFile) return;
      if (!videoTitle.trim()) {
          alert("Veuillez donner un titre à votre vidéo.");
          return;
      }

      setUploading(true);

      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `fan_${Date.now()}.${fileExt}`;
      const filePath = `fan_uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('hoops-media').upload(filePath, uploadFile);
      if (uploadError) throw new Error("Erreur Storage: " + uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from('hoops-media').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('highlights').insert({
          title: videoTitle,
          media_url: publicUrl,
          media_type: uploadFile.type.startsWith('video') ? 'video' : 'image',
          status: 'pending', 
          user_name: userName.trim() || 'Fan Anonyme',
          player_id: selectedPlayerId ? parseInt(selectedPlayerId) : null,
          match_id: selectedMatchId ? parseInt(selectedMatchId) : null
      });

      if (dbError) throw new Error("Erreur DB: " + dbError.message);

      alert("✅ Contenu envoyé ! Il sera visible après validation.");
      setShowUploadModal(false);
    } catch (error: any) {
      alert("❌ Erreur : " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const isVideo = (url: string) => url && (url.includes('.mp4') || url.includes('.mov') || url.includes('.webm'));
  const visibleHighlights = highlights.filter(media => !brokenMediaIds.has(media.id));

  // Filtered Lists
  const filteredPlayers = allPlayers.filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase()));
  const filteredMatches = matches.filter(m => 
      (m.team_a?.name?.toLowerCase().includes(matchSearch.toLowerCase())) || 
      (m.team_b?.name?.toLowerCase().includes(matchSearch.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-12 pb-12 pt-24 px-4 max-w-7xl mx-auto font-sans relative">
      
      {/* HERO SECTION */}
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

            <div className="glass-panel p-4 rounded-xl text-center min-w-[120px] hidden md:block animate-float">
                <span className="block text-3xl font-bold text-white">{nextMatchDay}</span>
                <span className="block text-xs font-bold text-hoops-yellow uppercase tracking-widest border-b border-white/10 pb-1 mb-1">{nextMatchLabel}</span>
                <span className="block text-xs text-gray-400">{nextMatchSub}</span>
            </div>
         </div>
      </section>

      {/* PARTNERS STRIP */}
      <section className="border-y border-white/5 py-6 overflow-hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-center md:justify-between gap-8 flex-wrap opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hidden md:block">Partenaires Officiels</span>
             <div className="flex items-center gap-8 md:gap-16">
                 {/* Replace with real logos */}
                 <img src="/partners/logo_hoops_game.jpg" className="h-6 md:h-8 w-auto rounded-md" alt="Hoops Game" />
                 <img src="/partners/logo_omega_sport.jpg" className="h-6 md:h-8 w-auto rounded-md" alt="Omega Sport" />
             </div>
          </div>
      </section>

      {/* --- LIVE FEED --- */}
      <section>
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-3xl font-display font-bold uppercase italic text-white flex items-center gap-3">
                 <Camera className="w-6 h-6 text-hoops-yellow" />
                 Le Feed
             </h2>
             <button 
                onClick={openUploadModal}
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
                        <SmoothImage 
                            src={media.video_url || media.media_url} 
                            className="w-full h-full transition-transform duration-500 group-hover:scale-110" 
                            alt="Highlight"
                            onError={() => handleMediaError(media.id)}
                        />
                    )}
                    
                    {/* Clean Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-100 flex flex-col justify-end p-4">
                        <div className="flex items-center gap-2 mb-1">
                             <span className="text-[10px] font-bold text-hoops-yellow uppercase bg-black/40 px-2 rounded">
                                 {media.user_name || 'Fan'}
                             </span>
                        </div>
                        {/* Ajout de leading-normal et pb-1 pour éviter de couper les lettres descendantes (g, p, etc.) */}
                        <h3 className="text-sm font-bold text-white leading-normal pb-1 mb-1">{media.title || 'Action du match'}</h3>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                             {/* Tags */}
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

      {/* TEAMS STRIP */}
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
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-black border border-white/10">
                         <SmoothImage 
                            src={team.logoUrl} 
                            className="w-full h-full" 
                            objectFit="cover"
                            alt={team.name}
                            onError={(e: any) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=random&color=fff`;
                            }}
                        />
                    </div>
                    <div className="w-full overflow-hidden">
                        <div className="font-display font-bold text-lg uppercase italic text-white leading-none truncate w-full">{team.name}</div>
                    </div>
                </Link>
            )) : (
              <div className="col-span-full text-center text-gray-500 py-4">Chargement...</div>
            )}
         </div>
      </section>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-hoops-card border border-white/20 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh]">
                <button onClick={() => setShowUploadModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
                    <X size={24}/>
                </button>

                <div className="p-6 overflow-y-auto">
                    <h2 className="text-xl font-display font-bold uppercase italic mb-6">Poster sur le Feed</h2>
                    
                    {uploadStep === 'select' ? (
                        <div 
                            className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:bg-white/5 transition-colors cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <Upload className="text-hoops-yellow w-8 h-8"/>
                            </div>
                            <p className="font-bold text-white mb-2">Cliquez pour choisir</p>
                            <p className="text-xs text-gray-400">Vidéo ou Photo (Max 50Mo)</p>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="video/*,image/*" 
                                onChange={handleFileSelect}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                             {/* Preview Filename */}
                             <div className="bg-white/5 px-4 py-2 rounded text-xs text-gray-400 truncate border border-white/10 flex items-center gap-2">
                                <Upload size={12}/> {uploadFile?.name}
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Titre de l'action</label>
                                <input 
                                    type="text" 
                                    value={videoTitle}
                                    onChange={(e) => setVideoTitle(e.target.value)}
                                    placeholder="Ex: Dunk monstrueux de..." 
                                    className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-hoops-primary focus:outline-none"
                                    autoFocus
                                />
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-2">
                                    <Smile size={12}/> Votre Nom (Optionnel)
                                </label>
                                <input 
                                    type="text" 
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="Pseudo / Nom" 
                                    className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-hoops-primary focus:outline-none"
                                />
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-2">
                                    <User size={12}/> Mentionner un joueur (Optionnel)
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="Rechercher un joueur..."
                                        value={playerSearch}
                                        onChange={(e) => setPlayerSearch(e.target.value)}
                                        className="w-full bg-black/50 border border-white/20 rounded-t p-2 text-xs text-white focus:outline-none"
                                    />
                                    <select 
                                        value={selectedPlayerId} 
                                        onChange={(e) => { setSelectedPlayerId(e.target.value); }}
                                        className="w-full bg-black/50 border border-white/20 rounded-b p-3 text-white focus:border-hoops-primary focus:outline-none appearance-none"
                                        size={3}
                                    >
                                        <option value="">-- Aucun --</option>
                                        {filteredPlayers.slice(0, 20).map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                                        ))}
                                    </select>
                                </div>
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-2">
                                    <Calendar size={12}/> Mentionner un match (Optionnel)
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="Rechercher un match (équipe)..."
                                        value={matchSearch}
                                        onChange={(e) => setMatchSearch(e.target.value)}
                                        className="w-full bg-black/50 border border-white/20 rounded-t p-2 text-xs text-white focus:outline-none"
                                    />
                                    <select 
                                        value={selectedMatchId} 
                                        onChange={(e) => setSelectedMatchId(e.target.value)}
                                        className="w-full bg-black/50 border border-white/20 rounded-b p-3 text-white focus:border-hoops-primary focus:outline-none appearance-none"
                                        size={3}
                                    >
                                        <option value="">-- Aucun --</option>
                                        {filteredMatches.slice(0, 10).map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.team_a?.name || '?'} vs {m.team_b?.name || '?'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                             </div>

                             <button 
                                onClick={handleFinalUpload}
                                disabled={uploading}
                                className="w-full bg-hoops-primary text-white font-bold uppercase py-4 rounded-xl hover:bg-blue-600 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                {uploading ? 'Envoi en cours...' : 'Publier'}
                             </button>
                             
                             <button 
                                onClick={() => setUploadStep('select')}
                                className="w-full text-xs text-gray-500 hover:text-white mt-2"
                             >
                                Choisir un autre fichier
                             </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Home;