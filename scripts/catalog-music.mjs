import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
const folder=path.join(root,'public','music');
const songs=fs.readdirSync(folder,{withFileTypes:true}).filter(f=>f.isFile()&&/\.(mp3|m4a|ogg|wav)$/i.test(f.name)).map(f=>{
  let tags={};
  try { const result=spawnSync('ffprobe',['-v','error','-show_entries','format_tags=title,artist','-of','json',path.join(folder,f.name)],{encoding:'utf8',windowsHide:true,timeout:5000}); if(result.status===0)tags=JSON.parse(result.stdout).format?.tags||{}; } catch {}
  return {id:'local-'+crypto.createHash('sha1').update(f.name).digest('hex').slice(0,16),title:tags.title||tags.TITLE||f.name.replace(/\.(mp3|m4a|ogg|wav)$/i,'').replace(/[-_]/g,' '),artist:tags.artist||tags.ARTIST||'Our local collection',url:'/music/'+encodeURIComponent(f.name),platform:'other',createdBy:'3zab',createdAt:0};
});
fs.writeFileSync(path.join(root,'src','data','localMusic.json'),JSON.stringify(songs,null,2));
console.log('Local music: '+songs.length+' complete tracks');
