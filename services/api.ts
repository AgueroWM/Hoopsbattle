import { Match, Team, HighlightVideo, BracketMatch, Player } from '../types';
import { TEAMS, LIVE_MATCH, HIGHLIGHTS_DATA, INITIAL_SCHEDULE_DATA } from '../constants';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// --- UTILITAIRES DE MAPPING (Pour convertir les données brutes DB en objets utilisables) ---

// TODO: Refactor this mapping logic later. It's a bit messy but works for now.
// Ideally we should use a proper SQL join but time was short. - Doc
const mapPlayer = (data: any): Player => ({
  id: data.id?.toString() || '0',
  name: data.name || 'Inconnu',
  number: data.number || 0,
  position: data.position || 'G',
  height: data.height || 'N/A',
  stats: {
    ppg: data.stats_ppg || 0,
    rpg: data.stats_rpg || 0,
    apg: data.stats_apg || 0
  },
  // IMPORTANT: On utilise avatar_url en priorité, sinon fallback UI Avatars
  imageUrl: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || '?')}&background=random`,
  mvpVotes: data.mvp_votes || 0,
  // IMPORTANT: On mappe is_on_court pour le Live - Sécurisation des nuls
  is_on_court: data.is_on_court === true
});

// Pour une équipe, on a besoin de ses joueurs. 
const mapTeam = (data: any, allPlayers: any[] = []): Team => {
  let roster: Player[] = [];

  if (data.players && Array.isArray(data.players)) {
    // Si la jointure Supabase a renvoyé les joueurs directement
    roster = data.players.map(mapPlayer);
  } else if (allPlayers.length > 0) {
    // Si on filtre depuis une liste globale
    roster = allPlayers.filter(p => p.team_id === data.id).map(mapPlayer);
  }

  // Tri par numéro de maillot par défaut
  roster.sort((a, b) => a.number - b.number);

  return {
    id: data.id?.toString(),
    name: data.name || 'Équipe Mystère',
    city: data.short_name || data.city || '',
    logoUrl: data.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=0f172a&color=F4FF5F&size=200`,
    wins: data.wins || 0,
    losses: data.losses || 0,
    roster: roster
  };
};

// --- SERVICE API CENTRALISÉ ---

export const api = {
  matches: {
    // Récupère TOUS les matchs pour le planning
    getSchedule: async (): Promise<any[]> => {
      if (!isSupabaseConfigured()) return INITIAL_SCHEDULE_DATA;

      try {
        const { data, error } = await supabase
          .from('matches')
          .select(`
            *,
            team_a:teams!team_a_id(*, players(*)),
            team_b:teams!team_b_id(*, players(*))
          `)
          .order('start_time', { ascending: true });

        if (error) throw error;
        if (!data) return [];

        return data.map(m => ({
          id: m.id.toString(),
          start_time: m.start_time,
          status: m.status,
          score_team_a: m.score_team_a,
          score_team_b: m.score_team_b,
          team_a: m.team_a ? mapTeam(m.team_a) : { name: 'TBD', logoUrl: '' },
          team_b: m.team_b ? mapTeam(m.team_b) : { name: 'TBD', logoUrl: '' }
        }));
      } catch (e) {
        console.error("API Error getSchedule:", e);
        return INITIAL_SCHEDULE_DATA; // Fallback en cas d'erreur réseau
      }
    },

    // Récupère UN SEUL match avec détails complets pour la page MatchDetails
    getById: async (id: string): Promise<any | null> => {
       if (!isSupabaseConfigured()) {
           return INITIAL_SCHEDULE_DATA.find(m => m.id === id) || null;
       }

       try {
           const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                team_a:teams!team_a_id(*, players(*)),
                team_b:teams!team_b_id(*, players(*))
            `)
            .eq('id', id)
            .single();
           
           if (error || !data) return null;

           return {
               ...data,
               id: data.id.toString(),
               team_a: mapTeam(data.team_a),
               team_b: mapTeam(data.team_b),
               // MAPPING CMS FIELDS
               reviewText: data.review_text,
               interviewVideoUrl: data.interview_video_url,
           };

       } catch (e) {
           console.error("API Error getById:", e);
           return null;
       }
    },

    getLive: async (): Promise<Match> => {
        if (!isSupabaseConfigured()) return LIVE_MATCH;
        
        // On cherche un match LIVE ou SCHEDULED (le prochain)
        const { data } = await supabase
            .from('matches')
            .select(`*, teamA:teams!team_a_id(*), teamB:teams!team_b_id(*)`)
            .or('status.eq.live,status.eq.scheduled')
            .order('status', { ascending: true }) // 'live' vient avant 'scheduled' alphabétiquement ? Non.
            // On trie par start_time pour avoir le prochain ou l'actuel
            .order('start_time', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (!data) return LIVE_MATCH;

        // On récupère TOUS les joueurs pour avoir leur statut is_on_court à jour
        const { data: players } = await supabase.from('players').select('*');
        const allPlayers = players || [];

        const matchId = data.id.toString();
        const teamA = mapTeam(data.teamA, allPlayers);
        const teamB = mapTeam(data.teamB, allPlayers);

        // Filtrage des IDs actifs pour affichage rapide
        const activeA = teamA.roster.filter(p => p.is_on_court).map(p => p.id);
        const activeB = teamB.roster.filter(p => p.is_on_court).map(p => p.id);

        return {
            id: matchId,
            teamA: teamA,
            teamB: teamB,
            scoreA: data.score_team_a || 0,
            scoreB: data.score_team_b || 0,
            quarter: data.quarter || 1,
            timeLeft: data.time_left || '00:00',
            isLive: data.status === 'live',
            videoUrl: data.video_url,
            events: [],
            activePlayersA: activeA,
            activePlayersB: activeB,
            reviewText: data.review_text,
            interviewVideoUrl: data.interview_video_url
        };
    }
  },

  teams: {
    getAll: async (): Promise<Team[]> => {
      if (!isSupabaseConfigured()) return TEAMS;

      const { data } = await supabase.from('teams').select('*, players(*)').order('name');
      if (!data) return [];
      return data.map((t: any) => mapTeam(t));
    },
    
    voteMVP: async (playerId: string): Promise<boolean> => {
        if (!isSupabaseConfigured()) return true;
        await supabase.rpc('increment_mvp_vote', { player_id: parseInt(playerId) });
        return true;
    }
  },

  content: {
    getHighlights: async (): Promise<HighlightVideo[]> => {
        if (!isSupabaseConfigured()) return HIGHLIGHTS_DATA;
        
        const { data } = await supabase
            .from('highlights')
            .select(`*, player:players(name)`)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        
        if (!data) return [];
        
        return data.map((h: any) => ({
            id: h.id.toString(),
            title: h.title,
            videoUrl: h.media_url || h.video_url,
            likes: h.likes || 0,
            author: h.player?.name || h.user_name || 'Fan'
        }));
    },
    
    getBracketMatches: async (): Promise<any[]> => {
        if (!isSupabaseConfigured()) return [];
        const { data } = await supabase
            .from('matches')
            .select(`*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*)`)
            .not('round', 'is', null);
        return data || [];
    }
  }
};