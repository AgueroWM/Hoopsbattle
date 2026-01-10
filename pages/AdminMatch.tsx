import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Camera, RefreshCcw, Youtube, FileEdit, Save, Video, Trash2, Upload } from 'lucide-react';

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

export default function AdminMatch() {
  // --- AUTH SECURITY ---
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState('')

  const { id } = useParams();
  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchMedias, setMatchMedias] = useState<any[]>([]); // New: List of media for this match
  
  // Correction Mode State
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);
  // Match Type State (Local UI preference for label display)
  const [isFinalFormat, setIsFinalFormat] = useState(false); 
  // Youtube ID State
  const [youtubeId, setYoutubeId] = useState('');

  // CMS STATE
  const [showReviewEditor, setShowReviewEditor] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [interviewUrl, setInterviewUrl] = useState('');
  const [uploadingInterview, setUploadingInterview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const interviewInputRef = useRef<HTMLInputElement>(null);

  // Fonction de fetch centralisée et mémorisée
  const fetchMatchData = useCallback(async (matchId: string) => {
    // 1. Fetch Match
    const { data: matchData, error } = await supabase
      .from('matches')
      .select(`*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*)`)
      .eq('id', matchId)
      .single();
    
    if (error) {
        console.error("Error fetching match:", error);
        return;
    }
    // Force number types on load
    if (matchData) {
        matchData.quarter = Number(matchData.quarter);
        matchData.score_team_a = Number(matchData.score_team_a);
        matchData.score_team_b = Number(matchData.score_team_b);
        setYoutubeId(matchData.youtube_id || '');
        setReviewText(matchData.review_text || '');
        setInterviewUrl(matchData.interview_video_url || '');
    }
    setMatch(matchData);

    // 2. Fetch Players
    if (matchData) {
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .in('team_id', [matchData.team_a_id, matchData.team_b_id])
        .order('number', { ascending: true });
      
      const safePlayers = (playersData || []).map((p: any) => ({
          ...p,
          is_on_court: p.is_on_court === true // Force boolean
      }));

      setPlayers(safePlayers);
    }

    // 3. Fetch Medias (Highlights linked to this match)
    const { data: mediaData } = await supabase
        .from('highlights')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });
    
    setMatchMedias(mediaData || []);

  }, []);

  useEffect(() => {
    if (!id) return;
    
    // Check session storage first
    const sessionAuth = sessionStorage.getItem('hoops_admin_auth');
    if (sessionAuth === 'true') setIsAuthenticated(true);

    if (isAuthenticated || sessionAuth === 'true') {
        // Chargement initial
        fetchMatchData(id);

        // ABONNEMENT UNIVERSEL (Admin)
        const subscription = supabase.channel('admin-universal-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, () => {
            console.log('⚡ Match updated (DB Event)');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
            console.log('⚡ Player roster/court status updated (DB Event)');
            fetchMatchData(id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'highlights', filter: `match_id=eq.${id}` }, () => {
             // Refresh media list on change
             fetchMatchData(id);
        })
        .subscribe();

        return () => { 
            supabase.removeChannel(subscription);
        }
    }
  }, [id, fetchMatchData, isAuthenticated]);

  const checkPin = (e?: React.FormEvent) => {
      if(e) e.preventDefault();
      const cleanPin = pin.trim();
      if (simpleHash(cleanPin) === PIN_HASH) {
          setIsAuthenticated(true);
          sessionStorage.setItem('hoops_admin_auth', 'true');
      } else {
          alert("Code Incorrect");
          setPin('');
      }
  };

  // --- AUTH GUARD ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-900 p-8 rounded-xl border border-hoops-primary text-center max-w-sm w-full shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-widest font-display">Accès Staff</h2>
          <form onSubmit={checkPin}>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Code PIN"
                className="w-full bg-gray-800 text-white p-4 rounded-lg text-center text-xl tracking-widest mb-4 border border-gray-700 focus:border-hoops-primary outline-none"
                autoFocus
              />
              <button 
                type="submit"
                className="w-full bg-hoops-primary text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors uppercase"
              >
                Entrer
              </button>
          </form>
        </div>
      </div>
    )
  }

  const getPeriodLabel = (q: number) => {
      const safeQ = Number(q) || 1;
      if (isFinalFormat) {
          if (safeQ <= 4) return `Q${safeQ}`;
          return `OT ${safeQ - 4}`;
      } else {
          if (safeQ === 1) return "MT 1";
          if (safeQ === 2) return "MT 2";
          return `Prolong. ${safeQ - 2}`;
      }
  };

  // --- LOGIQUE SUBSTITUTIONS & ACTIONS (inchangée) ---
  async function toggleOnCourt(player: any) {
      const newValue = !player.is_on_court;
      setPlayers(prev => prev.map(p => String(p.id) === String(player.id) ? { ...p, is_on_court: newValue } : p));
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('players').update({ is_on_court: newValue }).eq('id', player.id);
          if (error) { console.error(error); if(id) fetchMatchData(id); }
      }
  }

  async function handleAction(playerId: number, teamId: number, type: string, points: number) {
    setLoading(true);
    const modifier = isCorrectionMode ? -1 : 1;
    const pointsToAdd = points * modifier;

    try {
      if (!isSupabaseConfigured()) { setTimeout(() => setLoading(false), 200); return; }
      
      const { data: existingStats } = await supabase.from('player_stats').select('*').eq('match_id', match.id).eq('player_id', playerId).maybeSingle();

      const currentStats = existingStats || { match_id: parseInt(match.id), player_id: playerId, team_id: teamId, points: 0, rebounds_total: 0, assists: 0, fouls: 0, blocks: 0 };
      const updates: any = { ...currentStats, points: Number(currentStats.points||0), rebounds_total: Number(currentStats.rebounds_total||0), assists: Number(currentStats.assists||0), fouls: Number(currentStats.fouls||0), blocks: Number(currentStats.blocks||0) };
      
      if (type === '1pt' || type === '2pt' || type === '3pt') updates.points = Math.max(0, updates.points + pointsToAdd);
      else if (type === 'rebound') updates.rebounds_total = Math.max(0, updates.rebounds_total + modifier);
      else if (type === 'assist') updates.assists = Math.max(0, updates.assists + modifier);
      else if (type === 'foul') updates.fouls = Math.max(0, updates.fouls + modifier);

      const { error: upsertError } = await supabase.from('player_stats').upsert(updates);
      if (upsertError) throw upsertError;

      const isTeamA = teamId === match.team_a_id;
      let updatePayload: any = {};
      if (points !== 0) {
          const newScore = Math.max(0, (isTeamA ? Number(match.score_team_a) : Number(match.score_team_b)) + pointsToAdd);
          updatePayload[isTeamA ? 'score_team_a' : 'score_team_b'] = newScore;
      }
      if (type === 'foul') {
          const newFouls = Math.max(0, (isTeamA ? Number(match.team_a_fouls || 0) : Number(match.team_b_fouls || 0)) + modifier);
          updatePayload[isTeamA ? 'team_a_fouls' : 'team_b_fouls'] = newFouls;
      }
      if (Object.keys(updatePayload).length > 0) {
          const { error: matchError } = await supabase.from('matches').update(updatePayload).eq('id', match.id);
          if (matchError) throw matchError;
          setMatch((prev: any) => ({ ...prev, ...updatePayload }));
      }
      if (navigator.vibrate) navigator.vibrate(isCorrectionMode ? [50, 50, 50] : 50);

    } catch (error: any) { alert(`Erreur: ${error.message}`); } finally { setLoading(false); }
  }

  const updateMatchStatus = async (key: string, value: any) => {
      const payload = { [key]: value };
      const { error } = await supabase.from('matches').update(payload).eq('id', match.id);
      if (!error) setMatch((prev: any) => ({ ...prev, ...payload }));
  };

  const incrementValue = async (field: string, amount: number) => {
      const current = Number(match[field]) || 0;
      let newVal = Math.max(field === 'quarter' ? 1 : 0, current + amount);
      updateMatchStatus(field, newVal);
  };
  
  // --- INTELLIGENT LINK PARSER (TWITCH + YOUTUBE) ---
  const saveYoutube = async () => {
      let input = youtubeId.trim();
      let idToSave = input;

      // 1. DÉTECTION TWITCH
      if (input.includes('twitch.tv/')) {
        // Ex: https://www.twitch.tv/sardoche -> on garde "sardoche"
        try {
            const parts = input.split('twitch.tv/');
            // On prend ce qu'il y a après, et on vire les éventuels paramètres (?sr=a, etc) et slash de fin
            const channelName = parts[1].split('?')[0].split('/')[0]; 
            idToSave = `twitch:${channelName}`; // On ajoute le préfixe magique
        } catch (e) {
            console.error("Erreur parsing Twitch", e);
        }
      } 
      
      // 2. DÉTECTION YOUTUBE (Classique)
      else if (input.includes('v=')) {
        try {
            idToSave = input.split('v=')[1].split('&')[0];
        } catch (e) {
            console.error("Erreur parsing Youtube v=", e);
        }
      } 
      else if (input.includes('youtu.be/')) {
        try {
            idToSave = input.split('youtu.be/')[1].split('?')[0];
        } catch (e) {
            console.error("Erreur parsing Youtube short", e);
        }
      }

      // 3. SAUVEGARDE EN BASE
      const { error } = await supabase
        .from('matches')
        .update({ youtube_id: idToSave })
        .eq('id', match.id);

      if (error) {
          alert("Erreur : " + error.message);
      } else {
          alert(`✅ Live connecté ! (ID: ${idToSave})`);
          setYoutubeId('');
          if(id) fetchMatchData(id);
      }
  };

  const saveReview = async () => {
      const { error } = await supabase.from('matches').update({ review_text: reviewText, interview_video_url: interviewUrl }).eq('id', match.id);
      if(!error) { alert("Contenu Review sauvegardé !"); setShowReviewEditor(false); }
      else alert("Erreur: " + error.message);
  };

  // --- PHOTO UPLOAD ---
  async function handleFileUpload(event: any, matchId: number) {
    try {
      const file = event.target.files[0];
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const fileName = `${matchId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('hoops-media').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('hoops-media').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('highlights').insert({ match_id: matchId, media_url: publicUrl, media_type: file.type.startsWith('video') ? 'video' : 'image', title: `Action match #${matchId}`, status: 'approved' });
      if (dbError) throw dbError;
      alert("✅ Photo envoyée !");
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) { alert("Erreur: " + error.message); }
  }

  // --- INTERVIEW VIDEO UPLOAD ---
  async function handleInterviewUpload(event: any) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        setUploadingInterview(true);

        const fileExt = file.name.split('.').pop();
        const fileName = `interviews/match_${match.id}_${Date.now()}.${fileExt}`;

        // Upload
        const { error: uploadError } = await supabase.storage.from('hoops-media').upload(fileName, file);
        if (uploadError) throw uploadError;

        // Get URL
        const { data: { publicUrl } } = supabase.storage.from('hoops-media').getPublicUrl(fileName);

        // Update DB
        const { error: dbError } = await supabase.from('matches').update({ interview_video_url: publicUrl }).eq('id', match.id);
        if (dbError) throw dbError;

        setInterviewUrl(publicUrl);
        alert("✅ Interview vidéo uploadée avec succès !");

    } catch (error: any) {
        alert("Erreur upload interview: " + error.message);
    } finally {
        setUploadingInterview(false);
        if(interviewInputRef.current) interviewInputRef.current.value = '';
    }
  }

  // --- DELETE MEDIA FUNCTION ---
  async function deleteMedia(mediaId: number) {
      if (!confirm("Supprimer ce média définitivement ?")) return;

      const { error } = await supabase
        .from('highlights')
        .delete()
        .eq('id', mediaId)

      if (error) {
          alert("Erreur suppression : " + error.message)
      } else {
          alert("Vidéo supprimée !");
          if(id) fetchMatchData(id); // Refresh to be sure
      }
  }

  const triggerUpload = () => { fileInputRef.current?.click(); }

  if (!match) return <div className="min-h-screen bg-hoops-bg flex items-center justify-center text-white">Chargement...</div>;

  return (
    <div className={`min-h-screen text-white p-2 pb-24 md:pb-4 pt-20 max-w-7xl mx-auto font-sans transition-colors duration-500 ${isCorrectionMode ? 'bg-red-950/30' : 'bg-hoops-bg'}`}>
      
      {/* Correction Banner */}
      {isCorrectionMode && (
          <div className="fixed top-16 left-0 right-0 bg-red-600 text-white text-center py-1 font-bold z-50 animate-pulse shadow-lg">
              ⚠️ MODE CORRECTION ACTIF ⚠️
          </div>
      )}

      {/* TOP BAR */}
      <div className="flex flex-col gap-4 mb-4 px-2">
          <div className="flex justify-between items-center">
            <Link to="/admin" className="text-gray-400 hover:text-white flex items-center gap-1">
                <ArrowLeft size={16} /> Dashboard
            </Link>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setShowReviewEditor(!showReviewEditor)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase bg-hoops-primary text-white"
                >
                    <FileEdit size={12}/> Review CMS
                </button>
                <button 
                    onClick={() => setIsCorrectionMode(!isCorrectionMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${isCorrectionMode ? 'bg-red-500 text-white animate-bounce' : 'bg-gray-800 text-gray-400 border border-gray-600'}`}
                >
                    <RefreshCcw size={12} className={isCorrectionMode ? 'rotate-180' : ''} />
                    {isCorrectionMode ? 'Correction' : 'Correction'}
                </button>
            </div>
          </div>

          {/* CMS EDITOR (REVIEW) */}
          {showReviewEditor && (
              <div className="bg-gray-900 border border-white/10 rounded-xl p-4 animate-fade-in">
                  <h3 className="font-bold text-hoops-yellow mb-3 flex items-center gap-2"><FileEdit size={18}/> Éditeur Contenu Après-Match</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Texte de l'article (Review)</label>
                          <textarea 
                              value={reviewText}
                              onChange={(e) => setReviewText(e.target.value)}
                              rows={5}
                              className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white focus:border-hoops-primary outline-none"
                              placeholder="Écrivez le résumé du match ici..."
                          />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block flex items-center gap-1"><Video size={10}/> Interview Vidéo</label>
                          
                          {/* Input Texte URL */}
                          <input 
                              type="text" 
                              value={interviewUrl}
                              onChange={(e) => setInterviewUrl(e.target.value)}
                              className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white focus:border-hoops-primary outline-none mb-2"
                              placeholder="Lien Youtube OU Fichier Uploadé"
                          />
                          
                          {/* Input Upload Fichier */}
                          <div className="flex items-center gap-2 mb-2">
                             <input 
                                type="file" 
                                ref={interviewInputRef}
                                onChange={handleInterviewUpload}
                                className="hidden"
                                accept="video/mp4,video/quicktime"
                             />
                             <button 
                                onClick={() => interviewInputRef.current?.click()}
                                disabled={uploadingInterview}
                                className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 w-full justify-center border border-dashed border-gray-600"
                             >
                                 <Upload size={14} /> 
                                 {uploadingInterview ? 'Upload en cours...' : 'Uploader fichier vidéo (MP4)'}
                             </button>
                          </div>
                          
                          <p className="text-[10px] text-gray-500">Vous pouvez soit coller un lien Youtube, soit uploader directement une vidéo filmée.</p>
                      </div>
                  </div>
                  <div className="flex justify-end">
                      <button onClick={saveReview} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2">
                          <Save size={16}/> Sauvegarder le contenu
                      </button>
                  </div>
              </div>
          )}

          {/* YOUTUBE/TWITCH LINKER */}
          <div className="bg-gray-900 border border-white/10 rounded-xl p-3 flex gap-2 items-center">
              <Youtube className="text-red-500" size={20} />
              <input 
                 type="text" 
                 placeholder="Lien Youtube OU Twitch (ex: https://twitch.tv/gotaga)" 
                 value={youtubeId}
                 onChange={(e) => setYoutubeId(e.target.value)}
                 className="bg-black border border-white/20 rounded px-2 py-1 text-sm text-white flex-1"
              />
              <button onClick={saveYoutube} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-xs font-bold uppercase">Lier LIVE</button>
          </div>

          {/* GAME CONTROL PANEL (Status, Score...) */}
          <div className="bg-gray-900 border border-white/10 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-4">
             {/* ... (Status, Quarter, Teams Stats controls - same as before) ... */}
              {/* 1. Status */}
               <div className="flex flex-col gap-1">
                   <label className="text-[10px] uppercase text-gray-500 font-bold">Statut Match</label>
                   <select 
                        value={match.status} 
                        onChange={(e) => updateMatchStatus('status', e.target.value)}
                        className="bg-black border border-white/20 rounded px-2 py-1 text-sm font-bold uppercase focus:outline-none focus:border-hoops-primary"
                   >
                       <option value="scheduled">Programmé</option>
                       <option value="live">🔴 EN DIRECT</option>
                       <option value="finished">Terminé</option>
                   </select>
               </div>

               {/* 2. Quarter / Période Control */}
               <div className="flex flex-col gap-1">
                   <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Période / OT</label>
                        <button 
                            onClick={() => setIsFinalFormat(!isFinalFormat)}
                            className="text-[9px] uppercase font-bold text-hoops-yellow underline"
                        >
                            {isFinalFormat ? 'Mode Finale' : 'Mode Qualif'}
                        </button>
                   </div>
                   <div className="flex items-center gap-2">
                       <button onClick={() => incrementValue('quarter', -1)} className="bg-white/10 w-8 h-8 rounded hover:bg-white/20 font-bold">-</button>
                       <span className="font-mono text-xl font-bold w-full text-center bg-black/40 rounded border border-white/5 py-0.5">
                           {getPeriodLabel(match.quarter)}
                       </span>
                       <button onClick={() => incrementValue('quarter', 1)} className="bg-white/10 w-8 h-8 rounded hover:bg-white/20 font-bold">+</button>
                   </div>
               </div>

               {/* 3. Team A Stats */}
               <div className="flex flex-col gap-1 border-l border-white/10 pl-4">
                   <span className="text-[10px] uppercase text-hoops-primary font-bold truncate">{match.team_a?.name}</span>
                   <div className="flex justify-between text-xs">
                       <div className="flex flex-col items-center">
                           <span className="text-gray-500">Fautes</span>
                           <div className="flex gap-1">
                                <button onClick={() => incrementValue('team_a_fouls', -1)} className="px-1 bg-white/5 rounded">-</button>
                                <span className="font-mono font-bold text-white w-4 text-center">{match.team_a_fouls || 0}</span>
                                <button onClick={() => incrementValue('team_a_fouls', 1)} className="px-1 bg-white/5 rounded">+</button>
                           </div>
                       </div>
                       <div className="flex flex-col items-center">
                           <span className="text-gray-500">T.Morts</span>
                           <div className="flex gap-1">
                                <button onClick={() => incrementValue('team_a_timeouts', -1)} className="px-1 bg-white/5 rounded">-</button>
                                <span className="font-mono font-bold text-white w-4 text-center">{match.team_a_timeouts || 0}</span>
                                <button onClick={() => incrementValue('team_a_timeouts', 1)} className="px-1 bg-white/5 rounded">+</button>
                           </div>
                       </div>
                   </div>
               </div>

               {/* 4. Team B Stats */}
               <div className="flex flex-col gap-1 border-l border-white/10 pl-4">
                   <span className="text-[10px] uppercase text-hoops-yellow font-bold truncate">{match.team_b?.name}</span>
                   <div className="flex justify-between text-xs">
                       <div className="flex flex-col items-center">
                           <span className="text-gray-500">Fautes</span>
                           <div className="flex gap-1">
                                <button onClick={() => incrementValue('team_b_fouls', -1)} className="px-1 bg-white/5 rounded">-</button>
                                <span className="font-mono font-bold text-white w-4 text-center">{match.team_b_fouls || 0}</span>
                                <button onClick={() => incrementValue('team_b_fouls', 1)} className="px-1 bg-white/5 rounded">+</button>
                           </div>
                       </div>
                       <div className="flex flex-col items-center">
                           <span className="text-gray-500">T.Morts</span>
                           <div className="flex gap-1">
                                <button onClick={() => incrementValue('team_b_timeouts', -1)} className="px-1 bg-white/5 rounded">-</button>
                                <span className="font-mono font-bold text-white w-4 text-center">{match.team_b_timeouts || 0}</span>
                                <button onClick={() => incrementValue('team_b_timeouts', 1)} className="px-1 bg-white/5 rounded">+</button>
                           </div>
                       </div>
                   </div>
               </div>
          </div>

          {/* SECTION MEDIAS DU MATCH (Liste + Suppression) */}
          {matchMedias.length > 0 && (
             <div className="bg-gray-900 border border-white/10 rounded-xl p-4 mt-4">
                 <h3 className="font-bold text-white text-sm uppercase mb-3 flex items-center gap-2">
                     <Camera size={16} /> Médias du Match ({matchMedias.length})
                 </h3>
                 <div className="flex gap-4 overflow-x-auto pb-2">
                     {matchMedias.map(media => (
                         <div key={media.id} className="relative w-32 h-20 bg-black rounded overflow-hidden flex-shrink-0 border border-white/10 group">
                             {media.media_type === 'video' ? (
                                 <video src={media.media_url} className="w-full h-full object-cover" />
                             ) : (
                                 <img src={media.media_url} className="w-full h-full object-cover" />
                             )}
                             <button 
                                onClick={() => deleteMedia(media.id)}
                                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                             >
                                 <Trash2 size={12}/>
                             </button>
                         </div>
                     ))}
                 </div>
             </div>
          )}
      </div>

      {/* Header Score Rapide */}
      <header className="mb-4 bg-hoops-card border border-white/10 p-4 rounded-xl flex justify-between items-center sticky top-20 z-30 shadow-xl backdrop-blur-md">
         <div className="font-display font-bold text-xl flex flex-col md:flex-row items-center gap-2">
             <span className="text-gray-300">{match.team_a?.short_name}</span> 
             <span className="text-hoops-primary font-mono text-3xl">{match.score_team_a}</span>
         </div>
         <div className="flex flex-col items-center">
             <div className="text-[10px] font-bold uppercase text-gray-500 bg-white/5 px-2 py-0.5 rounded mb-1">
                 {getPeriodLabel(match.quarter)}
             </div>
             <button onClick={triggerUpload} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors border border-white/10" title="Ajouter Photo">
                 <Camera size={20} className="text-hoops-yellow" />
             </button>
             <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept="image/*,video/*"
                 onChange={(e) => handleFileUpload(e, parseInt(match.id))} 
             />
         </div>
         <div className="font-display font-bold text-xl flex flex-col md:flex-row items-center gap-2">
             <span className="text-hoops-yellow font-mono text-3xl">{match.score_team_b}</span>
             <span className="text-gray-300">{match.team_b?.short_name}</span>
         </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Colonne A */}
        <TeamColumn 
            team={match.team_a} 
            players={players.filter(p => p.team_id === match.team_a_id)} 
            onAction={handleAction}
            onToggle={toggleOnCourt}
            loading={loading}
            color="blue"
            isCorrection={isCorrectionMode}
        />
        {/* Colonne B */}
        <TeamColumn 
            team={match.team_b} 
            players={players.filter(p => p.team_id === match.team_b_id)} 
            onAction={handleAction}
            onToggle={toggleOnCourt}
            loading={loading}
            color="yellow"
            isCorrection={isCorrectionMode}
        />
      </div>
    </div>
  );
}

function TeamColumn({ team, players, onAction, onToggle, loading, color, isCorrection }: any) {
  const borderColor = color === 'blue' ? 'border-hoops-primary' : 'border-hoops-yellow';
  const headerColor = color === 'blue' ? 'text-hoops-primary' : 'text-hoops-yellow';
  const badgeColor = color === 'blue' ? 'bg-hoops-primary' : 'bg-hoops-yellow text-black';

  // Tri : Joueurs sur le terrain d'abord
  const sortedPlayers = [...players].sort((a, b) => {
      if (a.is_on_court === b.is_on_court) return a.number - b.number;
      return a.is_on_court ? -1 : 1;
  });

  return (
    <div className={`bg-black/40 rounded-xl border-t-4 ${borderColor} p-3 transition-colors ${isCorrection ? 'bg-red-900/10' : ''}`}>
      <h2 className={`text-2xl font-black mb-4 px-2 uppercase italic ${headerColor} flex justify-between items-center`}>
          {team?.name}
          <span className="text-xs font-sans font-normal text-gray-500 not-italic uppercase tracking-widest">Bench / Court</span>
      </h2>
      
      <div className="space-y-3">
        {sortedPlayers.map((player: any) => (
          <div key={player.id} className={`p-3 rounded-lg border transition-all ${player.is_on_court ? 'bg-gray-800 border-white/20 shadow-lg relative overflow-hidden' : 'bg-gray-900/30 border-transparent opacity-60 grayscale'}`}>
            {player.is_on_court && <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${badgeColor}`}></div>}
            <div className="flex justify-between items-center mb-3 pl-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center font-bold font-mono ${player.is_on_court ? badgeColor : 'bg-gray-700 text-gray-500'}`}>
                        {player.number}
                    </div>
                    <div className="flex flex-col">
                        <span className={`font-bold text-base uppercase ${player.is_on_court ? 'text-white' : 'text-gray-500'}`}>
                            {player.name}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={() => onToggle(player)}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider transition-colors ${player.is_on_court ? 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900' : 'bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700'}`}
                >
                    {player.is_on_court ? 'ON COURT' : 'BENCH'}
                </button>
            </div>
            <div className={`grid grid-cols-6 gap-1 ${!player.is_on_court ? 'pointer-events-none opacity-20' : ''}`}>
                <ActionButton label={isCorrection ? "-2" : "+2"} sub="PTS" color={isCorrection ? "bg-red-700" : "bg-blue-600"} onClick={() => onAction(player.id, team.id, '2pt', 2)} />
                <ActionButton label={isCorrection ? "-3" : "+3"} sub="PTS" color={isCorrection ? "bg-red-700" : "bg-indigo-600"} onClick={() => onAction(player.id, team.id, '3pt', 3)} />
                <ActionButton label={isCorrection ? "-1" : "+1"} sub="LF" color={isCorrection ? "bg-red-700" : "bg-sky-600"} onClick={() => onAction(player.id, team.id, '1pt', 1)} />
                <ActionButton label={isCorrection ? "-1" : "REB"} sub="O/D" color={isCorrection ? "bg-red-700" : "bg-orange-600"} onClick={() => onAction(player.id, team.id, 'rebound', 0)} />
                <ActionButton label={isCorrection ? "-1" : "AST"} sub="PASS" color={isCorrection ? "bg-red-700" : "bg-emerald-600"} onClick={() => onAction(player.id, team.id, 'assist', 0)} />
                <ActionButton label={isCorrection ? "-1" : "FTE"} sub="IND" color={isCorrection ? "bg-red-700" : "bg-rose-600"} onClick={() => onAction(player.id, team.id, 'foul', 0)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButton({ label, sub, color, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`${color} hover:brightness-110 active:scale-95 transition-all text-white py-2 rounded flex flex-col items-center justify-center shadow-md`}
        >
            <span className="font-black text-sm leading-none">{label}</span>
            <span className="text-[8px] opacity-80 font-bold uppercase leading-none mt-0.5">{sub}</span>
        </button>
    );
}