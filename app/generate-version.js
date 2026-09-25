import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionData = {
  version: Date.now().toString()
};

fs.writeFileSync(
  path.join(__dirname, 'public', 'version.json'),
  JSON.stringify(versionData)
);

console.log('Generated public/version.json with version:', versionData.version);
