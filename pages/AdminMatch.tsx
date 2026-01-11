import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Camera, RefreshCcw, Youtube, FileEdit, Save, Video, Trash2, Upload, CheckCircle, Clock, Smartphone, MessageSquare } from 'lucide-react';

const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
};

const PIN_HASH = "1537282";

export default function AdminMatch() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const { id } = useParams();
  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchMedias, setMatchMedias] = useState<any[]>([]);
  const [statsCache, setStatsCache] = useState<any[]>([]);
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);
  
  // Links State
  const [youtubeId, setYoutubeId] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [socialLinkText, setSocialLinkText] = useState(''); 

  const [showReviewEditor, setShowReviewEditor] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [interviewUrl, setInterviewUrl] = useState('');

  // New: Start Time Editor
  const [editTime, setEditTime] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMatchData = useCallback(async (matchId: string) => {
    const { data: matchData, error } = await supabase
      .from('matches')
      .select(`*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*)`)
      .eq('id', matchId)
      .single();
    
    if (error) return;
    if (matchData) {
        matchData.quarter = Number(matchData.quarter);
        matchData.score_team_a = Number(matchData.score_team_a);
        matchData.score_team_b = Number(matchData.score_team_b);
        setYoutubeId(matchData.youtube_id || '');
        setSocialLink(matchData.social_link || '');
        setSocialLinkText(matchData.social_link_text || '');
        setReviewText(matchData.review_text || '');
        setInterviewUrl(matchData.interview_video_url || '');
        
        if (matchData.start_time) {
            const d = new Date(matchData.start_time);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            setEditTime(d.toISOString().slice(0, 16));
        }
    }
    setMatch(matchData);

    if (matchData) {
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .in('team_id', [matchData.team_a_id, matchData.team_b_id])
        .order('number', { ascending: true });
      
      const safePlayers = (playersData || []).map((p: any) => ({
          ...p,
          is_on_court: p.is_on_court === true
      }));

      setPlayers(safePlayers);
    }

    const { data: statsData } = await supabase
        .from('player_stats')
        .select('*')
        .eq('match_id', matchId);
    setStatsCache(statsData || []);

    const { data: mediaData } = await supabase
        .from('highlights')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });
    setMatchMedias(mediaData || []);
  }, []);

  useEffect(() => {
    if (!id) return;
    const sessionAuth = sessionStorage.getItem('hoops_admin_auth');
    if (sessionAuth === 'true') setIsAuthenticated(true);

    if (isAuthenticated || sessionAuth === 'true') {
        fetchMatchData(id);
        const subscription = supabase.channel('admin-universal-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, () => fetchMatchData(id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'player_stats', filter: `match_id=eq.${id}` }, () => {
            supabase.from('player_stats').select('*').eq('match_id', id).then(({ data }) => { if(data) setStatsCache(data); });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'highlights', filter: `match_id=eq.${id}` }, () => fetchMatchData(id))
        .subscribe();
        return () => { supabase.removeChannel(subscription); }
    }
  }, [id, fetchMatchData, isAuthenticated]);

  const checkPin = (e?: React.FormEvent) => {
      if(e) e.preventDefault();
      const cleanPin = pin.trim();
      if (simpleHash(cleanPin) === PIN_HASH) {
          setIsAuthenticated(true);
          sessionStorage.setItem('hoops_admin_auth', 'true');
      } else { alert("Code Incorrect"); setPin(''); }
  };

  async function toggleOnCourt(player: any) {
      const newValue = !player.is_on_court;
      setPlayers(prev => prev.map(p => String(p.id) === String(player.id) ? { ...p, is_on_court: newValue } : p));
      if (isSupabaseConfigured()) await supabase.from('players').update({ is_on_court: newValue }).eq('id', player.id);
  }

  async function updatePlayerNumber(playerId: number, newNumber: string) {
      if (!newNumber) return;
      if (isSupabaseConfigured()) await supabase.from('players').update({ number: parseInt(newNumber) }).eq('id', playerId);
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, number: parseInt(newNumber) } : p));
  }

  async function handleAction(playerId: number, teamId: number, type: string, points: number) {
    setLoading(true);
    const modifier = isCorrectionMode ? -1 : 1;
    const pointsToAdd = points * modifier;

    try {
      if (!isSupabaseConfigured()) { setTimeout(() => setLoading(false), 200); return; }
      
      const { data: existingStats } = await supabase.from('player_stats').select('*').eq('match_id', match.id).eq('player_id', playerId).maybeSingle();
      
      const currentStats = existingStats || { 
          match_id: parseInt(match.id), 
          player_id: playerId, 
          team_id: teamId, 
          points: 0, 
          points_1_made: 0,
          points_2_made: 0,
          points_3_made: 0,
          rebounds_total: 0, 
          assists: 0, 
          fouls: 0, 
          blocks: 0, 
          steals: 0 
      };

      const updates: any = { ...currentStats };
      
      if (points !== 0) {
          updates.points = Math.max(0, (updates.points || 0) + pointsToAdd);
      }

      if (type === '1pt') updates.points_1_made = Math.max(0, (updates.points_1_made || 0) + modifier);
      else if (type === '2pt') updates.points_2_made = Math.max(0, (updates.points_2_made || 0) + modifier);
      else if (type === '3pt') updates.points_3_made = Math.max(0, (updates.points_3_made || 0) + modifier);
      else if (type === 'rebound') updates.rebounds_total = Math.max(0, (updates.rebounds_total || 0) + modifier);
      else if (type === 'assist') updates.assists = Math.max(0, (updates.assists || 0) + modifier);
      else if (type === 'foul') updates.fouls = Math.max(0, (updates.fouls || 0) + modifier);
      else if (type === 'block') updates.blocks = Math.max(0, (updates.blocks || 0) + modifier);
      else if (type === 'steal') updates.steals = Math.max(0, (updates.steals || 0) + modifier);

      await supabase.from('player_stats').upsert(updates);
      
      setStatsCache(prev => {
          const filtered = prev.filter(s => s.player_id !== playerId);
          return [...filtered, updates];
      });

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
          await supabase.from('matches').update(updatePayload).eq('id', match.id);
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

  const endMatch = async () => {
      if(!window.confirm("⚠️ ATTENTION : Valider le score final et qualifier le vainqueur ?")) return;

      try {
        await supabase.from('matches').update({ status: 'finished' }).eq('id', match.id)
        const { error } = await supabase.rpc('auto_promote_winner', { finished_match_id: match.id })

        if (error) {
            console.error("RPC Error:", error);
            alert("Erreur technique lors de la qualification auto. Vérifiez les scores.");
        } else {
            alert("✅ Match terminé ! Le vainqueur a été qualifié.");
        }
        if(id) fetchMatchData(id);

      } catch (err) {
        alert("Erreur critique.")
      }
  };

  const incrementValue = async (field: string, amount: number) => {
      const current = Number(match[field]) || 0;
      let newVal = Math.max(field === 'quarter' ? 1 : 0, current + amount);
      updateMatchStatus(field, newVal);
  };
  
  const saveLinks = async () => {
      let input = youtubeId.trim();
      let idToSave = input;

      // Logique de validation ROBUSTE (Regex)
      if (input.includes('twitch.tv/')) {
          const match = input.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
          if (match) idToSave = `twitch:${match[1]}`;
      } 
      else if (input.includes('youtube.com') || input.includes('youtu.be')) {
          let match = input.match(/[?&]v=([^&?]+)/);
          if (!match) match = input.match(/youtu\.be\/([^&?]+)/);
          if (!match) match = input.match(/\/live\/([^&?]+)/);
          if (!match) match = input.match(/\/embed\/([^&?]+)/);
          if (match) idToSave = match[1];
      }

      // 1. Sauvegarde Youtube (toujours possible)
      const { error: ytError } = await supabase.from('matches').update({ 
          youtube_id: idToSave,
      }).eq('id', match.id);

      if (ytError) {
          alert("Erreur Youtube: " + ytError.message);
          return;
      }

      // 2. Sauvegarde Social Link (peut échouer si colonne absente)
      // On tente de le faire séparément pour ne pas bloquer Youtube
      if (socialLink || socialLinkText) {
          try {
              const { error: socError } = await supabase.from('matches').update({ 
                  social_link: socialLink,
                  social_link_text: socialLinkText
              }).eq('id', match.id);
              
              if (socError) {
                  // Si erreur colonne, on l'affiche gentiment
                  if (socError.message.includes("column")) {
                      alert("⚠️ Le lien Youtube est sauvé, MAIS le lien de secours n'a pas pu être enregistré car la base de données n'est pas à jour (colonne manquante). Demandez au dev de lancer le script SQL.");
                  } else {
                      alert("Erreur Social: " + socError.message);
                  }
              } else {
                  alert(`✅ Tous les liens sauvegardés !\nID Vidéo détecté : ${idToSave}`);
              }
          } catch (e) {
               alert("Erreur critique sur les liens sociaux. Youtube est OK.");
          }
      } else {
           alert(`✅ Lien Youtube sauvegardé !\nID Vidéo détecté : ${idToSave}`);
      }
      
      if(id) fetchMatchData(id); 
  };

  const saveReview = async () => {
      const { error } = await supabase.from('matches').update({ review_text: reviewText, interview_video_url: interviewUrl }).eq('id', match.id);
      if(!error) { alert("Contenu Review sauvegardé !"); setShowReviewEditor(false); }
  };

  async function handleFileUpload(event: any, matchId: number) { /* ... */ }

  const triggerUpload = () => { fileInputRef.current?.click(); }

  if (!isAuthenticated) return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-900 p-8 rounded-xl border border-hoops-primary text-center max-w-sm w-full shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-widest font-display">Accès Staff</h2>
          <form onSubmit={checkPin}>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Code PIN" className="w-full bg-gray-800 text-white p-4 rounded-lg text-center text-xl tracking-widest mb-4 border border-gray-700 focus:border-hoops-primary outline-none" autoFocus />
              <button type="submit" className="w-full bg-hoops-primary text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors uppercase">Entrer</button>
          </form>
        </div>
      </div>
  )

  if (!match) return <div className="min-h-screen bg-hoops-bg flex items-center justify-center text-white">Chargement...</div>;

  return (
    <div className={`min-h-screen text-white p-2 pb-24 md:pb-4 pt-20 max-w-7xl mx-auto font-sans transition-colors duration-500 ${isCorrectionMode ? 'bg-red-950/30' : 'bg-hoops-bg'}`}>
      
      {isCorrectionMode && (
          <div className="fixed top-16 left-0 right-0 bg-red-600 text-white text-center py-1 font-bold z-50 animate-pulse shadow-lg">⚠️ MODE CORRECTION ACTIF ⚠️</div>
      )}

      {/* TOP BAR */}
      <div className="flex flex-col gap-4 mb-4 px-2">
          <div className="flex justify-between items-center">
            <Link to="/admin" className="text-gray-400 hover:text-white flex items-center gap-1"><ArrowLeft size={16} /> Dashboard</Link>
            <div className="flex items-center gap-3">
                <button onClick={() => setShowReviewEditor(!showReviewEditor)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase bg-hoops-primary text-white"><FileEdit size={12}/> Review CMS</button>
                <button onClick={() => setIsCorrectionMode(!isCorrectionMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${isCorrectionMode ? 'bg-red-500 text-white animate-bounce' : 'bg-gray-800 text-gray-400 border border-gray-600'}`}><RefreshCcw size={12} className={isCorrectionMode ? 'rotate-180' : ''} />{isCorrectionMode ? 'Correction' : 'Correction'}</button>
            </div>
          </div>

          {/* LINK EDITOR */}
           <div className="bg-gray-900 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                  <Youtube className="text-red-500 flex-shrink-0" size={20} />
                  <input type="text" placeholder="Lien Youtube / Twitch (URL ou ID)" value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} className="bg-black border border-white/20 rounded px-2 py-1 text-sm text-white flex-1" />
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                  <div className="flex gap-2 items-center flex-1">
                      <Smartphone className="text-purple-500 flex-shrink-0" size={20} />
                      <input type="text" placeholder="Lien Secours (Instagram/TikTok URL)" value={socialLink} onChange={(e) => setSocialLink(e.target.value)} className="bg-black border border-white/20 rounded px-2 py-1 text-sm text-white flex-1" />
                  </div>
                  <div className="flex gap-2 items-center flex-1">
                      <MessageSquare className="text-gray-400 flex-shrink-0" size={20} />
                      <input type="text" placeholder="Message Lien Secours (Ex: Panne technique, suivez ici)" value={socialLinkText} onChange={(e) => setSocialLinkText(e.target.value)} className="bg-black border border-white/20 rounded px-2 py-1 text-sm text-white flex-1" />
                  </div>
                  <button onClick={saveLinks} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-xs font-bold uppercase whitespace-nowrap self-end md:self-auto h-8">Sauvegarder</button>
              </div>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-4">
               {/* 1. Status */}
               <div className="flex flex-col gap-1">
                   <label className="text-[10px] uppercase text-gray-500 font-bold">Statut</label>
                   <select value={match.status} onChange={(e) => updateMatchStatus('status', e.target.value)} className="bg-black border border-white/20 rounded px-2 py-1 text-sm font-bold uppercase focus:outline-none">
                       <option value="scheduled">Programmé</option>
                       <option value="live">🔴 EN DIRECT</option>
                       <option value="finished">Terminé</option>
                   </select>
               </div>
               {/* 2. Quarter */}
               <div className="flex flex-col gap-1">
                   <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Période</label>
                   </div>
                   <div className="flex items-center gap-2">
                       <button onClick={() => incrementValue('quarter', -1)} className="bg-white/10 w-8 h-8 rounded hover:bg-white/20 font-bold">-</button>
                       <span className="font-mono text-xl font-bold w-full text-center bg-black/40 rounded border border-white/5 py-0.5">{match.quarter === 1 ? "1ère MT" : match.quarter === 2 ? "2ème MT" : `Prolong ${match.quarter-2}`}</span>
                       <button onClick={() => incrementValue('quarter', 1)} className="bg-white/10 w-8 h-8 rounded hover:bg-white/20 font-bold">+</button>
                   </div>
               </div>
               {/* Teams Fouls/Timeouts */}
               <div className="flex flex-col gap-1 border-l border-white/10 pl-4">
                   <span className="text-[10px] uppercase text-hoops-primary font-bold truncate">{match.team_a?.name}</span>
                   <div className="flex justify-between text-xs">
                       <div className="flex flex-col items-center"><span className="text-gray-500">Fautes</span><div className="flex gap-1"><button onClick={() => incrementValue('team_a_fouls', -1)} className="px-1 bg-white/5 rounded">-</button><span className="font-mono font-bold text-white w-4 text-center">{match.team_a_fouls || 0}</span><button onClick={() => incrementValue('team_a_fouls', 1)} className="px-1 bg-white/5 rounded">+</button></div></div>
                       <div className="flex flex-col items-center"><span className="text-gray-500">T.Morts</span><div className="flex gap-1"><button onClick={() => incrementValue('team_a_timeouts', -1)} className="px-1 bg-white/5 rounded">-</button><span className="font-mono font-bold text-white w-4 text-center">{match.team_a_timeouts || 0}</span><button onClick={() => incrementValue('team_a_timeouts', 1)} className="px-1 bg-white/5 rounded">+</button></div></div>
                   </div>
               </div>
               <div className="flex flex-col gap-1 border-l border-white/10 pl-4">
                   <span className="text-[10px] uppercase text-hoops-yellow font-bold truncate">{match.team_b?.name}</span>
                   <div className="flex justify-between text-xs">
                       <div className="flex flex-col items-center"><span className="text-gray-500">Fautes</span><div className="flex gap-1"><button onClick={() => incrementValue('team_b_fouls', -1)} className="px-1 bg-white/5 rounded">-</button><span className="font-mono font-bold text-white w-4 text-center">{match.team_b_fouls || 0}</span><button onClick={() => incrementValue('team_b_fouls', 1)} className="px-1 bg-white/5 rounded">+</button></div></div>
                       <div className="flex flex-col items-center"><span className="text-gray-500">T.Morts</span><div className="flex gap-1"><button onClick={() => incrementValue('team_b_timeouts', -1)} className="px-1 bg-white/5 rounded">-</button><span className="font-mono font-bold text-white w-4 text-center">{match.team_b_timeouts || 0}</span><button onClick={() => incrementValue('team_b_timeouts', 1)} className="px-1 bg-white/5 rounded">+</button></div></div>
                   </div>
               </div>
          </div>
      </div>

      {/* Header Score Rapide */}
      <header className="mb-4 bg-hoops-card border border-white/10 p-4 rounded-xl flex justify-between items-center sticky top-20 z-30 shadow-xl backdrop-blur-md">
         <div className="font-display font-bold text-xl flex flex-col md:flex-row items-center gap-2">
             <span className="text-gray-300">{match.team_a?.short_name}</span> 
             <span className="text-hoops-primary font-mono text-3xl">{match.score_team_a}</span>
         </div>
         <div className="flex flex-col items-center">
             <div className="text-[10px] font-bold uppercase text-gray-500 bg-white/5 px-2 py-0.5 rounded mb-1">{match.quarter === 1 ? "1ère MT" : "2ème MT"}</div>
             <button onClick={triggerUpload} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors border border-white/10" title="Ajouter Photo"><Camera size={20} className="text-hoops-yellow" /></button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleFileUpload(e, parseInt(match.id))} />
         </div>
         <div className="font-display font-bold text-xl flex flex-col md:flex-row items-center gap-2">
             <span className="text-hoops-yellow font-mono text-3xl">{match.score_team_b}</span>
             <span className="text-gray-300">{match.team_b?.short_name}</span>
         </div>
      </header>

      {/* --- PLAYERS COLUMNS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TeamColumn team={match.team_a} players={players.filter(p => p.team_id === match.team_a_id)} onAction={handleAction} onToggle={toggleOnCourt} onNumberChange={updatePlayerNumber} loading={loading} color="blue" isCorrection={isCorrectionMode} statsCache={statsCache} />
        <TeamColumn team={match.team_b} players={players.filter(p => p.team_id === match.team_b_id)} onAction={handleAction} onToggle={toggleOnCourt} onNumberChange={updatePlayerNumber} loading={loading} color="yellow" isCorrection={isCorrectionMode} statsCache={statsCache} />
      </div>

      <div className="mt-8 flex justify-center pb-24">
           <button onClick={endMatch} className="bg-green-600 hover:bg-green-500 border border-green-400 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)]">
               <CheckCircle size={20}/> TERMINER LE MATCH 🏁
           </button>
      </div>

    </div>
  );
}

function TeamColumn({ team, players, onAction, onToggle, onNumberChange, loading, color, isCorrection, statsCache }: any) {
  const borderColor = color === 'blue' ? 'border-hoops-primary' : 'border-hoops-yellow';
  const headerColor = color === 'blue' ? 'text-hoops-primary' : 'text-hoops-yellow';
  const badgeColor = color === 'blue' ? 'bg-hoops-primary' : 'bg-hoops-yellow text-black';

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
        {sortedPlayers.map((player: any) => {
            const stats = statsCache.find((s:any) => s.player_id === player.id) || { points: 0, rebounds_total: 0, assists: 0, fouls: 0, blocks: 0, steals: 0, points_1_made: 0, points_2_made: 0, points_3_made: 0 };
            
            return (
              <div key={player.id} className={`p-3 rounded-lg border transition-all ${player.is_on_court ? 'bg-gray-800 border-white/20 shadow-lg relative overflow-hidden' : 'bg-gray-900/30 border-transparent opacity-60 grayscale'}`}>
                {player.is_on_court && <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${badgeColor}`}></div>}
                <div className="flex justify-between items-center mb-3 pl-3">
                    <div className="flex items-center gap-3">
                        <input type="number" defaultValue={player.number} onBlur={(e) => onNumberChange(player.id, e.target.value)} className={`w-10 h-10 rounded-lg text-lg text-center font-bold font-mono border-0 focus:ring-2 ring-white/50 ${player.is_on_court ? badgeColor : 'bg-gray-700 text-gray-500'}`} />
                        <div className="flex flex-col">
                            <span className={`font-bold text-base uppercase ${player.is_on_court ? 'text-white' : 'text-gray-500'}`}>{player.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{stats.points} PTS • {stats.fouls} FLT</span>
                        </div>
                    </div>
                    <button onClick={() => onToggle(player)} className={`text-[10px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider transition-colors ${player.is_on_court ? 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900' : 'bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700'}`}>{player.is_on_court ? 'ON COURT' : 'BENCH'}</button>
                </div>
                
                <div className={`grid grid-cols-4 md:grid-cols-6 gap-2 ${!player.is_on_court ? 'pointer-events-none opacity-20' : ''}`}>
                    <BtnStat label={isCorrection ? "-2" : "+2"} sub="PTS" val={stats.points_2_made} onClick={() => onAction(player.id, team.id, '2pt', 2)} color={isCorrection ? "bg-red-800" : "bg-blue-600"}/>
                    <BtnStat label={isCorrection ? "-3" : "+3"} sub="PTS" val={stats.points_3_made} onClick={() => onAction(player.id, team.id, '3pt', 3)} color={isCorrection ? "bg-red-800" : "bg-indigo-600"}/>
                    <BtnStat label={isCorrection ? "-1" : "+1"} sub="LF" val={stats.points_1_made} onClick={() => onAction(player.id, team.id, '1pt', 1)} color={isCorrection ? "bg-red-800" : "bg-sky-600"}/>
                    <BtnStat label="REB" val={stats.rebounds_total} onClick={() => onAction(player.id, team.id, 'rebound', 0)} color={isCorrection ? "bg-red-800" : "bg-orange-600"}/>
                    <BtnStat label="AST" val={stats.assists} onClick={() => onAction(player.id, team.id, 'assist', 0)} color={isCorrection ? "bg-red-800" : "bg-emerald-600"}/>
                    <BtnStat label="FTE" val={stats.fouls} onClick={() => onAction(player.id, team.id, 'foul', 0)} color={isCorrection ? "bg-red-800" : "bg-rose-600"} warning={stats.fouls >= 4}/>
                    <BtnStat label="STL" val={stats.steals} onClick={() => onAction(player.id, team.id, 'steal', 0)} color={isCorrection ? "bg-red-800" : "bg-pink-600"}/>
                    <BtnStat label="BLK" val={stats.blocks} onClick={() => onAction(player.id, team.id, 'block', 0)} color={isCorrection ? "bg-red-800" : "bg-purple-600"}/>
                </div>
              </div>
            )
        })}
      </div>
    </div>
  );
}

function BtnStat({ label, sub, val, color, onClick, warning }: any) {
    return (
        <button onClick={onClick} className={`relative ${color} ${warning ? 'ring-2 ring-red-500 animate-pulse' : ''} hover:brightness-110 active:scale-95 transition-all text-white py-3 rounded-lg flex flex-col items-center justify-center shadow-md`}>
            <span className="font-black text-sm leading-none">{label}</span>
            {sub && <span className="text-[8px] opacity-80 font-bold uppercase leading-none mt-0.5">{sub}</span>}
            {val !== undefined && <span className="absolute -top-2 -right-2 bg-white text-black text-[10px] font-mono font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-700 shadow-sm z-10">{val}</span>}
        </button>
    );
}