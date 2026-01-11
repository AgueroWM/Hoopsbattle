import React, { useState, useEffect } from 'react';
import { TEAMS, LIVE_MATCH } from '../constants';
import { Match, Player } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { ArrowRight, Settings, Upload } from 'lucide-react';

// Fonction de hachage JS simple (fonctionne en HTTP/LocalIP contrairement à crypto.subtle)
const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
};

// Hash pour le code "2026" calculé avec l'algorithme ci-dessus
const PIN_HASH = "1537282";

const AdminDashboard: React.FC = () => {
  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  // --- DASHBOARD STATE ---
  const [activeTab, setActiveTab] = useState('matches'); // Default to matches list
  const [matchData, setMatchData] = useState<Match>(LIVE_MATCH);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New State for Match List
  const [dbMatches, setDbMatches] = useState<any[]>([]);

  // --- MEDIA UPLOAD STATE ---
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Check auth on mount
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('hoops_admin_auth');
    if (sessionAuth === 'true') setIsAuthenticated(true);
  }, []);

  // Fetch Live Match & All Players on auth
  useEffect(() => {
    if (isAuthenticated) {
        // 1. Get Live Match (Legacy Prop)
        const fetchLive = async () => {
            const match = await api.matches.getLive();
            setMatchData(match);
        };
        fetchLive();

        // 2. Get All Players for Dropdowns
        const fetchPlayers = async () => {
            const teams = await api.teams.getAll();
            const players = teams.flatMap(t => t.roster);
            setAllPlayers(players);
        };
        fetchPlayers();

        // 3. Get All Matches (DB) for Management List
        const fetchDbMatches = async () => {
             const { data } = await supabase
                .from('matches')
                .select('*, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)')
                .order('start_time', { ascending: true });
             if (data) setDbMatches(data);
        };
        fetchDbMatches();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Trim input to avoid whitespace errors
    const cleanPin = pinInput.trim();
    
    // FIXME: Yes, I know client-side hash is not secure. 
    // It's just to stop random people from clicking buttons during the event.
    // Will move to Supabase Auth next week.
    if (simpleHash(cleanPin) === PIN_HASH) {
        setIsAuthenticated(true);
        sessionStorage.setItem('hoops_admin_auth', 'true');
    } else {
        alert('Code incorrect');
        setPinInput('');
    }
  };

  // --- CORE LOGIC: EVENTS & SCORE ---
  
  const addGameEvent = async (type: 'score' | 'foul' | 'timeout', points: number = 0, teamId: string, playerId?: string) => {
      setIsSyncing(true);
      
      try {
        if (isSupabaseConfigured()) {
            // 1. Insert Event Log
            await supabase.from('game_events').insert({
                match_id: parseInt(matchData.id),
                team_id: parseInt(teamId),
                player_id: playerId ? parseInt(playerId) : null,
                type: type,
                points: points,
                description: `${type.toUpperCase()} - ${points}pts`
            });

            // 2. Update Match Score (Optimistic UI update first)
            const isTeamA = teamId === matchData.teamA.id;
            const newScoreA = isTeamA ? matchData.scoreA + points : matchData.scoreA;
            const newScoreB = !isTeamA ? matchData.scoreB + points : matchData.scoreB;

            setMatchData(prev => ({ ...prev, scoreA: newScoreA, scoreB: newScoreB }));

            // DB Update
            await supabase.from('matches').update({
                score_team_a: newScoreA,
                score_team_b: newScoreB
            }).eq('id', matchData.id);
        } else {
            // Mock Mode
            const isTeamA = teamId === matchData.teamA.id;
            setMatchData(prev => ({
                ...prev,
                scoreA: isTeamA ? prev.scoreA + points : prev.scoreA,
                scoreB: !isTeamA ? prev.scoreB + points : prev.scoreB
            }));
        }
      } catch (err) {
          console.error(err);
          setErrorMsg("Erreur lors de l'ajout de l'événement");
      } finally {
          setIsSyncing(false);
      }
  };

  // --- VIDEO UPLOAD LOGIC ---

  const handleFileUpload = async () => {
    if (!file || !uploadTitle || !selectedPlayerId) {
        alert("Veuillez remplir tous les champs et sélectionner une vidéo.");
        return;
    }

    setUploading(true);
    try {
        if (!isSupabaseConfigured()) throw new Error("Supabase non connecté");

        // 1. Upload to Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `highlights/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('hoops-media') 
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage.from('hoops-media').getPublicUrl(filePath);

        // 3. Create Record in DB
        const { error: dbError } = await supabase.from('highlights').insert({
            title: uploadTitle,
            media_url: publicUrl,
            media_type: file.type.startsWith('video') ? 'video' : 'image',
            player_id: parseInt(selectedPlayerId),
            status: 'approved' // Admin uploads are auto-approved
        });

        if (dbError) throw dbError;

        alert("Vidéo publiée avec succès !");
        setUploadTitle('');
        setFile(null);
        setSelectedPlayerId('');

    } catch (error: any) {
        console.error('Upload Error:', error);
        alert(`Erreur upload: ${error.message || 'Problème technique'}`);
    } finally {
        setUploading(false);
    }
  };

  // --- RENDER LOGIN SCREEN ---
  if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-md text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-hoops-yellow">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold uppercase mb-2">Accès Staff</h1>
                <p className="text-gray-400 mb-6 text-sm">Veuillez vous identifier</p>
                <form onSubmit={handleLogin}>
                    <input 
                        type="password" 
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="Code PIN"
                        className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-center text-xl tracking-widest text-white focus:border-hoops-yellow focus:outline-none mb-4"
                        autoFocus
                    />
                    <button type="submit" className="w-full bg-hoops-primary text-white font-bold uppercase py-3 rounded-xl hover:bg-blue-600 transition-colors">
                        Entrer
                    </button>
                </form>
            </div>
        </div>
      );
  }

  // --- RENDER DASHBOARD ---
  return (
    <div className="pt-24 px-4 pb-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <h1 className="text-3xl font-display font-bold uppercase italic text-white flex items-center gap-3">
                <span className="w-3 h-8 bg-hoops-yellow rounded-sm"></span>
                Mission Control
            </h1>
            <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-full border border-white/10">
                {errorMsg && <span className="text-red-500 font-bold animate-pulse text-xs">{errorMsg}</span>}
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : (isSupabaseConfigured() ? 'bg-green-500' : 'bg-gray-500')}`}></div>
                    <span className="text-xs font-mono text-gray-400">
                        {isSupabaseConfigured() ? 'DB LIVE' : 'MOCK'}
                    </span>
                </div>
            </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-1 overflow-x-auto no-scrollbar">
            {['matches', 'media', 'scorer'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 rounded-t-lg font-bold uppercase text-sm tracking-wider transition-colors whitespace-nowrap ${
                        activeTab === tab 
                        ? 'bg-hoops-primary text-white' 
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                >
                    {tab === 'matches' && 'Gestion Matchs'}
                    {tab === 'media' && 'Highlights & Video'}
                    {tab === 'scorer' && 'Live Scoring (Actuel)'}
                </button>
            ))}
        </div>

        {/* --- MATCHES MANAGEMENT TAB --- */}
        {activeTab === 'matches' && (
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Liste des Matchs</h3>
                    <Link to="/admin/moderation" className="bg-white/10 px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/20">Modération Contenu</Link>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                    {dbMatches.map((match: any) => (
                        <div key={match.id} className="bg-hoops-card p-4 rounded-xl border border-white/10 flex justify-between items-center hover:border-hoops-primary transition-all">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                                <span className="text-xs font-mono text-gray-500">{new Date(match.start_time).toLocaleString()}</span>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold">{match.team_a?.name || 'TBD'}</span>
                                    <span className="font-mono bg-black/30 px-2 rounded text-hoops-yellow">{match.score_team_a} - {match.score_team_b}</span>
                                    <span className="font-bold">{match.team_b?.name || 'TBD'}</span>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded w-fit ${match.status === 'live' ? 'bg-red-600 animate-pulse' : 'bg-gray-700'}`}>
                                    {match.status}
                                </span>
                            </div>
                            
                            <Link 
                                to={`/admin/match/${match.id}`} 
                                className="bg-hoops-primary text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-600"
                            >
                                <Settings size={16} /> <span className="hidden md:inline">Ouvrir Console</span>
                            </Link>
                        </div>
                    ))}
                    {dbMatches.length === 0 && <div className="text-gray-500 italic">Chargement des matchs...</div>}
                </div>
            </div>
        )}

        {/* --- SCORER TAB (LEGACY VIEW FOR CURRENT LIVE) --- */}
        {activeTab === 'scorer' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Team A Control */}
                <div className="glass-panel p-6 rounded-2xl border-t-4 border-hoops-primary">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black italic">{matchData.teamA.name}</h2>
                        <span className="text-5xl font-mono font-bold text-white">{matchData.scoreA}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <button onClick={() => addGameEvent('score', 1, matchData.teamA.id)} className="bg-white/5 hover:bg-hoops-primary/50 py-4 rounded-xl font-bold text-xl border border-white/10 transition-all active:scale-95">+1</button>
                        <button onClick={() => addGameEvent('score', 2, matchData.teamA.id)} className="bg-white/5 hover:bg-hoops-primary/50 py-4 rounded-xl font-bold text-xl border border-white/10 transition-all active:scale-95">+2</button>
                        <button onClick={() => addGameEvent('score', 3, matchData.teamA.id)} className="bg-hoops-primary hover:bg-blue-600 py-4 rounded-xl font-bold text-xl text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all active:scale-95">+3</button>
                    </div>
                </div>

                {/* Team B Control */}
                <div className="glass-panel p-6 rounded-2xl border-t-4 border-hoops-yellow">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black italic">{matchData.teamB.name}</h2>
                        <span className="text-5xl font-mono font-bold text-white">{matchData.scoreB}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <button onClick={() => addGameEvent('score', 1, matchData.teamB.id)} className="bg-white/5 hover:bg-hoops-yellow/50 py-4 rounded-xl font-bold text-xl border border-white/10 transition-all active:scale-95">+1</button>
                        <button onClick={() => addGameEvent('score', 2, matchData.teamB.id)} className="bg-white/5 hover:bg-hoops-yellow/50 py-4 rounded-xl font-bold text-xl border border-white/10 transition-all active:scale-95">+2</button>
                        <button onClick={() => addGameEvent('score', 3, matchData.teamB.id)} className="bg-hoops-yellow hover:bg-yellow-400 py-4 rounded-xl font-bold text-xl text-hoops-bg shadow-[0_0_15px_rgba(244,255,95,0.4)] transition-all active:scale-95">+3</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- MEDIA TAB (UPLOAD HIGHLIGHTS) --- */}
        {activeTab === 'media' && (
             <div className="glass-panel p-6 rounded-2xl max-w-2xl mx-auto">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Upload className="w-6 h-6 text-hoops-yellow" />
                    Ajouter un Highlight
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Titre de la vidéo</label>
                        <input 
                            type="text" 
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            placeholder="Ex: Dunk incroyable de Moussa" 
                            className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-hoops-yellow focus:outline-none" 
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Joueur concerné</label>
                        <select 
                            value={selectedPlayerId}
                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                            className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-hoops-yellow focus:outline-none appearance-none"
                        >
                            <option value="">Sélectionner un joueur...</option>
                            {allPlayers.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* File Upload UI */}
                    <div 
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer bg-white/5 relative ${file ? 'border-green-500 bg-green-500/10' : 'border-white/20 hover:border-hoops-primary/50'}`}
                    >
                        <input 
                            type="file" 
                            accept="video/*" 
                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-2 pointer-events-none">
                            {file ? (
                                <>
                                    <span className="font-bold text-white">{file.name}</span>
                                    <span className="text-xs text-gray-400">Prêt à uploader</span>
                                </>
                            ) : (
                                <>
                                    <span className="font-bold text-white">Cliquez pour upload une vidéo</span>
                                    <span className="text-xs text-gray-400">MP4, MOV (Max 50Mo)</span>
                                </>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={handleFileUpload}
                        disabled={uploading}
                        className="w-full bg-hoops-primary text-white font-bold uppercase py-4 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {uploading ? 'Upload en cours...' : 'Publier sur le Feed'}
                    </button>
                </div>
             </div>
        )}
    </div>
  );
};

export default AdminDashboard;