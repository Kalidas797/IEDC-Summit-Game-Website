const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'website/.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data } = await supabase.from('games').select('id').eq('slug', 'spot-difference').single();
  const gameId = data.id;
  console.log("Game ID:", gameId);

  const { data: settingsData } = await supabase
        .from('game_content').select('data')
        .eq('game_id', gameId).eq('content_type', 'spot-difference-settings').single();
  console.log("Settings:", settingsData?.data);

  const { data: contentData } = await supabase
        .from('game_content').select('id, title, is_active, data')
        .eq('game_id', gameId).eq('is_active', true)
        .eq('content_type', 'spot-difference-challenge');
  console.log("Active challenges:", contentData?.length);
  if (contentData) {
      console.log(contentData.map(c => ({
          id: c.id,
          title: c.title,
          regions: c.data?.regions?.length,
          timeLimit: c.data?.timeLimit
      })));
  }
}
test();
