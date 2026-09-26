const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('games').update({ name: 'Original or AI?', description: 'Can you spot the original? Choose which image is real.' }).eq('slug', 'ai-or-human');
  console.log('Update result:', { data, error });
}
run();
