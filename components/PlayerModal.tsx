import React, { useState, useEffect } from 'react';
import { X, Trophy, Activity, Target, Shield, Zap, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PlayerModalProps {
  player: any;
  matchId?: string; // Optionnel : Si fourni, active le vote
  onClose: () => void;
}

export default function PlayerModal({ player, matchId, onClose }: PlayerModalProps) {
  const [votesStatus, setVotesStatus] = useState({
      defense: false,
      offense: false,
      mvp: false
  });

  useEffect(() => {
      if (matchId) {
          const currentHalf = 2; // Simplification pour l'instant
          setVotesStatus({
              defense: !!localStorage.getItem(`vote_${matchId}_defense_h${currentHalf}`),
              offense: !!localStorage.getItem(`vote_${matchId}_offense_h${currentHalf}`),
              mvp: !!localStorage.getItem(`vote_${matchId}_mvp_h${currentHalf}`)
          });
      }
  }, [matchId]);

  if (!player) return null;

  // PRIORITY LOGIC:
  // On regarde si on a des stats venant du leaderboard (DB View) ou des stats d'un match unique
  
  // 1. POINTS
  let mainStatLabel = "PTS";
  let mainStatValue = player.points || 0;

  // Si l'objet stats.ppg existe (venant du Leaderboard), c'est prioritaire
  if (player.stats && player.stats.ppg !== undefined) {
      mainStatLabel = "PPG";
      mainStatValue = player.stats.ppg;
  }

  // 2. REBOUNDS
  const reb = player.stats?.rebounds || player.rebounds || player.rebounds_total || 0;
  
  // 3. ASSISTS
  const ast = player.stats?.assists || player.assists || 0;
  
  // 4. AUTRES
  const blk = player.stats?.blocks || player.blocks || 0;
  const stl = player.stats?.steals || player.steals || 0;

  // Stats détaillées shooting (si disponibles depuis AdminMatch logic / Single Match)
  const p3 = player.points_3_made || 0;
  const p2 = player.points_2_made || 0;
  const p1 = player.points_1_made || 0;

  const handleVote = async (category: 'defense' | 'offense' | 'mvp') => {
      if (!matchId || votesStatus[category]) return;
      
      const currentHalf = 2;

      const { error } = await supabase.from('player_votes').insert({
          match_id: parseInt(matchId),
          player_id: parseInt(player.id),
          category: category,
          half: currentHalf
      });

      if (!error) {
          localStorage.setItem(`vote_${matchId}_${category}_h${currentHalf}`, 'true');
          setVotesStatus(prev => ({ ...prev, [category]: true }));
          if (navigator.vibrate) navigator.vibrate(50);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-gradient-to-br from-gray-900 to-black border-2 border-hoops-yellow/50 rounded-2xl w-full max-w-sm relative overflow-hidden shadow-[0_0_50px_rgba(244,255,95,0.2)]" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-hoops-yellow transition-colors z-10 bg-black/50 rounded-full p-1">
            <X size={24} />
        </button>

        <div className="relative pt-12 pb-6 px-6 flex flex-col items-center">
            {/* Team Logo Background */}
            {player.team?.logoUrl && (
                <img src={player.team.logoUrl} className="absolute top-0 left-0 w-full h-48 object-cover opacity-10 blur-xl mask-image-gradient" />
            )}

            {/* Player Image */}
            <div className="w-32 h-32 rounded-full border-4 border-hoops-yellow shadow-2xl overflow-hidden bg-gray-800 mb-4 relative z-10">
                <img src={player.imageUrl || player.avatar_url} className="w-full h-full object-cover" alt={player.name} />
            </div>

            <h2 className="text-3xl font-display font-bold italic uppercase text-white leading-none text-center mb-1">
                {player.name}
            </h2>
            <div className="flex items-center gap-2 mb-6">
                <span className="bg-hoops-primary text-white text-xs font-bold px-2 py-0.5 rounded">#{player.number}</span>
                <span className="text-gray-400 font-bold uppercase text-sm">{player.position}</span>
                <span className="text-hoops-yellow font-bold uppercase text-sm">• {player.team?.name}</span>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-3 gap-3 w-full mb-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">{mainStatLabel}</div>
                    <div className="text-2xl font-mono font-bold text-hoops-yellow">{mainStatValue}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">REB</div>
                    <div className="text-2xl font-mono font-bold text-white">{reb}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">AST</div>
                    <div className="text-2xl font-mono font-bold text-white">{ast}</div>
                </div>
            </div>

            {/* Stats Row 2 (Blocks/Steals/Games) */}
            <div className="flex justify-center gap-4 text-xs text-gray-400 font-mono mb-4">
                 <span>BLK: <b className="text-white">{blk}</b></span>
                 <span>STL: <b className="text-white">{stl}</b></span>
                 {player.stats?.games_played && <span>Matchs: <b className="text-white">{player.stats.games_played}</b></span>}
            </div>

            {/* Detailed Shooting Stats (if available - usually single match) */}
            {(p3 > 0 || p2 > 0 || p1 > 0) && (
                <div className="w-full flex justify-between gap-2 mb-6 text-xs font-mono text-gray-400 bg-black/30 p-2 rounded-lg">
                    <span>3PTS: <strong className="text-white">{p3}</strong></span>
                    <span>2PTS: <strong className="text-white">{p2}</strong></span>
                    <span>LF: <strong className="text-white">{p1}</strong></span>
                </div>
            )}

            {/* Voting Section (Only if matchId is present) */}
            {matchId && (
                <div className="w-full border-t border-white/10 pt-4 mt-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 text-center">Voter pour ce joueur</h3>
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
                            icon={<Star size={18}/>} 
                            active={votesStatus.mvp} 
                            onClick={() => handleVote('mvp')} 
                            color="yellow"
                        />
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
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