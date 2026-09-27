const https = require('https');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envLocal.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envLocal.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const url = new URL(`${urlMatch[1]}/rest/v1/game_content?select=id,game_id,content_type,created_at&content_type=like.*-settings&order=created_at.desc`);

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
    const seen = new Set();
    const toDelete = [];
    
    for (const row of rows) {
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
      const deleteUrl = new URL(`${urlMatch[1]}/rest/v1/game_content?id=in.(${toDelete.join(',')})`);
      const delOptions = {
        hostname: deleteUrl.hostname,
        path: deleteUrl.pathname + deleteUrl.search,
        method: 'DELETE',
        headers: {
          'apikey': keyMatch[1],
          'Authorization': `Bearer ${keyMatch[1]}`,
          'Content-Type': 'application/json'
        }
      };
      
      const delReq = https.request(delOptions, (delRes) => {
        console.log(`Delete status: ${delRes.statusCode}`);
      });
      delReq.end();
    } else {
      console.log("No duplicate settings rows found.");
    }
  });
});

req.on('error', e => console.error(e));
req.end();
