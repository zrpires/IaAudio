import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import handler from '../api/transcribe.js';
import health from '../api/health.js';
const saved={...process.env};const originalFetch=global.fetch;
const vars=['OPENAI_API_KEY','TRANSCRIPTION_API_KEY','TRANSCRIPTION_MODEL','APP_PASSWORD'];
function reset(){for(const k of vars)delete process.env[k];global.fetch=originalFetch;}
test.after(()=>{reset();for(const k of vars)if(saved[k]!==undefined)process.env[k]=saved[k];});
async function invoke({data,raw,headers={},method='POST',route=handler}={}){
 const req=Readable.from(raw===undefined?[]:[Buffer.from(raw)]);req.method=method;req.headers={host:'test.example','content-type':'application/json',authorization:'Bearer secret',...headers};if(data!==undefined)req.body=data;
 const res={setHeader(){},end(s){this.data=JSON.parse(s);}};await route(req,res);return {status:res.statusCode,...res.data};
}
const audio={mime:'audio/webm;codecs=opus',audio:Buffer.from('test audio').toString('base64')};
function configured(){reset();process.env.TRANSCRIPTION_API_KEY='private-key';process.env.APP_PASSWORD='secret';}
test('transcription requires configuration and authorization before paid request',async()=>{
 reset();assert.equal((await invoke({data:audio})).status,503);
 process.env.TRANSCRIPTION_API_KEY='private-key';assert.equal((await invoke({data:audio})).status,503);
 process.env.APP_PASSWORD='secret';assert.equal((await invoke({data:audio,headers:{authorization:'Bearer wrong'}})).status,401);
 assert.equal((await invoke({data:audio,headers:{origin:'https://elsewhere.example'}})).status,403);
 assert.equal((await invoke({method:'GET'})).status,405);
});
test('accepts recorded audio and forwards multipart without exposing key',async()=>{
 configured();global.fetch=async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/audio/transcriptions');assert.equal(options.headers.Authorization,'Bearer private-key');
  assert.equal(options.body.get('model'),'gpt-transcribe');assert.equal(options.body.get('file').name,'fala.webm');assert.equal(await options.body.get('file').text(),'test audio');
  return {ok:true,json:async()=>({text:'Quero estudar Java por 30 minutos'})};
 };
 const r=await invoke({raw:JSON.stringify(audio)});assert.equal(r.status,200);assert.match(r.text,/Java/);assert.ok(!JSON.stringify(r).includes('private-key'));
 const h=await invoke({route:health,method:'GET'});assert.equal(h.transcriptionReady,true);assert.equal(h.mode,'local');assert.equal(h.authRequired,true);
});
test('rejects invalid, oversized or unsupported audio',async()=>{
 configured();let calls=0;global.fetch=async()=>{calls++;throw Error('must not call');};
 for(const data of [{...audio,mime:'text/html'},{...audio,audio:''},{...audio,audio:'!!!!'},{...audio,audio:'A'.repeat(2800000)},null])assert.ok((await invoke({data})).status>=400);
 assert.equal((await invoke({raw:'{invalid'})).status,400);
 assert.equal((await invoke({data:audio,headers:{'content-length':'2800001'}})).status,413);
 assert.equal((await invoke({data:audio,headers:{'content-type':'text/plain'}})).status,415);assert.equal(calls,0);
});
test('provider failure and silence produce actionable errors',async()=>{
 configured();
 for(const status of [401,429,500]){global.fetch=async()=>({ok:false,status});assert.equal((await invoke({data:audio})).status,502);}
 global.fetch=async()=>{throw Error('network')};assert.equal((await invoke({data:audio})).status,504);
 global.fetch=async()=>({ok:true,json:async()=>({text:''})});assert.equal((await invoke({data:audio})).status,422);
 global.fetch=async()=>({ok:true,json:async()=>{throw Error('bad json')}});assert.equal((await invoke({data:audio})).status,502);
 global.fetch=async()=>({ok:true,json:async()=>null});assert.equal((await invoke({data:audio})).status,422);
});
