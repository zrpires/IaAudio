import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoiceCapture} from '../public/voice.js';
function setup({secure=true,supported=true,throws=false}={}){
 const instances=[],states=[],finals=[],interim=[],scheduled=new Map();let id=0;
 class Recognition{constructor(){instances.push(this);}start(){if(throws)throw Error('blocked');}stop(){this.stopped=true;}abort(){this.aborted=true;this.onend?.();}}
 const host={isSecureContext:secure,...(supported?{SpeechRecognition:Recognition}:{}),setTimeout(fn){scheduled.set(++id,fn);return id;},clearTimeout(id){scheduled.delete(id);}};
 const voice=createVoiceCapture({host,onState:s=>states.push(s),onFinal:s=>finals.push(s),onInterim:s=>interim.push(s)});
 const result=(text,isFinal)=>Object.assign([{transcript:text}],{isFinal});
 return {voice,instances,states,finals,interim,scheduled,result};
}
test('interim preview never becomes submitted text; final results are deduplicated',()=>{
 const x=setup();x.voice.start();const r=x.instances[0];r.onstart();
 r.onresult({resultIndex:0,results:[x.result('quero estudar',false)]});assert.deepEqual(x.finals,[]);assert.equal(x.interim.at(-1),'quero estudar');
 const results=[x.result('Quero estudar Java',true),x.result('por 30 minutos',true)];
 r.onresult({resultIndex:0,results});r.onresult({resultIndex:0,results});
 assert.deepEqual(x.finals,['Quero estudar Java por 30 minutos']);r.onend();assert.match(x.states.at(-1).message,/Transcrição pronta/);
});
test('stop allows final transcription; cancel ignores late results from old sessions',()=>{
 const x=setup();x.voice.start();const old=x.instances[0];x.voice.cancel();x.voice.start();
 old.onresult({results:[x.result('descartar',true)]});old.onend();assert.equal(x.voice.active,true);assert.deepEqual(x.finals,[]);
 const current=x.instances[1];x.voice.stop();assert.equal(current.stopped,true);
 current.onresult({results:[x.result('manter',true)]});current.onend();assert.deepEqual(x.finals,['manter']);assert.equal(x.scheduled.size,0);
});
test('permission, network and missing microphone errors persist and can be retried',()=>{
 for(const error of ['not-allowed','network','audio-capture','no-speech']){
  const x=setup();x.voice.start();const r=x.instances[0];r.onerror({error});r.onend();assert.equal(x.states.at(-1).state,'error');assert.equal(x.voice.active,false);assert.equal(x.scheduled.size,0);x.voice.start();assert.equal(x.instances.length,2);
 }
});
test('startup timeout recovers controls and late onstart is ignored',()=>{
 const x=setup();x.voice.start();const r=x.instances[0];[...x.scheduled.values()][0]();r.onstart();assert.equal(x.voice.active,false);assert.equal(x.states.at(-1).state,'error');assert.equal(x.scheduled.size,0);
});
test('unsupported and insecure contexts remain usable via text',()=>{
 for(const options of [{secure:false},{supported:false}]){const x=setup(options);x.voice.start();assert.equal(x.voice.supported,false);assert.equal(x.instances.length,0);}
});
test('start exception and stop timeout do not lock the session',()=>{
 const x=setup({throws:true});x.voice.start();assert.equal(x.voice.active,false);assert.equal(x.scheduled.size,0);
 const y=setup();y.voice.start();y.voice.stop();[...y.scheduled.values()][0]();assert.equal(y.voice.active,false);assert.equal(y.states.at(-1).state,'error');
});
