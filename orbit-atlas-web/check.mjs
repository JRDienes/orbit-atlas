import { transformSync } from '@babel/core';
import fs from 'fs';
const files = process.argv.slice(2);
let fail = 0;
for (const f of files) {
  try {
    transformSync(fs.readFileSync(f, 'utf8'), { filename: f, presets: [['babel-preset-react-app', { runtime: 'automatic' }]], babelrc: false, configFile: false });
    console.log('OK  ', f);
  } catch (e) { fail = 1; console.log('FAIL', f, e.message.split('\n')[0]); }
}
process.exit(fail);
