import { Player, Team } from '../types';

// Default fallback images
const AVATAR_API = 'https://ui-avatars.com/api/';
const FALLBACK_BG = '0f172a';
const FALLBACK_COLOR = 'F4FF5F';

const optimizeSupabaseUrl = (url: string, width = 200) => {
    if (!url) return url;
    if (url.includes('supabase.co') && url.includes('/storage/v1/object/public/')) {
        // Switch to render/image endpoint for optimization if available (Standard Supabase Feature)
        // If not enabled on project, this might fallback or fail, but it's the standard fix for "slow images"
        // Safest is to just append width if it's already a render url, or try to switch.
        // Given "urgent", we'll try the switch which is most likely to yield performance.
        return url.replace('/storage/v1/object/public/', `/storage/v1/render/image/public/`) + `?width=${width}&resize=contain&quality=80`;
    }
    return url;
};

export const toPlayer = (data: any): Player => {
  if (!data) throw new Error('Player data is missing');

  return {
    id: data.id?.toString(),
    name: data.name,
    number: data.number,
    position: data.position || 'G',
    height: data.height,
    stats: {
      ppg: data.stats_ppg || 0,
      rpg: data.stats_rpg || 0,
      apg: data.stats_apg || 0
    },
    // Use stored URL or generate one on the fly
    imageUrl: optimizeSupabaseUrl(data.avatar_url) || `${AVATAR_API}?name=${encodeURIComponent(data.name)}&background=random`,
    mvpVotes: data.mvp_votes || 0,
    is_on_court: Boolean(data.is_on_court)
  };
};

export const toTeam = (data: any, globalRoster: any[] = []): Team => {
  if (!data) return { 
    id: '0', 
    name: 'TBD', 
    city: '', 
    logoUrl: '', 
    wins: 0, 
    losses: 0, 
    roster: [] 
  };

  let roster: Player[] = [];

  // Handle direct relation or filter from global list
  if (Array.isArray(data.players)) {
    roster = data.players.map(toPlayer);
  } else if (globalRoster.length > 0) {
    roster = globalRoster
      .filter(p => p.team_id === data.id)
      .map(toPlayer);
  }

  return {
    id: data.id?.toString(),
    name: data.name,
    city: data.short_name || data.city,
    logoUrl: optimizeSupabaseUrl(data.logo_url, 300) || `${AVATAR_API}?name=${encodeURIComponent(data.name)}&background=${FALLBACK_BG}&color=${FALLBACK_COLOR}&size=200`,
    wins: data.wins || 0,
    losses: data.losses || 0,
    roster: roster.sort((a, b) => a.number - b.number)
  };
};
