import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('real server serves UI, assets and study API',async()=>{
 const child=spawn(process.execPath,['dev.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'3197',OPENAI_API_KEY:'',APP_PASSWORD:''},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('Server exited before startup');}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timeout')),5000);timer.unref();})]);
  for(const path of ['/','/app.js','/style.css'])assert.equal((await fetch('http://127.0.0.1:3197'+path)).status,200);
  const health=await (await fetch('http://127.0.0.1:3197/api/health')).json();assert.equal(health.mode,'local');
  const reply=await (await fetch('http://127.0.0.1:3197/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'30 minutos',history:[{role:'user',content:'Quero estudar Java'}]})})).json();
  assert.match(reply.reply,/Tempo total: 30 minutos/);assert.match(reply.reply,/Java/);
  assert.equal((await fetch('http://127.0.0.1:3197/.env')).status,404);
 }finally{child.kill();await once(child,'exit');}
});
