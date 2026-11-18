import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecorder} from '../public/recorder.js';
function setup({permission,format='audio/webm;codecs=opus',upload=async()=>{}}={}){
 const states=[],uploads=[],scheduled=new Map(),recorders=[];let stopped=0,id=0;
 const stream={getTracks:()=>[{stop(){stopped++;}}]};
 class Recorder{
  static isTypeSupported(m){return m===format;}
  constructor(stream,options){this.mimeType=options.mimeType;this.state='inactive';recorders.push(this);}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable({data:new Blob(['audio'])});this.completion=this.onstop();}
 }
 const host={isSecureContext:true,MediaRecorder:Recorder,navigator:{mediaDevices:{getUserMedia:permission||(async()=>stream)}},setTimeout(fn){scheduled.set(++id,fn);return id;},clearTimeout(id){scheduled.delete(id);}};
 const recorder=createRecorder({host,onState:s=>states.push(s),onAudio:async(blob,signal)=>{uploads.push({blob,signal});return upload(blob,signal);}});
 return {recorder,states,uploads,scheduled,recorders,stream,get stopped(){return stopped;}};
}
test('records compatible formats, uploads once after stop and releases microphone',async()=>{
 for(const format of ['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus']){
  const x=setup({format});await x.recorder.start();assert.equal(x.states.at(-1).state,'recording');assert.equal(x.uploads.length,0);x.recorder.stop();await x.recorders[0].completion;
  assert.equal(x.uploads.length,1);assert.equal(x.uploads[0].blob.type,format);assert.equal(x.states.at(-1).state,'idle');assert.equal(x.stopped,1);assert.equal(x.scheduled.size,0);
 }
});
test('cancel during pending permission releases late stream without uploading',async()=>{
 let grant;const x=setup({permission:()=>new Promise(resolve=>{grant=resolve;})});const starting=x.recorder.start();x.recorder.cancel();grant(x.stream);await starting;assert.equal(x.stopped,1);assert.equal(x.uploads.length,0);assert.equal(x.recorder.active,false);
});
test('cancel recording discards audio; cancellation aborts in-flight transcription',async()=>{
 const x=setup();await x.recorder.start();x.recorder.cancel();assert.equal(x.uploads.length,0);
 let resolve;const y=setup({upload:()=>new Promise(r=>{resolve=r;})});await y.recorder.start();y.recorder.stop();assert.equal(y.states.at(-1).state,'transcribing');y.recorder.cancel();assert.equal(y.uploads[0].signal.aborted,true);resolve();await y.recorders[0].completion;assert.equal(y.states.at(-1).message,'Gravação cancelada. Seu texto foi preservado.');
});
test('denied permission and provider errors recover for another attempt',async()=>{
 const denied=setup({permission:async()=>{throw Object.assign(Error('denied'),{name:'NotAllowedError'});}});await denied.recorder.start();assert.match(denied.states.at(-1).message,/bloqueado/);assert.equal(denied.recorder.active,false);
 const x=setup({upload:async()=>{throw Error('Saldo insuficiente');}});await x.recorder.start();x.recorder.stop();await x.recorders[0].completion;assert.match(x.states.at(-1).message,/Saldo/);await x.recorder.start();assert.equal(x.recorders.length,2);x.recorder.cancel();
});
test('permission timeout and unsupported format do not leave live tracks',async()=>{
 let grant;const x=setup({permission:()=>new Promise(r=>{grant=r;})});const p=x.recorder.start();[...x.scheduled.values()][0]();grant(x.stream);await p;assert.equal(x.stopped,1);assert.equal(x.recorder.active,false);
 const y=setup({format:'unsupported'});await y.recorder.start();assert.equal(y.stopped,1);assert.equal(y.states.at(-1).state,'error');
});
