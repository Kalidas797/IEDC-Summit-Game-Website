export interface College {
  id: string;
  name: string;
  created_at: string;
}

export interface Player {
  id: string;
  nickname: string;
  college_id: string | null;
  created_at: string;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface GameContent {
  id: string;
  game_id: string;
  title: string;
  description: string | null;
  content_type: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  data: Record<string, any>;
  storage_path: string | null;
  thumbnail_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GameSession {
  id: string;
  player_id: string;
  game_id: string;
  device_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'playing' | 'completed' | 'abandoned';
}

export interface Score {
  id: string;
  player_id: string;
  game_id: string;
  session_id: string | null;
  score: number;
  time_ms: number;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface EventSettings {
  id: string;
  event_name: string;
  attract_mode: boolean;
  featured_game_id: string | null;
  cta_text: string;
  qr_code_url: string;
  updated_at: string;
}

// =============================================
// GAME-SPECIFIC CONTENT DATA SHAPES
// These define what goes inside GameContent.data
// =============================================

/** Remember the Paper — data shape */
export interface MemoryContentData {
  displayDuration: number; // ms to show paper
  questionTime: number;    // ms per question
  questions: MCQuestion[];
}

export interface MCQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // index into options
}

/** AI or Human — data shape */
export interface AIOrHumanContentData {
  contentType: 'image' | 'text';
  correctAnswer: 'AI' | 'HUMAN';
  explanation: string;
}

/** Spot the Difference / What Changed — data shape */
export interface DifferenceContentData {
  originalImagePath: string;   // Supabase storage path
  modifiedImagePath: string;   // Supabase storage path
  timeLimit: number;           // seconds
  regions: DifferenceRegion[];
  // What Changed specific
  memoryTime?: number;         // seconds to study original
}

export interface DifferenceRegion {
  id: string;
  x: number;      // normalized 0-1
  y: number;      // normalized 0-1
  width: number;  // normalized 0-1
  height: number; // normalized 0-1
  label: string;
}

/** Doodle Telephone — data shape */
export interface DoodleContentData {
  prompt: string;
  category: string;
  drawingTime: number;  // seconds
  rounds: number;       // how many draw/guess rounds
}

/** Hidden Words — data shape */
export interface HiddenWordsContentData {
  words: string[];
  gridSize: number;
  timeLimit: number;
  showHints: boolean;
  allowedDirections: string[];
  grid: string[][];
  placements: HiddenWordPlacement[];
}

export interface HiddenWordPlacement {
  word: string;
  startRow: number;
  startCol: number;
  direction: string;
  positions: { row: number, col: number }[];
}

/** Reaction Challenge — data shape (stored in game_content) */
export interface ReactionContentData {
  minWait: number;      // ms minimum wait
  maxWait: number;      // ms maximum wait
  rounds: number;       // number of rounds
  falseStartPenalty: boolean;
  scoring: 'speed' | 'accuracy';
}

/** Tic-Tac-Toe — data shape (stored in game_content) */
export interface TicTacToeContentData {
  mode: 'pvp' | 'pvc';
  difficulty: 'easy' | 'medium' | 'hard';
  defaultMode: 'pvp' | 'pvc';
}

// Game slug union for type safety
export type GameSlug = 
  | 'memory'
  | 'ai-or-human'
  | 'spot-difference'
  | 'what-changed'
  | 'doodle'
  | 'crossword'
  | 'reaction'
  | 'tic-tac-toe';
