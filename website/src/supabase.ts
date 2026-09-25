import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Basic player generation for demo purposes
export async function createAnonymousPlayer(nickname: string) {
  const { data, error } = await supabase
    .from('players')
    .insert([{ nickname }])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating player:', error);
    return null;
  }
  return data;
}

export async function submitScore(playerId: string, gameId: string, score: number, timeMs: number) {
  // In a real scenario we'd query the DB for the UUID of the game slug.
  // For now we'll just insert the data.
  const { error } = await supabase
    .from('scores')
    .insert([{ 
      player_id: playerId, 
      game_id: gameId, // Assuming we fetched the actual UUID for this game 
      score, 
      time_ms: timeMs 
    }]);

  if (error) {
    console.error('Error submitting score:', error);
  }
}
