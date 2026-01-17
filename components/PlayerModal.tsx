import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Shield, Zap, Star, BarChart3, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SmoothImage from './SmoothImage';

interface PlayerModalProps {
  player: any;
  matchId?: string; // Optionnel
  onClose: () => void;
}

export default function PlayerModal({ player, matchId, onClose }: PlayerModalProps) {
  const [loading, setLoading] = useState(true);
  const [seasonStats, setSeasonStats] = useState<any>({
      ppg: "0.0", rpg: "0.0", apg: "0.0", spg: "0.0", bpg: "0.0",
      games_played: 0,
      total_points: 0
  });
  
  // Gestion du vote
  const [activeMatchId, setActiveMatchId] = useState<string | null>(matchId || null);
  const [activeMatchName, setActiveMatchName] = useState<string>(''); // Pour afficher le nom
  const [votesStatus, setVotesStatus] = useState({
      defense: false,
      offense: false,
      mvp: false
  });

  useEffect(() => {
      const fetchFullStats = async () => {
          if (!player?.id) return;
          setLoading(true);

          // 1. Stats Saison
          const { data: stats } = await supabase
              .from('player_stats')
              .select('*')
              .eq('player_id', player.id);

          if (stats && stats.length > 0) {
              const totals = stats.reduce((acc: any, curr: any) => ({
                  pts: acc.pts + (curr.points || 0),
                  reb: acc.reb + (curr.rebounds_total || 0),
                  ast: acc.ast + (curr.assists || 0),
                  stl: acc.stl + (curr.steals || 0),
                  blk: acc.blk + (curr.blocks || 0),
              }), { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 });

              const games = stats.length;
              
              setSeasonStats({
                  ppg: (totals.pts / games).toFixed(1),
                  rpg: (totals.reb / games).toFixed(1),
                  apg: (totals.ast / games).toFixed(1),
                  spg: (totals.stl / games).toFixed(1),
                  bpg: (totals.blk / games).toFixed(1),
                  games_played: games,
                  total_points: totals.pts
              });
          }

          // 2. Gestion du Match Actif pour le vote
          let targetMatchId = activeMatchId;

          // Si pas d'ID fourni, on cherche le dernier match de l'équipe
          if (!targetMatchId) {
              const { data: lastMatch } = await supabase
                  .from('matches')
                  .select('id, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)')
                  .or(`team_a_id.eq.${player.team?.id},team_b_id.eq.${player.team?.id}`)
                  .order('start_time', { ascending: false })
                  .limit(1)
                  .single();
              
              if (lastMatch) {
                  targetMatchId = lastMatch.id;
                  setActiveMatchId(targetMatchId);
                  setActiveMatchName(`${lastMatch.team_a?.name} vs ${lastMatch.team_b?.name}`);
              }
          } else if (!activeMatchName) {
              // Si on a l'ID mais pas le nom, on le cherche
               const { data: currentMatch } = await supabase
                  .from('matches')
                  .select('team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)')
                  .eq('id', targetMatchId)
                  .single();
               if(currentMatch) {
                   setActiveMatchName(`${currentMatch.team_a?.name} vs ${currentMatch.team_b?.name}`);
               }
          }

          if (targetMatchId) {
              checkVoteStatus(targetMatchId);
          }

          setLoading(false);
      };

      fetchFullStats();
  }, [player]);

  const checkVoteStatus = (mId: string) => {
      const h = 2; 
      setVotesStatus({
          defense: !!localStorage.getItem(`vote_${mId}_defense_h${h}`),
          offense: !!localStorage.getItem(`vote_${mId}_offense_h${h}`),
          mvp: !!localStorage.getItem(`vote_${mId}_mvp_h${h}`)
      });
  };

  const handleVote = async (category: 'defense' | 'offense' | 'mvp') => {
      if (!activeMatchId || votesStatus[category]) return;
      const currentHalf = 2;

      const { error } = await supabase.from('player_votes').insert({
          match_id: parseInt(activeMatchId),
          player_id: parseInt(player.id),
          category: category,
          half: currentHalf
      });

      if (!error) {
          localStorage.setItem(`vote_${activeMatchId}_${category}_h${currentHalf}`, 'true');
          setVotesStatus(prev => ({ ...prev, [category]: true }));
          if (navigator.vibrate) navigator.vibrate(50);
      }
  };

  if (!player) return null;

  const imageUrl = player.imageUrl || player.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || 'Unknown')}&background=random`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-gradient-to-br from-gray-900 to-black border-2 border-hoops-yellow/50 rounded-2xl w-full max-w-sm relative shadow-[0_0_50px_rgba(244,255,95,0.2)] max-h-[85vh] overflow-y-auto no-scrollbar flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none sticky top-0"></div>
        
        <div className="sticky top-0 right-0 z-50 flex justify-end p-4 pointer-events-none">
            <button 
                onClick={onClose} 
                className="pointer-events-auto bg-black/80 text-white hover:text-hoops-yellow transition-colors rounded-full p-2 border border-white/20 backdrop-blur-md shadow-lg"
            >
                <X size={20} />
            </button>
        </div>

        <div className="relative pb-6 px-6 flex flex-col items-center -mt-12">
            {player.team?.logoUrl && (
                <img src={player.team.logoUrl} className="absolute top-0 left-0 w-full h-48 object-cover opacity-10 blur-xl mask-image-gradient" />
            )}

            <div className="w-32 h-32 rounded-full border-4 border-hoops-yellow shadow-2xl overflow-hidden bg-gray-800 mb-4 relative z-10 shrink-0">
                <SmoothImage src={imageUrl} className="w-full h-full" alt={player.name} />
            </div>

            <h2 className="text-3xl font-display font-bold italic uppercase text-white leading-none text-center mb-1">
                {player.name || 'Joueur Inconnu'}
            </h2>
            <div className="flex items-center gap-2 mb-6">
                <span className="bg-hoops-primary text-white text-xs font-bold px-2 py-0.5 rounded">#{player.number || '00'}</span>
                <span className="text-gray-400 font-bold uppercase text-sm">{player.position || 'N/A'}</span>
                <span className="text-hoops-yellow font-bold uppercase text-sm">• {player.team?.name || 'Free Agent'}</span>
            </div>

            {loading ? (
                 <div className="py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-hoops-yellow"></div></div>
            ) : (
                <>
                    <div className="flex items-center justify-center gap-2 mb-2 w-full">
                        <BarChart3 size={14} className="text-gray-500"/>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Moyennes Saison ({seasonStats.games_played} Matchs)</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 w-full mb-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">PTS/M</div>
                            <div className="text-2xl font-mono font-bold text-hoops-yellow">{seasonStats.ppg}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">REB/M</div>
                            <div className="text-2xl font-mono font-bold text-white">{seasonStats.rpg}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">AST/M</div>
                            <div className="text-2xl font-mono font-bold text-white">{seasonStats.apg}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full mb-4">
                         <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between items-center px-4">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">BLK/M</span>
                            <span className="font-mono font-bold text-white">{seasonStats.bpg}</span>
                         </div>
                         <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex justify-between items-center px-4">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">INT/M</span>
                            <span className="font-mono font-bold text-white">{seasonStats.spg}</span>
                         </div>
                    </div>

                    {/* Total Points (Barre retirée, juste le total) */}
                    <div className="w-full bg-white/5 rounded-lg p-3 mb-6 border border-white/5 flex justify-between items-center">
                         <span className="text-xs font-mono text-gray-400 uppercase">Points Totaux Saison</span>
                         <span className="text-xl font-bold text-white font-mono">{seasonStats.total_points} PTS</span>
                    </div>

                    {/* Voting Section */}
                    {activeMatchId && (
                        <div className="w-full border-t border-white/10 pt-4 mt-2 mb-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 text-center flex items-center justify-center gap-2">
                                <Star size={12} className="text-yellow-500"/> Voter pour ce joueur
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                <VoteBtn 
                                    label="Défense" 
                                    icon={<Shield size={18}/>} 
                                    active={votesStatus.defense} 
                                    onClick={() => handleVote('defense')} 
                                    color="blue"
                                />
                                <VoteBtn 
                                    label="Attaque" 
                                    icon={<Zap size={18}/>} 
                                    active={votesStatus.offense} 
                                    onClick={() => handleVote('offense')} 
                                    color="red"
                                />
                                <VoteBtn 
                                    label="MVP" 
                                    icon={<Trophy size={18}/>} 
                                    active={votesStatus.mvp} 
                                    onClick={() => handleVote('mvp')} 
                                    color="yellow"
                                />
                            </div>
                            <p className="text-[10px] text-center text-gray-600 mt-2 italic flex items-center justify-center gap-1">
                                <Calendar size={10}/> Match: {activeMatchName || `#${activeMatchId}`}
                            </p>
                        </div>
                    )}
                </>
            )}

            <button 
                onClick={onClose}
                className="w-full py-3 mt-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold uppercase text-sm transition-colors text-gray-300 md:hidden"
            >
                Fermer
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function VoteBtn({ label, icon, active, onClick, color }: any) {
    const baseClass = "flex flex-col items-center gap-1 p-2 rounded-lg transition-all active:scale-95 border";
    
    let colorClass = "";
    if (active) {
        colorClass = "bg-gray-800 border-gray-700 text-gray-500 cursor-default grayscale";
    } else if (color === 'blue') {
        colorClass = "bg-blue-900/30 border-blue-500/50 text-blue-400 hover:bg-blue-800";
    } else if (color === 'red') {
        colorClass = "bg-red-900/30 border-red-500/50 text-red-400 hover:bg-red-800";
    } else {
        colorClass = "bg-yellow-900/30 border-yellow-500/50 text-yellow-400 hover:bg-yellow-800";
    }

    return (
        <button onClick={onClick} disabled={active} className={`${baseClass} ${colorClass}`}>
            {icon}
            <span className="text-[9px] font-bold uppercase">{active ? 'Voté' : label}</span>
        </button>
    )
}