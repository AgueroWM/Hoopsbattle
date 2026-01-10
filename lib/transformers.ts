import { Player, Team } from '../types';

// Default fallback images
const AVATAR_API = 'https://ui-avatars.com/api/';
const FALLBACK_BG = '0f172a';
const FALLBACK_COLOR = 'F4FF5F';

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
    imageUrl: data.avatar_url || `${AVATAR_API}?name=${encodeURIComponent(data.name)}&background=random`,
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
    logoUrl: data.logo_url || `${AVATAR_API}?name=${encodeURIComponent(data.name)}&background=${FALLBACK_BG}&color=${FALLBACK_COLOR}&size=200`,
    wins: data.wins || 0,
    losses: data.losses || 0,
    roster: roster.sort((a, b) => a.number - b.number)
  };
};
