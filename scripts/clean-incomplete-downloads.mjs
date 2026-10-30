import fs from 'node:fs';
import path from 'node:path';
const folder=path.resolve('dist/music');
if(fs.existsSync(folder))for(const file of fs.readdirSync(folder)){if(file.endsWith('.crdownload')){const target=path.resolve(folder,file);if(path.dirname(target)!==folder)throw Error('Invalid output path');fs.unlinkSync(target);}}
