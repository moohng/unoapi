import { copyFile } from 'fs/promises';
import { resolve } from 'path';

const src = resolve('src/config/tpl.ts');
const esm = resolve('dist/esm/config/tpl.ts');
const cjs = resolve('dist/cjs/tpl.ts');

copyFile(src, esm);
copyFile(src, cjs);
