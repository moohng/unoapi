const fs = require('fs/promises');
const path = require('path');

const src = path.join(__dirname, '../src/config/tpl.ts');
const dest = path.join(__dirname, '../dist/config/tpl.ts');

fs.copyFile(src, dest);
