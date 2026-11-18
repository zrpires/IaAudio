import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createVoiceCapture} from '../public/voice.js';
import {createRecorder} from '../public/recorder.js';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace("import {initWorkspace} from './workspace-ui.js';",'').replace("import {createVoiceCapture} from './voice.js';",'').replace("import {createRecorder} from './recorder.js';",'').replace("import {createLocalTranscriber} from './local-transcriber.js';",'');
const markup=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const interfaceIds=new Set([...markup.matchAll(/id="([^"]+)"/g)].map(match=>'#'+match[1]));
function setup({voice=true,chat,recording=false}={}){
 const nodes=new Map();
 function node(){return {value:'',textContent:'',checked:false,disabled:false,children:[],events:{},classList:{add(){},remove(){}},setAttribute(){},focus(){},append(n){this.children.push(n);},replaceChildren(){this.children=[];},addEventListener(k,v){this.events[k]=v;}};}
 const get=id=>{assert.ok(interfaceIds.has(id),'Controle ausente no HTML: '+id);if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 if(recording)get('#voice-engine').value='local';
 let recognition;
 class Recognition{constructor(){recognition=this;}start(){this.onstart();}stop(){this.onend();}abort(){this.onend?.();}}
 const synth={cancel(){},getVoices(){return [{lang:'pt-BR'}];},speak(u){synth.last=u;}};
 class Recorder{static isTypeSupported(m){return m==='audio/mp4';}constructor(){this.state='inactive';this.mimeType='audio/mp4';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['audio'])});this.onstop();}}
 const window={...(recording?{MediaRecorder:Recorder,navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}}}:{}),setTimeout:()=>0,clearTimeout(){},isSecureContext:true,addEventListener(){},speechSynthesis:synth,...(voice?{SpeechRecognition:Recognition}:{})};
 const context=vm.createContext({initWorkspace:()=>{},createRecorder:options=>createRecorder({...options,host:window}),createLocalTranscriber:()=>{let ready=false;return {supported:recording,get ready(){return ready;},prepare:async()=>{ready=true;},transcribe:async()=> 'Java por 30 minutos',cancel(){}};},createVoiceCapture:options=>createVoiceCapture({...options,host:window}),window,document:{querySelector:get,createElement:node},speechSynthesis:synth,SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},AbortController,AbortSignal,setTimeout:()=>0,clearTimeout(){},fetch:async(path,options)=>path==='/api/health'?{ok:true,json:async()=>({mode:'local',aiReady:true,transcriptionReady:recording})}:chat?chat(path,options):{ok:true,json:async()=>({reply:'Seu plano',mode:'local'})}});
 vm.runInContext(code,context);
 return {get,window,synth,get recognition(){return recognition;},submit:()=>get('#chat-form').events.submit({preventDefault(){}})};
}
test('text flow works without speech recognition and supports replay',async()=>{
 const app=setup({voice:false});assert.equal(app.get('#mic').disabled,true);
 app.get('#message').value='Java por 30 minutos';await app.submit();
 assert.equal(app.get('#messages').children.at(-1).textContent,'Seu plano');
 assert.equal(app.synth.last,undefined);app.get('#replay').onclick();assert.equal(app.synth.last.text,'Seu plano');
});
test('transcription preserves draft and microphone error survives onend',()=>{
 const app=setup();app.get('#message').value='Quero estudar';app.get('#mic').onclick();
 const result=[{transcript:'Java por 30 minutos'}];result.isFinal=true;app.recognition.onresult({results:[result]});
 assert.equal(app.get('#message').value,'Quero estudar Java por 30 minutos');
 app.recognition.onerror({error:'not-allowed'});app.recognition.onend();
 assert.match(app.get('#voice-status').textContent,/bloqueado/);
});
test('clearing in flight prevents stale replies and restores send button',async()=>{
 let resolve;const app=setup({chat:()=>new Promise(r=>{resolve=r;})});
 app.get('#message').value='Java';const request=app.submit();app.get('#clear').onclick();
 resolve({ok:true,json:async()=>({reply:'stale',mode:'local'})});await request;
 assert.equal(app.get('#messages').children.length,0);assert.equal(app.get('#send').disabled,false);
});
test('failed request preserves a new draft',async()=>{
 let resolve;const app=setup({chat:()=>new Promise(r=>{resolve=r;})});
 app.get('#message').value='Anterior';const request=app.submit();app.get('#message').value='Novo rascunho';
 resolve({ok:false,json:async()=>({error:'Falha de rede'})});await request;
 assert.equal(app.get('#message').value,'Novo rascunho');assert.equal(app.get('#send').disabled,false);
});

test('free device recording transcribes without uploading audio or asking for a password',async()=>{
 const calls=[];const app=setup({voice:false,recording:true,chat:async(path,options)=>{calls.push({path,data:JSON.parse(options.body)});return {ok:true,json:async()=>({reply:'Seu plano',mode:'local'})};}});
 await app.get('#prepare-local').onclick();app.get('#mic').onclick();await new Promise(r=>setImmediate(r));
 assert.equal(app.get('#mic').textContent,'Finalizar gravação');app.get('#mic').onclick();await new Promise(r=>setImmediate(r));
 assert.equal(app.get('#message').value,'Java por 30 minutos');assert.equal(calls.length,0);
 await app.submit();assert.equal(calls.length,1);assert.equal(calls[0].path,'/api/chat');assert.equal(calls[0].data.message,'Java por 30 minutos');
});
test('dictation can target meeting notes without sending them to the study chat',()=>{
 const app=setup();app.get('#voice-target').value='notes';app.get('#meeting-notes').value='Contexto da reunião:';app.get('#message').value='Rascunho do estudo';app.get('#mic').onclick();const result=[{transcript:'validar o piloto'}];result.isFinal=true;app.recognition.onresult({results:[result]});assert.equal(app.get('#meeting-notes').value,'Contexto da reunião: validar o piloto');assert.equal(app.get('#message').value,'Rascunho do estudo');
});
