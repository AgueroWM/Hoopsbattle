
export interface Player {
  id: string;
  name: string;
  number: number;
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  height: string;
  stats: {
    ppg: number; // Points per game
    rpg: number; // Rebounds per game
    apg: number; // Assists per game
  };
  imageUrl: string;
  mvpVotes?: number; // For the MVP feature
  is_on_court?: boolean; // NEW: Status for Live Court visualization
}

export interface Team {
  id: string;
  name: string;
  city: string;
  logoUrl: string;
  wins: number;
  losses: number;
  roster: Player[];
}

export interface MatchEvent {
  id: string;
  time: string;
  description: string;
  type: 'score' | 'foul' | 'timeout' | 'highlight';
  teamId?: string;
}

export interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
  quarter: number; // 1-4, or 5+ for OT
  timeLeft: string; // Format MM:SS
  isLive: boolean;
  events: MatchEvent[];
  videoUrl?: string;
  youtubeId?: string; // ID Youtube for embedding
  socialLink?: string; // NEW: Lien de secours (Insta/Tiktok)
  socialLinkText?: string; // NEW: Message personnalisé pour le lien de secours
  activePlayersA: string[]; // List of Player IDs currently on court
  activePlayersB: string[]; // List of Player IDs currently on court
  
  // NEW FIELDS FOR CMS
  reviewTitle?: string;
  reviewText?: string;
  interviewVideoUrl?: string;
}

export interface HighlightVideo {
  id: string;
  title: string;
  videoUrl: string;
  likes: number;
  author: string;
}

export interface BracketMatch {
  id: string;
  round: 'Quarter' | 'Semi' | 'Final';
  teamA?: Team | null;
  teamB?: Team | null;
  scoreA?: number;
  scoreB?: number;
  winnerId?: string;
  nextMatchId?: string;
}