import { Team, Match, HighlightVideo, BracketMatch } from './types';

// Helper to generate placeholder images
const getLogo = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=F4FF5F&size=200&font-size=0.33&bold=true&length=2&rounded=true`;

// --- TEAMS ---
export const TEAMS: Team[] = [
  // --- EXISTING & CONFIRMED ---
  { id: 't_brigade', name: 'La Brigade Fantôme', city: 'Paris', logoUrl: getLogo('La Brigade Fantôme'), wins: 0, losses: 0, roster: [] },
  { id: 't_genz', name: 'Gen Z', city: 'Lyon', logoUrl: getLogo('Gen Z'), wins: 0, losses: 0, roster: [] },
  { id: 't_akatsuki', name: 'Akatsuki', city: 'Bordeaux', logoUrl: getLogo('Akatsuki'), wins: 0, losses: 0, roster: [] },
  { id: 't_667', name: 'Le Collectif 667', city: 'Lille', logoUrl: getLogo('Collectif 667'), wins: 0, losses: 0, roster: [] },
  { id: 't_meute', name: 'La Meute', city: 'Marseille', logoUrl: getLogo('La Meute'), wins: 0, losses: 0, roster: [] },
  
  { id: 't_kingdom', name: 'Kingdom', city: 'Nantes', logoUrl: getLogo('Kingdom'), wins: 0, losses: 0, roster: [] },
  { id: 't_cobra', name: 'Cobra', city: 'Strasbourg', logoUrl: getLogo('Cobra'), wins: 0, losses: 0, roster: [] }, 
  { id: 't_spartiate', name: 'Les Spartiates', city: 'Nice', logoUrl: getLogo('Les Spartiates'), wins: 0, losses: 0, roster: [] },
  { id: 't_visversa', name: 'Vis Versa', city: 'Rennes', logoUrl: getLogo('Vis Versa'), wins: 0, losses: 0, roster: [] },
  { id: 't_nolimit', name: 'No Limit', city: 'Toulouse', logoUrl: getLogo('No Limit'), wins: 0, losses: 0, roster: [] },

  { id: 't_froid', name: 'Froid dans le dos', city: 'Alaska', logoUrl: getLogo('Froid'), wins: 0, losses: 0, roster: [] },
  { id: 't_hoops', name: 'Hoops', city: 'Paris', logoUrl: getLogo('Hoops'), wins: 0, losses: 0, roster: [] },
  { id: 't_outsider', name: 'Outsider', city: 'Montpellier', logoUrl: getLogo('Outsider'), wins: 0, losses: 0, roster: [] },
  { id: 't_badboy', name: 'Detroit Bad Boy', city: 'Detroit', logoUrl: getLogo('Bad Boy'), wins: 0, losses: 0, roster: [] },
  { id: 't_aquitour', name: 'A qui le tour', city: 'Tours', logoUrl: getLogo('A qui le tour'), wins: 0, losses: 0, roster: [] },

  { id: 't_challengers', name: 'Les Challengers', city: 'Reims', logoUrl: getLogo('Challengers'), wins: 0, losses: 0, roster: [] }, 
  { id: 't_ttb', name: 'TTB', city: 'Venice Beach', logoUrl: getLogo('TTB'), wins: 0, losses: 0, roster: [] },
  { id: 't_bisous', name: 'Bisous Bye', city: 'Cannes', logoUrl: getLogo('Bisous Bye'), wins: 0, losses: 0, roster: [] },
  { id: 't_warriors', name: 'Warriors', city: 'San Francisco', logoUrl: getLogo('Warriors'), wins: 0, losses: 0, roster: [] },
  { id: 't_mercenaires', name: 'Les Mercenaires', city: 'Grenoble', logoUrl: getLogo('Les Mercenaires'), wins: 0, losses: 0, roster: [] },

  // --- DYNAMIC PLACEHOLDERS ---
  { id: 't_win_m1', name: 'Vainqueur Match 1', city: 'TBD', logoUrl: getLogo('W1'), wins: 0, losses: 0, roster: [] },
  { id: 't_win_m2', name: 'Vainqueur Match 2', city: 'TBD', logoUrl: getLogo('W2'), wins: 0, losses: 0, roster: [] },
  { id: 't_win_m3', name: 'Vainqueur Match 3', city: 'TBD', logoUrl: getLogo('W3'), wins: 0, losses: 0, roster: [] },

  { id: 't_semi_jaune', name: 'Qualifié Jour 1', city: 'Jaune', logoUrl: getLogo('J1'), wins: 0, losses: 0, roster: [] },
  { id: 't_semi_bleu', name: 'Qualifié Jour 2', city: 'Bleu', logoUrl: getLogo('J2'), wins: 0, losses: 0, roster: [] },
  { id: 't_semi_vert', name: 'Qualifié Jour 3', city: 'Vert', logoUrl: getLogo('J3'), wins: 0, losses: 0, roster: [] },
  { id: 't_semi_orange', name: 'Qualifié Jour 4', city: 'Orange', logoUrl: getLogo('J4'), wins: 0, losses: 0, roster: [] },
  
  { id: 't_final_1', name: 'Vainqueur Demi 1', city: 'Finaliste', logoUrl: getLogo('F1'), wins: 0, losses: 0, roster: [] },
  { id: 't_final_2', name: 'Vainqueur Demi 2', city: 'Finaliste', logoUrl: getLogo('F2'), wins: 0, losses: 0, roster: [] },
];

const findTeam = (id: string) => TEAMS.find(t => t.id === id) || TEAMS[0];

// --- SCHEDULE DATA ---
const EMPTY_MATCH_BASE = {
    scoreA: 0, scoreB: 0, quarter: 1, timeLeft: '10:00', isLive: false, events: [], activePlayersA: [], activePlayersB: []
};

export const INITIAL_SCHEDULE_DATA = [
    // --- SAMEDI 10/01 ---
    {
        id: 'm_10_01',
        start_time: '2026-01-10T15:00:00',
        teamA: findTeam('t_brigade'),
        teamB: findTeam('t_genz'),
        status: 'scheduled'
    },
    {
        id: 'm_10_02',
        start_time: '2026-01-10T16:00:00',
        teamA: findTeam('t_akatsuki'),
        teamB: findTeam('t_667'),
        status: 'scheduled'
    },
    {
        id: 'm_10_03',
        start_time: '2026-01-10T17:00:00',
        teamA: findTeam('t_win_m1'),
        teamB: findTeam('t_meute'),
        status: 'scheduled'
    },
    {
        id: 'm_10_04',
        start_time: '2026-01-10T18:30:00',
        teamA: findTeam('t_win_m2'),
        teamB: findTeam('t_win_m3'),
        status: 'scheduled'
    },

    // --- DIMANCHE 11/01 ---
    {
        id: 'm_11_01',
        start_time: '2026-01-11T15:00:00',
        teamA: findTeam('t_kingdom'),
        teamB: findTeam('t_cobra'),
        status: 'scheduled'
    },
    {
        id: 'm_11_02',
        start_time: '2026-01-11T16:00:00',
        teamA: findTeam('t_spartiate'),
        teamB: findTeam('t_visversa'),
        status: 'scheduled'
    },
    {
        id: 'm_11_03',
        start_time: '2026-01-11T17:00:00',
        teamA: findTeam('t_win_m1'), 
        teamB: findTeam('t_nolimit'),
        status: 'scheduled'
    },
    {
        id: 'm_11_04',
        start_time: '2026-01-11T18:30:00',
        teamA: findTeam('t_win_m2'), 
        teamB: findTeam('t_win_m3'), 
        status: 'scheduled'
    },

    // --- SAMEDI 17/01 ---
    {
        id: 'm_17_01',
        start_time: '2026-01-17T15:00:00',
        teamA: findTeam('t_froid'),
        teamB: findTeam('t_hoops'),
        status: 'scheduled'
    },
    {
        id: 'm_17_02',
        start_time: '2026-01-17T16:00:00',
        teamA: findTeam('t_outsider'),
        teamB: findTeam('t_badboy'),
        status: 'scheduled'
    },
    {
        id: 'm_17_03',
        start_time: '2026-01-17T17:00:00',
        teamA: findTeam('t_aquitour'),
        teamB: findTeam('t_win_m1'),
        status: 'scheduled'
    },
    {
        id: 'm_17_04',
        start_time: '2026-01-17T18:30:00',
        teamA: findTeam('t_win_m2'),
        teamB: findTeam('t_win_m3'),
        status: 'scheduled'
    },

    // --- DIMANCHE 18/01 ---
    {
        id: 'm_18_01',
        start_time: '2026-01-18T15:00:00',
        teamA: findTeam('t_challengers'),
        teamB: findTeam('t_ttb'),
        status: 'scheduled'
    },
    {
        id: 'm_18_02',
        start_time: '2026-01-18T16:00:00',
        teamA: findTeam('t_bisous'),
        teamB: findTeam('t_warriors'),
        status: 'scheduled'
    },
    {
        id: 'm_18_03',
        start_time: '2026-01-18T17:00:00',
        teamA: findTeam('t_mercenaires'),
        teamB: findTeam('t_win_m1'),
        status: 'scheduled'
    },
    {
        id: 'm_18_04',
        start_time: '2026-01-18T18:30:00',
        teamA: findTeam('t_win_m2'),
        teamB: findTeam('t_win_m3'),
        status: 'scheduled'
    },

    // --- FINAL DAY 25/01 ---
    {
        id: 'm_25_01',
        start_time: '2026-01-25T16:00:00',
        teamA: findTeam('t_semi_jaune'),
        teamB: findTeam('t_semi_bleu'),
        status: 'scheduled',
        round: 'Semi'
    },
    {
        id: 'm_25_02',
        start_time: '2026-01-25T17:00:00',
        teamA: findTeam('t_semi_vert'),
        teamB: findTeam('t_semi_orange'),
        status: 'scheduled',
        round: 'Semi'
    },
    {
        id: 'm_25_03',
        start_time: '2026-01-25T19:00:00',
        teamA: findTeam('t_final_1'),
        teamB: findTeam('t_final_2'),
        status: 'scheduled',
        round: 'Final'
    }
];

// LIVE MATCH CONFIGURATION
export const LIVE_MATCH: Match = {
  ...EMPTY_MATCH_BASE,
  id: 'm_live_01',
  teamA: TEAMS[0], 
  teamB: TEAMS[1], 
  scoreA: 0,
  scoreB: 0,
  isLive: true,
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
};

export const HIGHLIGHTS_DATA: HighlightVideo[] = [];

// BRACKET STRUCTURE: ONLY FINAL DAY (2 SEMIS, 1 FINAL)
export const BRACKET_DATA: BracketMatch[] = [
    { id: 'bs1', round: 'Semi', teamA: findTeam('t_semi_jaune'), teamB: findTeam('t_semi_bleu'), scoreA: 0, scoreB: 0 }, 
    { id: 'bs2', round: 'Semi', teamA: findTeam('t_semi_vert'), teamB: findTeam('t_semi_orange'), scoreA: 0, scoreB: 0 },
    { id: 'bf1', round: 'Final', teamA: findTeam('t_final_1'), teamB: findTeam('t_final_2'), scoreA: 0, scoreB: 0 },
];