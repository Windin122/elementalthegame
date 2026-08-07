export type GamePhase = 'lobby' | 'reading' | 'guessing' | 'photo' | 'answering' | 'results' | 'round_end' | 'game_over';

export type RoundType = 'standard' | 'fish' | 'paparazzi';

export interface PaparazziAssignment {
  targetId: string;
  photographerId: string;
  role: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string; // base64
  score: number;
  hats: number;
  isConnected: boolean;
  currentGuess?: string;
  currentVote?: string;
  usedHatThisRound: boolean;
  roleTarget?: string;
  roleDescription?: string;
  uploadedPhoto?: string;
}

export interface Question {
  text: string;
  targetPlayerId?: string;
}

export interface Round {
  name: string;
  type: RoundType;
  questions: Question[];
  bgImage?: string;
}

export interface GameState {
  code: string;
  status: 'lobby' | 'playing';
  round: number; // 0-indexed
  questionIndex: number;
  phase: GamePhase;
  phaseEndTime: number; // timestamp
  players: Record<string, Player>;
  screenConnected: boolean;
  version?: number;
  listeners?: any[];
  signals?: any[];
  config: {
    rounds: Round[];
    timers: {
      reading: number;
      answering: number;
      guessing: number;
      photo: number;
      results: number;
    };
    paparazziAssignments: PaparazziAssignment[];
    winnerScrollText: string;
    birthdayBoyId: string;
  };
}
