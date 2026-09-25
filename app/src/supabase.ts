import { createClient } from '@supabase/supabase-js';
import type { GameContent } from '../../shared/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadGameAsset(file: File, bucket: 'game-assets' | 'game-documents' = 'game-assets'): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading asset:', error);
    return null;
  }

  return data.path;
}

export async function fetchGameContent(gameId: string): Promise<GameContent[]> {
  const { data, error } = await supabase
    .from('game_content')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching game content:', error);
    return [];
  }
  return data as GameContent[];
}
