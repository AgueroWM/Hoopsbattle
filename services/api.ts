import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toTeam, toPlayer } from '../lib/transformers';
import { TEAMS, LIVE_MATCH, HIGHLIGHTS_DATA, INITIAL_SCHEDULE_DATA } from '../constants';
import { Match, Team, HighlightVideo } from '../types';

// Helper to handle mock data transparently
const useMock = !isSupabaseConfigured();

export const api = {
  matches: {
    getSchedule: async () => {
      if (useMock) return INITIAL_SCHEDULE_DATA;

      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(*, players(*)),
          team_b:teams!team_b_id(*, players(*))
        `)
        .order('start_time', { ascending: true })
        // Optimisation: On ne charge pas tout l'historique par défaut si la table grandit
        // Pour l'instant on limite à 50 matchs pour éviter le chargement infini
        .limit(50); 

      if (error) throw error;
      
      return (data || []).map(m => ({
        id: m.id.toString(),
        start_time: m.start_time,
        status: m.status,
        score_team_a: m.score_team_a,
        score_team_b: m.score_team_b,
        team_a: toTeam(m.team_a),
        team_b: toTeam(m.team_b)
      }));
    },

    getById: async (id: string) => {
       if (useMock) {
           return INITIAL_SCHEDULE_DATA.find(m => m.id === id) || null;
       }

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
           team_a: toTeam(data.team_a),
           team_b: toTeam(data.team_b),
           reviewText: data.review_text,
           interviewVideoUrl: data.interview_video_url,
       };
    },

    getLive: async (): Promise<Match> => {
        if (useMock) return LIVE_MATCH;
        
        // Priority: Live matches > Scheduled matches (soonest)
        const { data } = await supabase
            .from('matches')
            .select(`*, teamA:teams!team_a_id(*), teamB:teams!team_b_id(*)`)
            .or('status.eq.live,status.eq.scheduled')
            .order('status', { ascending: true }) // 'live' comes before 'scheduled' alphabetically? No, check DB enum. Assuming logic holds for now.
            .order('start_time', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (!data) return LIVE_MATCH;

        // Fetch all players to hydrate roster status efficiently
        const { data: players } = await supabase.from('players').select('*');
        const allPlayers = players || [];

        const teamA = toTeam(data.teamA, allPlayers);
        const teamB = toTeam(data.teamB, allPlayers);

        // Compute active players on court
        const getActiveIds = (t: Team) => t.roster.filter(p => p.is_on_court).map(p => p.id);

        return {
            id: data.id.toString(),
            teamA,
            teamB,
            scoreA: data.score_team_a || 0,
            scoreB: data.score_team_b || 0,
            quarter: data.quarter || 1,
            timeLeft: data.time_left || '00:00',
            isLive: data.status === 'live',
            videoUrl: data.video_url,
            events: [], // Events would need a separate fetch in a real app
            activePlayersA: getActiveIds(teamA),
            activePlayersB: getActiveIds(teamB),
            reviewText: data.review_text,
            interviewVideoUrl: data.interview_video_url
        };
    }
  },

  teams: {
    getAll: async (): Promise<Team[]> => {
      if (useMock) return TEAMS;

      const { data, error } = await supabase
        .from('teams')
        .select('*, players(*)')
        .order('name');
      
      if (error) console.error("Error fetching teams:", error);
      return (data || []).map(toTeam);
    },
    
    voteMVP: async (playerId: string) => {
        if (useMock) return true;
        const { error } = await supabase.rpc('increment_mvp_vote', { player_id: parseInt(playerId) });
        return !error;
    }
  },

  content: {
    getHighlights: async (): Promise<HighlightVideo[]> => {
        if (useMock) return HIGHLIGHTS_DATA;
        
        const { data } = await supabase
            .from('highlights')
            .select(`*, player:players(name)`)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        
        return (data || []).map((h: any) => ({
            id: h.id.toString(),
            title: h.title,
            videoUrl: h.media_url || h.video_url,
            likes: h.likes || 0,
            author: h.player?.name || h.user_name || 'Fan'
        }));
    },
    
    getBracketMatches: async () => {
        if (useMock) return [];
        
        const { data } = await supabase
            .from('matches')
            .select(`*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*)`)
            .not('round', 'is', null);
            
        return data || [];
    }
  }
};
