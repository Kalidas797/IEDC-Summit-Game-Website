const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('games').insert({
    slug: 'rock-paper-scissors',
    name: 'Rock Paper Scissors',
    description: 'Choose your move and beat the computer!',
    enabled: true,
    display_order: 10
  });
  console.log('Insert result:', { data, error });
}
run();
