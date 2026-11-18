import {createRecorder,blobToBase64} from './recorder.js';
import {createVoiceCapture} from './voice.js';
const $=s=>document.querySelector(s);
const money=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function notify(text){$('#notice').textContent=text;$('#notice').classList.remove('hidden');clearTimeout(window.noticeTimer);window.noticeTimer=setTimeout(()=>$('#notice').classList.add('hidden'),8000);}
const history=[];let health=null,pending=null,conversationVersion=0;
function busy(value){$('#send').disabled=value;$('#send').textContent=value?'Respondendo…':'Enviar mensagem ↗';$('#messages').setAttribute('aria-busy',String(value));}
function accessToken(){try{return sessionStorage.getItem('ai-access')||'';}catch{return '';}}
async function api(path,data,signal){
  let r;try{r=await fetch(path,{...(data?{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken()},body:JSON.stringify(data)}:{}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(55000)]):AbortSignal.timeout(55000)});}catch{throw Error('Não foi possível conectar. Confira sua conexão e tente novamente.');}
  let value;try{value=await r.json();}catch{throw Error('Resposta inválida do servidor. Verifique o deploy.');}
  if(!r.ok){if(r.status===401){$('#access').classList.remove('hidden');$('#password').focus();}throw Error(value.error||'Falha na solicitação');}return value;
}
function bubble(text,cls=''){const n=el('div',text,'bubble '+cls);$('#messages').append(n);$('#messages').scrollTop=$('#messages').scrollHeight;}
$('#access-form').onsubmit=event=>{event.preventDefault();try{sessionStorage.setItem('ai-access',$('#password').value);$('#password').value='';notify('Senha salva nesta aba. Use o microfone ou envie uma mensagem para verificar o acesso.');}catch{notify('O navegador bloqueou o armazenamento da senha. Habilite o armazenamento desta página.');}};
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
    $('#mode').textContent=result.mode==='local'?'Assistente local · sem IA generativa':'IA conectada';
    window.speakReply(result.reply);
  }catch(e){
    if(version!==conversationVersion||controller.signal.aborted)return;
    bubble(e.message);if(!$('#message').value.trim())$('#message').value=message;
    else notify('Falha no envio. Sua nova mensagem foi preservada; a anterior está na conversa.');
  }finally{if(pending===controller){pending=null;busy(false);}}
});
async function loadHealth(){try{health=await api('/api/health');$('#mode').textContent=health.mode==='local'?'Assistente local · sem IA generativa':health.aiReady?'IA configurada':'IA aguardando configuração';refreshVoice();if(health.authRequired)$('#access').classList.remove('hidden');if(health.mode!=='local'&&!health.aiReady)notify('O dono do projeto precisa configurar APP_PASSWORD na Vercel.');}catch(e){$('#mode').textContent='Sem conexão';notify(e.message);}}
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
 const field=$('#message'),combined=(field.value.trim()+' '+text).trim();
 if(combined.length>2000)throw Error('O texto excedeu 2000 caracteres. Envie o rascunho antes de gravar novamente.');
 field.value=combined;field.focus();
}
function serverMode(){return $('#voice-engine').value==='server';}
function recorderUI({state,message,supported}){
 recorderState=state;if(!serverMode())return;
 $('#voice-status').textContent=message;$('#mic').disabled=!supported||state==='stopping';
 $('#mic').textContent=state==='recording'?'Finalizar gravação':state==='starting'||state==='transcribing'?'Cancelar gravação':'Ativar microfone';
 $('#mic').setAttribute('aria-pressed',String(state==='recording'));$('#orb').classList[state==='recording'?'add':'remove']('active');
}
const nativeVoice=createVoiceCapture({
  onState:({state,message,supported})=>{
    voiceState=state;if(serverMode())return;$('#voice-status').textContent=message;
    $('#mic').disabled=!supported||state==='stopping';
    $('#mic').setAttribute('aria-pressed',String(state==='starting'||state==='listening'));
    $('#mic').textContent=state==='starting'?'Cancelar escuta':state==='listening'?'Finalizar escuta':'Ativar microfone';
    $('#orb').classList[state==='listening'?'add':'remove']('active');
  },
  onInterim:text=>{$('#transcript-preview').textContent=text?'Ouvindo: '+text:'';},
  onFinal:text=>{
    if(pending)return;
    const field=$('#message'),combined=(field.value.trim()+' '+text).trim();
    if(combined.length>2000){$('#transcript-preview').textContent='';notify('O texto excedeu 2000 caracteres. Envie seu rascunho antes de continuar a ditar.');return;}
    field.value=combined;field.focus();notify('Transcrição adicionada. Revise o texto e clique em Enviar.');
  }
});
const recorder=createRecorder({onState:recorderUI,onAudio:async(blob,signal)=>{
 const audio=await blobToBase64(blob);if(signal.aborted)return;
 const result=await api('/api/transcribe',{audio,mime:blob.type},signal);
 if(signal.aborted)return;
 if(typeof result.text!=='string'||!result.text.trim())throw Error('Nenhuma fala reconhecida. Grave novamente.');
 appendTranscript(result.text);notify('Transcrição adicionada. Revise antes de enviar.');
}});
const voice={cancel(){nativeVoice.cancel();recorder.cancel();}};
function refreshVoice(){
 if(serverMode())recorderUI({state:'idle',supported:recorder.supported,message:health?.transcriptionReady?'Pronto para gravar e transcrever no servidor.':'Gravação requer TRANSCRIPTION_API_KEY e APP_PASSWORD na Vercel. O reconhecimento do navegador é uma opção alternativa.'});
 else {$('#mic').disabled=!nativeVoice.supported;$('#mic').textContent='Ativar microfone';$('#voice-status').textContent=nativeVoice.supported?'Pronto para ouvir pelo serviço do navegador.':'Reconhecimento nativo indisponível. Selecione gravação compatível.';}
}
$('#cancel-recording').onclick=()=>voice.cancel();
$('#voice-engine').onchange=()=>{voice.cancel();$('#transcript-preview').textContent='';refreshVoice();};
$('#mic').onclick=()=>{
 if(pending){notify('Aguarde a resposta antes de iniciar outra captura.');return;}
 synth?.cancel();
 if(serverMode()){
  if(recorderState==='starting'||recorderState==='transcribing'){recorder.cancel();return;}
  if(recorder.active){recorder.stop();return;}
  if(!health?.transcriptionReady){notify('Configure TRANSCRIPTION_API_KEY e APP_PASSWORD na Vercel e faça redeploy para liberar a gravação.');return;}
  if(!accessToken()){$('#access').classList.remove('hidden');$('#password').focus();notify('Informe a senha de acesso antes de gravar.');return;}
  recorder.start();return;
 }
 if(voiceState==='starting'){nativeVoice.cancel();return;}
 if(nativeVoice.active){nativeVoice.stop();return;}
 nativeVoice.start();
};
$('#stop').onclick=()=>{if(serverMode())recorder.stop();else nativeVoice.stop();synth?.cancel();$('#speech-status').textContent='Áudio interrompido.';};
refreshVoice();
$('#example').onclick=()=>{$('#message').value='Quero estudar arrays em Java por 30 minutos';$('#message').focus();};
window.addEventListener('pagehide',()=>{voice.cancel();synth?.cancel();});
$('#clear').onclick=()=>{conversationVersion++;pending?.abort();pending=null;busy(false);$('#message').value='';$('#speech-status').textContent='';if('speechSynthesis'in window)speechSynthesis.cancel();$('#messages').replaceChildren();history.length=0;lastReply='';$('#replay').disabled=true;voice.cancel();notify('Conversa apagada desta tela.');};
$('#download').onclick=()=>{const blob=new Blob([$('#messages').innerText],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='conversa.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

