import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function enableTimeBasedScoring() {
  const { data: settings, error } = await supabase
    .from('game_content')
    .select('id, data')
    .like('content_type', '%-settings');

  if (error) {
    console.error('Error fetching settings:', error);
    return;
  }

  for (const item of settings) {
    const updatedData = { ...item.data, timeBasedScoringEnabled: true };
    const { error: updateError } = await supabase
      .from('game_content')
      .update({ data: updatedData })
      .eq('id', item.id);
    
    if (updateError) {
      console.error(`Error updating setting ${item.id}:`, updateError);
    } else {
      console.log(`Updated setting ${item.id} to enable time-based scoring.`);
    }
  }
}

enableTimeBasedScoring();
