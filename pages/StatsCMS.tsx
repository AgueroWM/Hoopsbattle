import React, { useState, useEffect, useRef } from 'react';
import { Team } from '../types';
import { api } from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Users, Camera, Edit3, Save, RefreshCw, ArrowLeft, Search, Plus, Trash2 } from 'lucide-react';
import PlayerModal from '../components/PlayerModal';
import SmoothImage from '../components/SmoothImage';

const StatsCMS: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Auth state
  const [isAdmin, setIsAdmin] = useState(false);

  // Trigger pour recharger la liste si besoin
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Mode Édition
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ type: 'team' | 'player', id: string } | null>(null);

  // Viewer State (Modal)
  const [viewingPlayer, setViewingPlayer] = useState<any>(null);

  useEffect(() => {
    fetchTeamsAndStats();
    const auth = sessionStorage.getItem('hoops_admin_auth');
    setIsAdmin(auth === 'true');
  }, [refreshTrigger]);

  useEffect(() => {
      if (searchTerm.trim() === '') {
          setFilteredTeams(teams);
      } else {
          setFilteredTeams(teams.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())));
      }
  }, [searchTerm, teams]);

  const fetchTeamsAndStats = async () => {
      setLoading(true);
      // 1. Fetch Teams
      const teamsList = await api.teams.getAll();
      
      // 2. Fetch Finished Matches for precise win/loss Calc
      const { data: finishedMatches } = await supabase
        .from('matches')
        .select('team_a_id, team_b_id, score_team_a, score_team_b')
        .eq('status', 'finished');

      const teamStats = new Map<string, { wins: number, losses: number }>();

      teamsList.forEach(t => {
          teamStats.set(t.id, { wins: 0, losses: 0 });
      });

      if (finishedMatches) {
          finishedMatches.forEach((m: any) => {
              const teamAId = String(m.team_a_id);
              const teamBId = String(m.team_b_id);
              
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
      }

      // Merge stats into teams
      const enrichedTeams = teamsList.map(t => {
          const stats = teamStats.get(t.id) || { wins: 0, losses: 0 };
          return {
              ...t,
              wins: stats.wins,
              losses: stats.losses
          };
      });
      
      setTeams(enrichedTeams);
      setLoading(false);
      
      if (selectedTeam) {
          const updated = enrichedTeams.find(t => t.id === selectedTeam.id);
          if (updated) setSelectedTeam(updated);
      }
  };

  const handleTeamClick = (team: Team) => {
      setSelectedTeam(team);
      window.scrollTo(0, 0);
  };

  const handleBack = () => {
      setSelectedTeam(null);
  };

  // Gestion du clic joueur : Soit Upload, Soit Voir la carte
  const handlePlayerClick = (player: any) => {
      if (isEditMode) {
          handleUploadClick('player', player.id);
      } else {
          // Attacher l'équipe pour l'affichage du logo
          setViewingPlayer({ ...player, team: selectedTeam });
      }
  };

  const handleUploadClick = (type: 'team' | 'player', id: string) => {
      if (!isSupabaseConfigured()) {
          alert("Base de données non connectée. Impossible d'uploader.");
          return;
      }
      setUploadTarget({ type, id });
      setTimeout(() => {
          fileInputRef.current?.click();
      }, 50);
  };

  const handleFileChange = async (event: any) => {
     const file = event.target.files[0];
    if (!file || !uploadTarget) return;

    setUploadingId(uploadTarget.id);

    try {
        const fileExt = file.name.split('.').pop();
        const uniqueSuffix = Date.now() + Math.floor(Math.random() * 10000);
        const fileName = `${uploadTarget.type}_${uploadTarget.id}_${uniqueSuffix}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('hoops-media').upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('hoops-media').getPublicUrl(filePath);

        if (uploadTarget.type === 'team') {
            await supabase.from('teams').update({ logo_url: publicUrl }).eq('id', uploadTarget.id);
            setTeams(prev => prev.map(t => t.id === uploadTarget.id ? { ...t, logoUrl: publicUrl } : t));
        } else {
            const { error: dbError } = await supabase.from('players').update({ avatar_url: publicUrl }).eq('id', uploadTarget.id);
            if(dbError) throw dbError;
            if (selectedTeam) {
                const updatedRoster = selectedTeam.roster.map(p => p.id === uploadTarget.id ? { ...p, imageUrl: publicUrl } : p);
                setSelectedTeam({ ...selectedTeam, roster: updatedRoster });
            }
        }
        setRefreshTrigger(prev => prev + 1);
    } catch (e: any) { alert("Erreur lors de l'upload : " + e.message); } finally { setUploadingId(null); setUploadTarget(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleAddPlayer = async () => {
      if (!selectedTeam) return;
      const name = prompt("Nom du nouveau joueur :");
      if (!name) return;
      const number = prompt("Numéro de maillot :");
      if (!number) return;

      try {
          const { error } = await supabase.from('players').insert({
              team_id: parseInt(selectedTeam.id),
              name: name,
              number: parseInt(number),
              position: 'G',
              height: '190cm'
          });
          
          if (error) throw error;
          setRefreshTrigger(prev => prev + 1);
          alert("Joueur ajouté !");
      } catch (e: any) {
          alert("Erreur ajout : " + e.message);
      }
  }

  const handleDeletePlayer = async (playerId: string) => {
      if (!confirm("Voulez-vous vraiment supprimer ce joueur définitivement ?")) return;
      try {
          const { error } = await supabase.from('players').delete().eq('id', playerId);
          if (error) throw error;
          setRefreshTrigger(prev => prev + 1);
      } catch (e: any) {
          alert("Erreur suppression : " + e.message);
      }
  }

  if (loading) return <div className="min-h-screen pt-24 text-center text-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hoops-yellow"></div></div>;

  return (
    <div className="min-h-screen bg-hoops-bg text-white pt-24 pb-24 px-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        
        {viewingPlayer && <PlayerModal player={viewingPlayer} onClose={() => setViewingPlayer(null)} />}

        {/* Header commun */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h1 className="text-3xl font-display font-bold uppercase italic flex items-center gap-3">
                <Users className="text-hoops-yellow"/> Gestion Équipes & Joueurs
            </h1>
            
            {isAdmin && (
                <button onClick={() => setIsEditMode(!isEditMode)} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold uppercase text-sm transition-all shadow-lg ${isEditMode ? 'bg-green-600 text-white animate-pulse' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                    {isEditMode ? <Save size={18}/> : <Edit3 size={18}/>}
                    {isEditMode ? 'Terminer Édition' : 'Mode Édition Photos'}
                </button>
            )}
        </div>

        {!selectedTeam ? (
            <div className="animate-fade-in">
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20}/>
                    {/* CORRECTION COULEUR FOND ET TEXTE */}
                    <input type="text" placeholder="Rechercher une équipe..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-hoops-primary transition-colors" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredTeams.map(team => (
                        <div key={team.id} onClick={() => handleTeamClick(team)} className="bg-hoops-card border border-white/10 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-hoops-primary hover:bg-white/5 transition-all group">
                            <div className="w-16 h-16 rounded-full bg-black border border-white/10 flex-shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
                                <SmoothImage src={team.logoUrl} className="w-full h-full" objectFit="cover" alt={team.name} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-lg uppercase italic truncate">{team.name}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{team.city}</p>
                                <div className="mt-1 flex items-center gap-2 text-xs text-hoops-primary font-mono">
                                    <span>{team.wins}V - {team.losses}D</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <div className="animate-fade-in">
                <button onClick={handleBack} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white font-bold uppercase text-xs tracking-wider bg-white/5 px-4 py-2 rounded-full w-fit">
                    <ArrowLeft size={16}/> Retour à la liste
                </button>

                <div className="bg-hoops-card border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-8 md:p-12 bg-gradient-to-br from-black to-hoops-card border-b border-white/10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                        {/* GROS LOGO DETAIL */}
                        <div className={`relative w-40 h-40 rounded-full border-4 border-white/10 bg-black shadow-2xl flex-shrink-0 group overflow-hidden ${isEditMode ? 'cursor-pointer hover:border-green-500' : ''}`} onClick={() => isEditMode && handleUploadClick('team', selectedTeam.id)}>
                            <SmoothImage src={selectedTeam.logoUrl} className={`w-full h-full transition-opacity ${uploadingId === selectedTeam.id ? 'opacity-50' : ''}`} objectFit="cover" alt={selectedTeam.name} />
                            {isEditMode && (<div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-full transition-all"><Camera className="text-white w-10 h-10 drop-shadow-lg" /></div>)}
                            {uploadingId === selectedTeam.id && (<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full z-20"><RefreshCw className="animate-spin text-hoops-yellow w-10 h-10"/></div>)}
                        </div>
                        
                        <div>
                            <div className="inline-block px-3 py-1 rounded bg-hoops-primary/20 text-hoops-primary text-xs font-bold uppercase tracking-widest mb-3 border border-hoops-primary/30">{selectedTeam.city}</div>
                            <h2 className="text-4xl md:text-6xl font-display font-bold italic uppercase leading-none mb-4">{selectedTeam.name}</h2>
                            <div className="flex items-center justify-center md:justify-start gap-6 font-mono text-sm text-gray-400">
                                <div className="flex flex-col"><span className="text-2xl font-bold text-white">{selectedTeam.wins}</span><span>Victoires</span></div>
                                <div className="w-px h-8 bg-white/10"></div>
                                <div className="flex flex-col"><span className="text-2xl font-bold text-white">{selectedTeam.losses}</span><span>Défaites</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 bg-black/20">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="text-xl font-bold uppercase italic flex items-center gap-3">Effectif <span className="text-sm not-italic font-normal text-gray-500 font-sans">({selectedTeam.roster.length} Joueurs)</span></h3>
                             {isAdmin && (
                                 <button onClick={handleAddPlayer} className="bg-hoops-primary hover:bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                                     <Plus size={14}/> Ajouter
                                 </button>
                             )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {selectedTeam.roster.map(player => (
                                <div key={player.id} className="bg-hoops-bg border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-white/20 transition-all group relative overflow-hidden cursor-pointer" onClick={() => handlePlayerClick(player)}>
                                    <div className={`relative w-16 h-16 rounded-full bg-black border border-white/10 flex-shrink-0 overflow-hidden ${isEditMode ? 'hover:ring-2 ring-green-500' : ''}`}>
                                        <SmoothImage src={player.imageUrl} className={`w-full h-full rounded-full transition-opacity ${uploadingId === player.id ? 'opacity-50' : ''}`} alt={player.name} />
                                        {isEditMode && (<div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-full transition-all"><Camera size={20} className="text-white"/></div>)}
                                        {uploadingId === player.id && (<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full z-20"><RefreshCw className="animate-spin text-hoops-yellow w-6 h-6"/></div>)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-hoops-primary uppercase mb-0.5">{player.position}</div>
                                        <div className="font-bold text-white text-lg leading-tight truncate">{player.name}</div>
                                        <div className="font-mono text-gray-500 text-xs mt-0.5">#{player.number}</div>
                                    </div>
                                    {/* Delete Button for Admin */}
                                    {isAdmin && (
                                        <button onClick={(e) => {e.stopPropagation(); handleDeletePlayer(player.id)}} className="absolute top-2 right-2 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50 p-1 rounded">
                                            <Trash2 size={14}/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default StatsCMS;