
export interface Player {
  id: string;
  name: string;
  number: number;
  position: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  height: string;
  stats: {
    ppg: number;
    rpg: number;
    apg: number;
  };
  imageUrl: string;
  mvpVotes?: number;
  is_on_court?: boolean;
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
  quarter: number;
  timeLeft: string;
  isLive: boolean;
  events: MatchEvent[];
  videoUrl?: string;
  youtubeId?: string;
  activePlayersA: string[];
  activePlayersB: string[];
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