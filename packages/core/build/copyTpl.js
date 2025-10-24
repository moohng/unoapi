import { copyFile } from 'fs/promises';
import { resolve } from 'path';

const src = resolve('build/tpl.ts');

const esm = resolve('dist/esm/tpl.txt');
const cjs = resolve('dist/cjs/tpl.txt');

copyFile(src, esm);
copyFile(src, cjs);
