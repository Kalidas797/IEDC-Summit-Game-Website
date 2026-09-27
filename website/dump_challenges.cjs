const https = require('https');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envLocal.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envLocal.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const url = new URL(`${urlMatch[1]}/rest/v1/game_content?select=id,game_id,content_type,created_at,is_active&content_type=eq.spot-difference-challenge`);

const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'apikey': keyMatch[1],
    'Authorization': `Bearer ${keyMatch[1]}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const rows = JSON.parse(data);
    console.log(rows);
  });
});

req.on('error', e => console.error(e));
req.end();
