const fs = require('node:fs');
const path = require('node:path');

const distPath = path.join(__dirname, '..', 'dist', 'cli.js');

if (!fs.existsSync(distPath)) {
  console.warn('[HisDeck] CLI build output is missing.');
  console.warn('[HisDeck] Run "npm run build" or reinstall the package.');
}
