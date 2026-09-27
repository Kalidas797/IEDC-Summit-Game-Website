import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDuplicates() {
  console.log("Checking for duplicate settings rows...");
  
  const { data, error } = await supabase
    .from('game_content')
    .select('id, game_id, content_type, created_at')
    .like('content_type', '%-settings')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching data:", error);
    return;
  }

  const seen = new Set();
  const toDelete = [];

  for (const row of data) {
    const key = `${row.game_id}_${row.content_type}`;
    if (seen.has(key)) {
      console.log(`Duplicate found: ${row.id} (${row.content_type}) - Created: ${row.created_at}`);
      toDelete.push(row.id);
    } else {
      console.log(`Keeping most recent: ${row.id} (${row.content_type}) - Created: ${row.created_at}`);
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} duplicate rows...`);
    const { error: delError } = await supabase
      .from('game_content')
      .delete()
      .in('id', toDelete);
    
    if (delError) {
      console.error("Error deleting rows:", delError);
    } else {
      console.log("Successfully deleted duplicate rows.");
    }
  } else {
    console.log("No duplicate settings rows found.");
  }
}

fixDuplicates();
