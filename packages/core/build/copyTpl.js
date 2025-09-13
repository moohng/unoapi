const fs = require('fs/promises');
const path = require('path');

async function run() {
  const tpl = await fs.readFile(path.join(__dirname, '../src/config/tpl.ts'), 'utf-8');

  fs.writeFile(path.join(__dirname, '../dist/config/tpl.ts'), tpl, 'utf-8');
}

run();