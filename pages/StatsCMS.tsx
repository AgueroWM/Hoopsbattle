import React, { useState, useEffect, useRef } from 'react';
import { Team } from '../types';
import { api } from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Users, Camera, Edit3, Save, RefreshCw, ArrowLeft, Search, Lock } from 'lucide-react';

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

  useEffect(() => {
    fetchTeams();
    // Check admin session
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

  const fetchTeams = async () => {
      const data = await api.teams.getAll();
      setTeams(data);
      setLoading(false);
      
      // Si une équipe était sélectionnée, on met à jour ses données pour voir les changements
      if (selectedTeam) {
          const updated = data.find(t => t.id === selectedTeam.id);
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

        // 1. Upload vers Supabase Storage
        const { error: uploadError } = await supabase.storage.from('hoops-media').upload(filePath, file, {
            upsert: true
        });
        if (uploadError) throw uploadError;

        // 2. Récupération URL Publique
        const { data: { publicUrl } } = supabase.storage.from('hoops-media').getPublicUrl(filePath);

        // 3. Mise à jour de la table
        if (uploadTarget.type === 'team') {
            await supabase.from('teams').update({ logo_url: publicUrl }).eq('id', uploadTarget.id);
            // Optimistic Update Team
            setTeams(prev => prev.map(t => t.id === uploadTarget.id ? { ...t, logoUrl: publicUrl } : t));
        } else {
            const { error: dbError } = await supabase.from('players').update({ avatar_url: publicUrl }).eq('id', uploadTarget.id);
            if(dbError) throw dbError;
            
            // Optimistic Update Player
            if (selectedTeam) {
                const updatedRoster = selectedTeam.roster.map(p => 
                    p.id === uploadTarget.id ? { ...p, imageUrl: publicUrl } : p
                );
                // Mise à jour immédiate de l'état local pour refléter le changement
                setSelectedTeam({ ...selectedTeam, roster: updatedRoster });
            }
        }

        // 4. Force global Refresh just in case
        setRefreshTrigger(prev => prev + 1);
        // alert("✅ Photo mise à jour !");

    } catch (e: any) {
        alert("Erreur lors de l'upload : " + e.message);
    } finally {
        setUploadingId(null);
        setUploadTarget(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) return <div className="min-h-screen pt-24 text-center text-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hoops-yellow"></div></div>;

  return (
    <div className="min-h-screen bg-hoops-bg text-white pt-24 pb-24 px-4 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Input caché pour l'upload */}
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
        />

        {/* Header commun */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h1 className="text-3xl font-display font-bold uppercase italic flex items-center gap-3">
                <Users className="text-hoops-yellow"/> Gestion Équipes & Joueurs
            </h1>
            
            {isAdmin && (
                <button 
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold uppercase text-sm transition-all shadow-lg ${isEditMode ? 'bg-green-600 text-white animate-pulse' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                >
                    {isEditMode ? <Save size={18}/> : <Edit3 size={18}/>}
                    {isEditMode ? 'Terminer Édition' : 'Mode Édition Photos'}
                </button>
            )}
        </div>

        {!selectedTeam ? (
            // VUE GRILLE DES ÉQUIPES
            <div className="animate-fade-in">
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20}/>
                    <input 
                        type="text" 
                        placeholder="Rechercher une équipe..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-hoops-card border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-hoops-primary transition-colors"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredTeams.map(team => (
                        <div 
                            key={team.id}
                            onClick={() => handleTeamClick(team)}
                            className="bg-hoops-card border border-white/10 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-hoops-primary hover:bg-white/5 transition-all group"
                        >
                            <div className="w-16 h-16 rounded-full bg-black border border-white/10 p-1 flex-shrink-0 group-hover:scale-110 transition-transform">
                                <img src={team.logoUrl} className="w-full h-full object-cover rounded-full" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-lg uppercase italic truncate">{team.name}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{team.city}</p>
                                <div className="mt-1 text-xs text-hoops-primary font-mono">{team.roster.length} Joueurs</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            // VUE DÉTAIL ÉQUIPE
            <div className="animate-fade-in">
                <button 
                    onClick={handleBack} 
                    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white font-bold uppercase text-xs tracking-wider bg-white/5 px-4 py-2 rounded-full w-fit"
                >
                    <ArrowLeft size={16}/> Retour à la liste
                </button>

                <div className="bg-hoops-card border border-white/10 rounded-2xl overflow-hidden">
                    {/* Team Header */}
                    <div className="p-8 md:p-12 bg-gradient-to-br from-black to-hoops-card border-b border-white/10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                        <div 
                            className={`relative w-40 h-40 rounded-full border-4 border-white/10 bg-black shadow-2xl flex-shrink-0 group ${isEditMode ? 'cursor-pointer hover:border-green-500' : ''}`}
                            onClick={() => isEditMode && handleUploadClick('team', selectedTeam.id)}
                        >
                            <img src={selectedTeam.logoUrl} className={`w-full h-full object-cover rounded-full transition-opacity ${uploadingId === selectedTeam.id ? 'opacity-50' : ''}`} />
                            
                            {isEditMode && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-full transition-all">
                                    <Camera className="text-white w-10 h-10 drop-shadow-lg" />
                                </div>
                            )}
                            {uploadingId === selectedTeam.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full z-20">
                                    <RefreshCw className="animate-spin text-hoops-yellow w-10 h-10"/>
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <div className="inline-block px-3 py-1 rounded bg-hoops-primary/20 text-hoops-primary text-xs font-bold uppercase tracking-widest mb-3 border border-hoops-primary/30">
                                {selectedTeam.city}
                            </div>
                            <h2 className="text-4xl md:text-6xl font-display font-bold italic uppercase leading-none mb-4">{selectedTeam.name}</h2>
                            <div className="flex items-center justify-center md:justify-start gap-6 font-mono text-sm text-gray-400">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-white">{selectedTeam.wins}</span>
                                    <span>Victoires</span>
                                </div>
                                <div className="w-px h-8 bg-white/10"></div>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-white">{selectedTeam.losses}</span>
                                    <span>Défaites</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Roster */}
                    <div className="p-6 md:p-8 bg-black/20">
                        <h3 className="text-xl font-bold uppercase italic mb-6 flex items-center gap-3">
                            Effectif 
                            <span className="text-sm not-italic font-normal text-gray-500 font-sans">({selectedTeam.roster.length} Joueurs)</span>
                            {isEditMode && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded ml-auto">Cliquez sur une photo pour modifier</span>}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {selectedTeam.roster.map(player => (
                                <div key={player.id} className="bg-hoops-bg border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-white/20 transition-all group relative overflow-hidden">
                                    
                                    <div 
                                        className={`relative w-16 h-16 rounded-full bg-black border border-white/10 flex-shrink-0 ${isEditMode ? 'cursor-pointer hover:ring-2 ring-green-500' : ''}`}
                                        onClick={() => isEditMode && handleUploadClick('player', player.id)}
                                    >
                                        <img src={player.imageUrl} className={`w-full h-full object-cover rounded-full transition-opacity ${uploadingId === player.id ? 'opacity-50' : ''}`} />
                                        
                                        {isEditMode && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-full transition-all">
                                                <Camera size={20} className="text-white"/>
                                            </div>
                                        )}
                                        {uploadingId === player.id && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full z-20">
                                                <RefreshCw className="animate-spin text-hoops-yellow w-6 h-6"/>
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-hoops-primary uppercase mb-0.5">{player.position}</div>
                                        <div className="font-bold text-white text-lg leading-tight truncate">{player.name}</div>
                                        <div className="font-mono text-gray-500 text-xs mt-0.5">#{player.number}</div>
                                    </div>
                                    
                                    {/* Stats Mini */}
                                    <div className="absolute right-0 top-0 bottom-0 w-16 bg-black/30 border-l border-white/5 flex flex-col items-center justify-center">
                                        <span className="text-[10px] text-gray-500 font-bold">PPG</span>
                                        <span className="text-sm font-bold text-white font-mono">{player.stats.ppg}</span>
                                    </div>

                                </div>
                            ))}
                        </div>
                        
                        {selectedTeam.roster.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl text-gray-500">
                                Aucun joueur dans l'effectif pour le moment.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default StatsCMS;