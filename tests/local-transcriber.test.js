import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalTranscriber,decodeAudio} from '../public/local-transcriber.js';
function setup({silent=false,automatic=true}={}){
 const workers=[],scheduled=new Map();let next=0,contextRate;
 class Context{constructor(channels,length,rate){contextRate=rate;}async decodeAudioData(){return {length:4,duration:4/16000,numberOfChannels:2,getChannelData:()=>new Float32Array(silent?[0,0,0,0]:[.2,.4,.6,.8])};}}
 class Worker{constructor(url,options){this.url=url;this.options=options;this.calls=[];workers.push(this);}postMessage(data,transfer){this.calls.push({data,transfer});if(automatic)queueMicrotask(()=>this.onmessage({data:{id:data.id,type:data.type==='load'?'ready':'result',text:'Estudar Java por 30 minutos'}}));}terminate(){this.terminated=true;}}
 const host={Worker,WebAssembly:{},OfflineAudioContext:Context,setTimeout(fn){scheduled.set(++next,fn);return next;},clearTimeout(id){scheduled.delete(id);}};
 const progress=[];const local=createLocalTranscriber({host,onProgress:x=>progress.push(x)});
 return {host,local,workers,scheduled,progress,get contextRate(){return contextRate;}};
}
test('decodes mono PCM at 16kHz and rejects silence',async()=>{
 const x=setup(),pcm=await decodeAudio(new Blob(['audio']),x.host);assert.equal(x.contextRate,16000);assert.equal(pcm.length,4);assert.ok(Math.abs(pcm[0]-.2)<1e-6);
 await assert.rejects(decodeAudio(new Blob(['silent']),setup({silent:true}).host),/silenciosa/);
});
test('loads model only once and transfers PCM to a local worker',async()=>{
 const x=setup();assert.equal(x.workers.length,0);await x.local.prepare();await x.local.prepare();assert.equal(x.workers.length,1);assert.equal(x.workers[0].url,'/local-worker.js');assert.equal(x.local.ready,true);
 assert.equal(await x.local.transcribe(new Blob(['audio'])),'Estudar Java por 30 minutos');assert.equal(x.workers[0].calls.length,2);assert.ok(x.workers[0].calls[1].data.audio instanceof Float32Array);assert.equal(x.workers[0].calls[1].transfer.length,1);assert.equal(x.scheduled.size,0);
});
test('cancel aborts downloads/inference and allows a fresh worker',async()=>{
 const x=setup({automatic:false}),controller=new AbortController();const pending=x.local.prepare(controller.signal);controller.abort();await assert.rejects(pending,/cancelado/);assert.equal(x.workers[0].terminated,true);assert.equal(x.local.ready,false);assert.equal(x.scheduled.size,0);
 const retry=x.local.prepare();const worker=x.workers[1];worker.onmessage({data:{id:worker.calls[0].data.id,type:'ready'}});await retry;assert.equal(x.local.ready,true);
});
test('worker errors and timeout recover with an actionable message',async()=>{
 const x=setup({automatic:false});const p=x.local.prepare();x.workers[0].onerror();await assert.rejects(p,/modelo gratuito/);assert.equal(x.local.ready,false);
 const y=setup({automatic:false});const timeout=y.local.prepare();[...y.scheduled.values()][0]();await assert.rejects(timeout,/demorou/);assert.equal(y.workers[0].terminated,true);
});
test('reports download progress without turning it into a transcript',async()=>{
 const x=setup({automatic:false});const p=x.local.prepare();const worker=x.workers[0],id=worker.calls[0].data.id;
 worker.onmessage({data:{id,type:'progress',progress:50}});assert.equal(x.progress[0].progress,50);assert.equal(x.local.ready,false);worker.onmessage({data:{id,type:'ready'}});await p;
});
test('unsupported device falls back to text without attempting downloads',async()=>{
 const local=createLocalTranscriber({host:{}});assert.equal(local.supported,false);await assert.rejects(local.prepare(),/indisponível/);
});
