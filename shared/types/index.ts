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
