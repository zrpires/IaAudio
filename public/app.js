import {initWorkspace} from './workspace-ui.js';
import {createRecorder} from './recorder.js';
import {createLocalTranscriber} from './local-transcriber.js';
import {createVoiceCapture} from './voice.js';
const $=s=>document.querySelector(s);
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function notify(text){$('#notice').textContent=text;$('#notice').classList.remove('hidden');clearTimeout(window.noticeTimer);window.noticeTimer=setTimeout(()=>$('#notice').classList.add('hidden'),8000);}
const history=[];let pending=null,conversationVersion=0;
function busy(value){$('#send').disabled=value;$('#send').textContent=value?'Respondendo…':'Enviar mensagem ↗';$('#messages').setAttribute('aria-busy',String(value));}
async function api(path,data,signal){
  let r;try{r=await fetch(path,{...(data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(55000)]):AbortSignal.timeout(55000)});}catch{throw Error('Não foi possível conectar. Confira sua conexão e tente novamente.');}
  let value;try{value=await r.json();}catch{throw Error('Resposta inválida do servidor. Verifique o deploy.');}
  if(!r.ok)throw Error(value.error||'Falha na solicitação');return value;
}
function bubble(text,cls=''){const n=el('div',text,'bubble '+cls);$('#messages').append(n);$('#messages').scrollTop=$('#messages').scrollHeight;}
$('#chat-form').addEventListener('submit',async event=>{
  event.preventDefault();if(pending)return;
  const message=$('#message').value.trim();if(!message)return;
  const version=conversationVersion,controller=new AbortController();pending=controller;busy(true);
  voice.cancel();synth?.cancel();bubble(message,'user');$('#message').value='';
  try{
    const result=await api('/api/chat',{message,history:history.slice(-8)},controller.signal);
    if(version!==conversationVersion)return;
    if(typeof result.reply!=='string'||!result.reply.trim())throw Error('Resposta vazia. Tente novamente.');
    bubble(result.reply);history.push({role:'user',content:message},{role:'assistant',content:result.reply});
    if(history.length>8)history.splice(0,history.length-8);
    $('#mode').textContent='Gratuito · workspace local';
    window.speakReply(result.reply);
  }catch(e){
    if(version!==conversationVersion||controller.signal.aborted)return;
    bubble(e.message);if(!$('#message').value.trim())$('#message').value=message;
    else notify('Falha no envio. Sua nova mensagem foi preservada; a anterior está na conversa.');
  }finally{if(pending===controller){pending=null;busy(false);}}
});
async function loadHealth(){try{await api('/api/health');$('#mode').textContent='Gratuito · workspace local';}catch(e){$('#mode').textContent='Sem conexão';notify(e.message);}}
loadHealth();
let lastReply='';
const synth=window.speechSynthesis;
function speak(text){
  if(!synth)return;
  synth.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang='pt-BR';
  utterance.voice=synth.getVoices().find(v=>v.lang.toLowerCase()==='pt-br')||null;
  utterance.onstart=()=>{$('#speech-status').textContent='Lendo resposta…';};
  utterance.onend=()=>{$('#speech-status').textContent='Leitura concluída.';};
  utterance.onerror=e=>{if(!['canceled','interrupted'].includes(e.error))$('#speech-status').textContent='Leitura indisponível. A resposta está no texto.';};
  synth.speak(utterance);
}
window.speakReply=text=>{lastReply=text;$('#replay').disabled=!synth;if($('#speak').checked)speak(text);};
$('#replay').onclick=()=>{voice.cancel();speak(lastReply);};
$('#speak').onchange=()=>{if(!$('#speak').checked&&synth)synth.cancel();};
if(!synth){$('#speak').disabled=true;$('#speech-status').textContent='Leitura indisponível neste navegador. Use as respostas em texto.';}
let voiceState='idle',recorderState='idle';
function appendTranscript(text){
 const notes=$('#voice-target').value==='notes';
 const field=notes?$('#meeting-notes'):$('#message'),limit=notes?16000:2000;
 const combined=(field.value.trim()+' '+text).trim();
 if(combined.length>limit)throw Error(`O destino excedeu ${limit} caracteres. Salve ou envie o conteúdo antes de continuar.`);
 field.value=combined;
 if(field.dispatchEvent)field.dispatchEvent(new Event('input',{bubbles:true}));
 if(!notes)field.focus();
 return notes;
}
function localMode(){return $('#voice-engine').value==='local';}
function recorderUI({state,message,supported}){
 recorderState=state;if(!localMode())return;
 $('#voice-status').textContent=message;$('#mic').disabled=!supported||state==='stopping';
 $('#mic').textContent=state==='recording'?'Finalizar gravação':state==='starting'||state==='transcribing'?'Cancelar gravação':'Ativar microfone';
 $('#mic').setAttribute('aria-pressed',String(state==='recording'));$('#orb').classList[state==='recording'?'add':'remove']('active');
}
const nativeVoice=createVoiceCapture({
  onState:({state,message,supported})=>{
    voiceState=state;if(localMode())return;$('#voice-status').textContent=message;
    $('#mic').disabled=!supported||state==='stopping';
    $('#mic').setAttribute('aria-pressed',String(state==='starting'||state==='listening'));
    $('#mic').textContent=state==='starting'?'Cancelar escuta':state==='listening'?'Finalizar escuta':'Ativar microfone';
    $('#orb').classList[state==='listening'?'add':'remove']('active');
  },
  onInterim:text=>{$('#transcript-preview').textContent=text?'Ouvindo: '+text:'';},
  onFinal:text=>{
    if(pending)return;
    try{const notes=appendTranscript(text);notify(notes?'Transcrição adicionada às anotações. Abra o registro para revisar e salvar.':'Transcrição adicionada. Revise e envie.');}
    catch(error){notify(error.message);}
  }
});
const local=createLocalTranscriber({onProgress:event=>{
 if(!localMode())return;
 const percent=Number.isFinite(event.progress)?' '+Math.round(event.progress)+'%':'';
 $('#model-status').textContent='Baixando/preparando modelo gratuito'+percent+'… Na primeira vez, aguarde o download dos arquivos.';
}});
const recorder=createRecorder({onState:recorderUI,onAudio:async(blob,signal)=>{
 const text=await local.transcribe(blob,signal);if(signal.aborted)return;
 const notes=appendTranscript(text);notify(notes?'Transcrição adicionada às anotações. Abra o registro para revisar e salvar.':'Transcrição local adicionada. Revise antes de enviar.');
}});
const voice={cancel(){nativeVoice.cancel();recorder.cancel();local.cancel();$('#prepare-local').disabled=false;refreshVoice();}};
function refreshVoice(){
 $('#prepare-local').classList[localMode()?'remove':'add']('hidden');
 if(localMode()){
  const supported=recorder.supported&&local.supported;
  recorderUI({state:'idle',supported,message:!supported?'Este dispositivo não oferece os recursos para voz local. Use o texto ou o reconhecimento nativo.':local.ready?'Modelo gratuito pronto. Ative o microfone e grave um trecho curto.':'Clique em Preparar voz gratuita para baixar o modelo no seu dispositivo.'});
  $('#mic').disabled=!supported||!local.ready;
 }else {$('#mic').disabled=!nativeVoice.supported;$('#mic').textContent='Ativar microfone';$('#voice-status').textContent=nativeVoice.supported?'Pronto para ouvir pelo serviço do navegador.':'Reconhecimento nativo indisponível. Selecione voz gratuita no dispositivo.';}
}
$('#prepare-local').onclick=async()=>{
 const button=$('#prepare-local');if(local.loading)return;
 button.disabled=true;$('#model-status').textContent='Preparando modelo gratuito… O primeiro download pode demorar.';
 try{await local.prepare();$('#model-status').textContent='Modelo pronto. O áudio será transcrito neste dispositivo.';}
 catch(e){$('#model-status').textContent=e.message;}
 finally{button.disabled=false;refreshVoice();}
};
$('#cancel-recording').onclick=()=>voice.cancel();
$('#voice-engine').onchange=()=>{voice.cancel();$('#transcript-preview').textContent='';refreshVoice();};
$('#mic').onclick=()=>{
 if(pending){notify('Aguarde a resposta antes de iniciar outra captura.');return;}
 synth?.cancel();
 if(localMode()){
  if(recorderState==='starting'||recorderState==='transcribing'){recorder.cancel();return;}
  if(recorder.active){recorder.stop();return;}
  if(!local.ready){notify('Clique em Preparar voz gratuita e aguarde o download do modelo.');return;}
  recorder.start();return;
 }
 if(voiceState==='starting'){nativeVoice.cancel();return;}
 if(nativeVoice.active){nativeVoice.stop();return;}
 nativeVoice.start();
};
$('#stop').onclick=()=>{if(localMode())recorder.stop();else nativeVoice.stop();synth?.cancel();$('#speech-status').textContent='Áudio interrompido.';};
refreshVoice();
$('#example').onclick=()=>{$('#message').value='Quero estudar arrays em Java por 30 minutos';$('#message').focus();};
window.addEventListener('pagehide',()=>{voice.cancel();synth?.cancel();});
$('#clear').onclick=()=>{conversationVersion++;pending?.abort();pending=null;busy(false);$('#message').value='';$('#speech-status').textContent='';if('speechSynthesis'in window)speechSynthesis.cancel();$('#messages').replaceChildren();history.length=0;lastReply='';$('#replay').disabled=true;voice.cancel();notify('Conversa apagada desta tela.');};
$('#download').onclick=()=>{const blob=new Blob([$('#messages').innerText],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='conversa.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};


initWorkspace({document,host:window,notify});
