import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const paths=['dev.mjs',...['public','lib','api','scripts'].flatMap(dir=>readdirSync(dir).filter(name=>/\.(?:js|mjs)$/.test(name)).map(name=>dir+'/'+name))];
for(const path of paths){const result=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
console.log(`Sintaxe verificada em ${paths.length} arquivos.`);
